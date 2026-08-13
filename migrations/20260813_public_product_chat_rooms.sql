-- Convert product chat from private customer-seller threads to one public room per product.
-- Existing messages are retained and duplicate private conversations are consolidated.

ALTER TABLE public.chat_conversations
  ALTER COLUMN customer_id DROP NOT NULL;

-- Move messages from duplicate private threads into the canonical product room.
WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY product_id, business_id, seller_id
           ORDER BY created_at, id
         ) AS canonical_id
  FROM public.chat_conversations
)
UPDATE public.chat_messages AS m
SET conversation_id = ranked.canonical_id
FROM ranked
WHERE ranked.id = m.conversation_id
  AND ranked.id <> ranked.canonical_id;

-- Remove duplicate conversation records only after their messages are reassigned.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY product_id, business_id, seller_id
           ORDER BY created_at, id
         ) AS row_number
  FROM public.chat_conversations
)
DELETE FROM public.chat_conversations AS c
USING ranked
WHERE ranked.id = c.id
  AND ranked.row_number > 1;

-- The public room is identified only by the product and its owning seller/store.
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_customer_seller_product_key;
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_public_product_key
  ON public.chat_conversations(product_id, business_id, seller_id);

DROP POLICY IF EXISTS "Chat participants and admins can view conversations" ON public.chat_conversations;
CREATE POLICY "Anyone can view public product conversations"
  ON public.chat_conversations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Customers can create their product conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can create public product conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.products AS p
      JOIN public.businesses AS b ON b.id = p.business_id
      WHERE p.id = chat_conversations.product_id
        AND p.business_id = chat_conversations.business_id
        AND b.owner_id = chat_conversations.seller_id
    )
  );

DROP POLICY IF EXISTS "Participants and admins can update conversations" ON public.chat_conversations;
CREATE POLICY "Sellers and admins can update public conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Chat participants and admins can view messages" ON public.chat_messages;
CREATE POLICY "Anyone can view public product messages"
  ON public.chat_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations AS c
      WHERE c.id = chat_messages.conversation_id
    )
  );

DROP POLICY IF EXISTS "Participants can send correctly attributed messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can send public product messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations AS c
      WHERE c.id = chat_messages.conversation_id
    )
    AND sender_role IN ('customer', 'seller', 'admin')
  );

DROP POLICY IF EXISTS "Participants can moderate their chat messages" ON public.chat_messages;
CREATE POLICY "Authors sellers and admins can moderate public messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations AS c
      WHERE c.id = chat_messages.conversation_id AND c.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations AS c
      WHERE c.id = chat_messages.conversation_id AND c.seller_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_or_create_public_product_conversation(
  p_product_id uuid,
  p_business_id uuid
)
RETURNS public.chat_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.chat_conversations;
  v_seller_id uuid;
BEGIN
  SELECT b.owner_id INTO v_seller_id
  FROM public.businesses AS b
  JOIN public.products AS p ON p.business_id = b.id
  WHERE p.id = p_product_id AND b.id = p_business_id;
  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'Product store could not be found'; END IF;

  INSERT INTO public.chat_conversations(product_id, business_id, seller_id, customer_id)
  VALUES (p_product_id, p_business_id, v_seller_id, NULL)
  ON CONFLICT (product_id, business_id, seller_id)
  DO UPDATE SET updated_at = timezone('utc', now())
  RETURNING * INTO v_conversation;
  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_public_product_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_public_product_conversation(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_product_chat_message(
  p_conversation_id uuid,
  p_body text,
  p_reply_to_message_id uuid DEFAULT NULL,
  p_shared_message_id uuid DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.chat_conversations;
  v_message public.chat_messages;
  v_role text;
  v_body text := trim(coalesce(p_body, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required to send a message'; END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 4000 THEN RAISE EXCEPTION 'Message must contain between 1 and 4000 characters'; END IF;
  SELECT * INTO v_conversation FROM public.chat_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This product discussion is not available'; END IF;
  IF v_conversation.seller_id = auth.uid() THEN v_role := 'seller';
  ELSIF public.is_admin() THEN v_role := 'admin';
  ELSE v_role := 'customer'; END IF;
  INSERT INTO public.chat_messages(conversation_id, sender_id, sender_role, body, reply_to_message_id, shared_message_id)
  VALUES(p_conversation_id, auth.uid(), v_role, v_body, p_reply_to_message_id, p_shared_message_id)
  RETURNING * INTO v_message;
  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.send_product_chat_message(uuid, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_product_chat_message(uuid, text, uuid, uuid) TO authenticated;

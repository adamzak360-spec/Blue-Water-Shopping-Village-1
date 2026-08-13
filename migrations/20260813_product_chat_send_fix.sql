-- Fix the ambiguous business predicate and make message sending reliable.
DROP POLICY IF EXISTS "Customers can create their product conversations" ON public.chat_conversations;
CREATE POLICY "Customers can create their product conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      JOIN public.businesses AS b ON b.id = p.business_id
      WHERE p.id = chat_conversations.product_id
        AND p.business_id = chat_conversations.business_id
        AND b.owner_id = chat_conversations.seller_id
    )
  );

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to send a message';
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Message must contain between 1 and 4000 characters';
  END IF;

  SELECT * INTO v_conversation
  FROM public.chat_conversations
  WHERE id = p_conversation_id
    AND (customer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a participant in this conversation';
  END IF;

  IF v_conversation.customer_id = auth.uid() THEN
    v_role := 'customer';
  ELSIF v_conversation.seller_id = auth.uid() THEN
    v_role := 'seller';
  ELSE
    v_role := 'admin';
  END IF;

  INSERT INTO public.chat_messages (
    conversation_id, sender_id, sender_role, body,
    reply_to_message_id, shared_message_id
  ) VALUES (
    p_conversation_id, auth.uid(), v_role, v_body,
    p_reply_to_message_id, p_shared_message_id
  )
  RETURNING * INTO v_message;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.send_product_chat_message(uuid, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_product_chat_message(uuid, text, uuid, uuid) TO authenticated;

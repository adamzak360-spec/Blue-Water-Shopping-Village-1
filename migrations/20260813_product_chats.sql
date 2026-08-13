-- Reliable Premium Marketplace: product-specific customer/seller chat
-- Review and apply through the project's Supabase migration workflow.

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chat_conversations_customer_seller_product_key
    UNIQUE (product_id, customer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'seller', 'admin')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  shared_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.chat_message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'fraud', 'offensive', 'misleading', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS chat_conversations_customer_idx
  ON public.chat_conversations(customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_seller_idx
  ON public.chat_conversations(seller_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_product_idx
  ON public.chat_conversations(product_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx
  ON public.chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_reports_status_idx
  ON public.chat_message_reports(status, created_at DESC);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants and admins can view conversations" ON public.chat_conversations;
CREATE POLICY "Chat participants and admins can view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create their product conversations" ON public.chat_conversations;
CREATE POLICY "Customers can create their product conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE p.id = product_id
        AND p.business_id = business_id
        AND b.owner_id = seller_id
    )
  );

DROP POLICY IF EXISTS "Participants and admins can update conversations" ON public.chat_conversations;
CREATE POLICY "Participants and admins can update conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Chat participants and admins can view messages" ON public.chat_messages;
CREATE POLICY "Chat participants and admins can view messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send correctly attributed messages" ON public.chat_messages;
CREATE POLICY "Participants can send correctly attributed messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (sender_role = 'customer' AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = conversation_id AND c.customer_id = auth.uid()
      ))
      OR (sender_role = 'seller' AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = conversation_id AND c.seller_id = auth.uid()
      ))
      OR (sender_role = 'admin' AND public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Participants can moderate their chat messages" ON public.chat_messages;
CREATE POLICY "Participants can moderate their chat messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can create message reports" ON public.chat_message_reports;
CREATE POLICY "Participants can create message reports"
  ON public.chat_message_reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
        AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Reporters and admins can view reports" ON public.chat_message_reports;
CREATE POLICY "Reporters and admins can view reports"
  ON public.chat_message_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can moderate reports" ON public.chat_message_reports;
CREATE POLICY "Admins can moderate reports"
  ON public.chat_message_reports FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE OR REPLACE FUNCTION public.touch_chat_conversation()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  IF TG_TABLE_NAME = 'chat_messages' THEN
    UPDATE public.chat_conversations
    SET updated_at = timezone('utc', now()), last_message_at = COALESCE(NEW.created_at, timezone('utc', now()))
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS chat_conversations_touch_updated_at ON public.chat_conversations;
CREATE TRIGGER chat_conversations_touch_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_conversation();

DROP TRIGGER IF EXISTS chat_messages_touch_conversation ON public.chat_messages;
CREATE TRIGGER chat_messages_touch_conversation
  AFTER INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_conversation();

-- Keep direct authenticated inserts safe even if an old client reuses stale conversation metadata.
CREATE OR REPLACE FUNCTION public.validate_chat_message_sender()
RETURNS TRIGGER AS $$
DECLARE
  c public.chat_conversations;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_role = 'customer' AND NEW.sender_id <> c.customer_id THEN
    RAISE EXCEPTION 'Customer sender does not belong to this conversation';
  ELSIF NEW.sender_role = 'seller' AND NEW.sender_id <> c.seller_id THEN
    RAISE EXCEPTION 'Seller sender does not belong to this conversation';
  ELSIF NEW.sender_role = 'admin' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may send admin messages';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS chat_messages_validate_sender ON public.chat_messages;
CREATE TRIGGER chat_messages_validate_sender
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_chat_message_sender();

COMMENT ON TABLE public.chat_conversations IS 'One persistent customer-to-seller discussion scoped to a product.';
COMMENT ON TABLE public.chat_messages IS 'Persistent product-chat messages with replies and moderation state.';
COMMENT ON TABLE public.chat_message_reports IS 'Customer/seller reports for admin chat oversight.';

-- Note: account-required checkout is enforced in the application flow separately so
-- existing order/payment columns and Paystack logic remain untouched.

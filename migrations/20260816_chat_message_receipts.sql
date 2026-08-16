-- Reliable product chat: WhatsApp-style delivery and read receipts.
-- Additive only. This migration does not alter orders, payouts, or Paystack behavior.

CREATE TABLE IF NOT EXISTS public.chat_message_receipts (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (message_id, user_id),
  CHECK (read_at IS NULL OR delivered_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS chat_message_receipts_user_idx
  ON public.chat_message_receipts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS chat_message_receipts_message_idx
  ON public.chat_message_receipts(message_id);

ALTER TABLE public.chat_message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view message receipts" ON public.chat_message_receipts;
CREATE POLICY "Chat participants can view message receipts"
  ON public.chat_message_receipts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = chat_message_receipts.message_id
        AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can record their own message receipts" ON public.chat_message_receipts;
CREATE POLICY "Users can record their own message receipts"
  ON public.chat_message_receipts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = chat_message_receipts.message_id
        AND m.sender_id <> auth.uid()
        AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can update their own message receipts" ON public.chat_message_receipts;
CREATE POLICY "Users can update their own message receipts"
  ON public.chat_message_receipts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_chat_messages_delivered(
  p_conversation_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = p_conversation_id
      AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Chat access denied';
  END IF;

  INSERT INTO public.chat_message_receipts(message_id, user_id, delivered_at, updated_at)
  SELECT m.id, auth.uid(), timezone('utc', now()), timezone('utc', now())
  FROM public.chat_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> auth.uid()
    AND m.deleted_at IS NULL
    AND (p_message_ids IS NULL OR m.id = ANY(p_message_ids))
  ON CONFLICT (message_id, user_id) DO UPDATE
    SET delivered_at = COALESCE(chat_message_receipts.delivered_at, EXCLUDED.delivered_at),
        updated_at = timezone('utc', now());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_messages_read(
  p_conversation_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = p_conversation_id
      AND (c.customer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Chat access denied';
  END IF;

  INSERT INTO public.chat_message_receipts(message_id, user_id, delivered_at, read_at, updated_at)
  SELECT m.id, auth.uid(), timezone('utc', now()), timezone('utc', now()), timezone('utc', now())
  FROM public.chat_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> auth.uid()
    AND m.deleted_at IS NULL
    AND (p_message_ids IS NULL OR m.id = ANY(p_message_ids))
  ON CONFLICT (message_id, user_id) DO UPDATE
    SET delivered_at = COALESCE(chat_message_receipts.delivered_at, EXCLUDED.delivered_at),
        read_at = COALESCE(chat_message_receipts.read_at, EXCLUDED.read_at),
        updated_at = timezone('utc', now());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_messages_delivered(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_delivered(UUID, UUID[]) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_chat_messages_read(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_read(UUID, UUID[]) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_receipts;

COMMENT ON TABLE public.chat_message_receipts IS 'Per-recipient delivery and read state for product chat messages.';
COMMENT ON FUNCTION public.mark_chat_messages_delivered(UUID, UUID[]) IS 'Marks incoming product chat messages as delivered for the authenticated participant.';
COMMENT ON FUNCTION public.mark_chat_messages_read(UUID, UUID[]) IS 'Marks incoming product chat messages as read for the authenticated participant.';

NOTIFY pgrst, 'reload schema';

-- Do not apply automatically from the client. Review and run through the Supabase migration workflow.

-- End of additive chat receipt migration.

-- The following trigger keeps updated_at consistent for direct updates.
CREATE OR REPLACE FUNCTION public.touch_chat_message_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_receipts_touch_updated_at ON public.chat_message_receipts;
CREATE TRIGGER chat_message_receipts_touch_updated_at
BEFORE UPDATE ON public.chat_message_receipts
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_message_receipt();

REVOKE ALL ON FUNCTION public.touch_chat_message_receipt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_chat_message_receipt() TO authenticated;

-- Keep the migration intentionally additive and payout-neutral.

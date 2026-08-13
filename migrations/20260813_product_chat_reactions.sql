CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('👍','❤️','😂','😮','😢','🎉')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS chat_message_reactions_message_idx
  ON public.chat_message_reactions(message_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product message reactions" ON public.chat_message_reactions;
CREATE POLICY "Anyone can view product message reactions"
  ON public.chat_message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_messages m
    JOIN public.chat_conversations c ON c.id = m.conversation_id
    WHERE m.id = chat_message_reactions.message_id
      AND m.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "Authenticated users can react to product messages" ON public.chat_message_reactions;
CREATE POLICY "Authenticated users can react to product messages"
  ON public.chat_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_reactions.message_id AND m.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "Users can remove their own product reactions" ON public.chat_message_reactions;
CREATE POLICY "Users can remove their own product reactions"
  ON public.chat_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;

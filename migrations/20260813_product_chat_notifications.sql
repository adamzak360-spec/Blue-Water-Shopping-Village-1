ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chat_message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_product_chat_idx
  ON public.notifications(user_id, product_id, created_at DESC)
  WHERE product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_product_chat_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  target_product uuid;
  actor_name text;
BEGIN
  IF NEW.reply_to_message_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.sender_id, c.product_id
    INTO target_user, target_product
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.id = NEW.reply_to_message_id;

  IF target_user IS NULL OR target_user = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(p.full_name), ''), 'Someone')
    INTO actor_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, title, message, type, product_id, chat_message_id, actor_id)
  VALUES (
    target_user,
    'New reply to your message',
    actor_name || ' replied to your message in a product discussion.',
    'chat_reply',
    target_product,
    NEW.id,
    NEW.sender_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_product_chat_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  target_product uuid;
  actor_name text;
BEGIN
  SELECT m.sender_id, c.product_id
    INTO target_user, target_product
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.id = NEW.message_id;

  IF target_user IS NULL OR target_user = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(p.full_name), ''), 'Someone')
    INTO actor_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, message, type, product_id, chat_message_id, actor_id)
  VALUES (
    target_user,
    'New reaction to your message',
    actor_name || ' reacted ' || NEW.reaction || ' to your message in a product discussion.',
    'chat_reaction',
    target_product,
    NEW.message_id,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_product_chat_reply ON public.chat_messages;
CREATE TRIGGER trg_notify_product_chat_reply
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_chat_reply();

DROP TRIGGER IF EXISTS trg_notify_product_chat_reaction ON public.chat_message_reactions;
CREATE TRIGGER trg_notify_product_chat_reaction
  AFTER INSERT ON public.chat_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_chat_reaction();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

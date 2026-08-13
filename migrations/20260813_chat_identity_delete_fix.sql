CREATE OR REPLACE FUNCTION public.get_chat_sender_names(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id,
         COALESCE(
           NULLIF(BTRIM(p.full_name), ''),
           NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
           NULLIF(BTRIM(u.raw_user_meta_data ->> 'name'), ''),
           NULLIF(BTRIM(u.email), ''),
           'Reliable member'
         ) AS display_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = ANY(p_user_ids)
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.get_chat_sender_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_sender_names(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_product_chat_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_row public.chat_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to delete a message';
  END IF;

  SELECT * INTO message_row
  FROM public.chat_messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF message_row.sender_id <> auth.uid()
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.chat_conversations c
       WHERE c.id = message_row.conversation_id AND c.seller_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'You are not allowed to delete this message';
  END IF;

  UPDATE public.chat_messages
  SET deleted_at = timezone('utc', now()), updated_at = timezone('utc', now())
  WHERE id = p_message_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_product_chat_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_product_chat_message(uuid) TO authenticated;

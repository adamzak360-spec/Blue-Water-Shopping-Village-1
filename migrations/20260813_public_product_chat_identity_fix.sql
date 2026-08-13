-- Remove the legacy private-room customer ownership validation.
CREATE OR REPLACE FUNCTION public.validate_chat_message_sender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.chat_conversations;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This product discussion does not exist';
  END IF;
  IF NEW.sender_role = 'seller' AND NEW.sender_id <> c.seller_id THEN
    RAISE EXCEPTION 'Seller sender does not belong to this product discussion';
  ELSIF NEW.sender_role = 'admin' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may send admin messages';
  ELSIF NEW.sender_role NOT IN ('customer', 'seller', 'admin') THEN
    RAISE EXCEPTION 'Invalid sender role';
  END IF;
  RETURN NEW;
END;
$$;

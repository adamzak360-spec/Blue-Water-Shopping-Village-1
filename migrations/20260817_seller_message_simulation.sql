-- Free seller SMS/WhatsApp simulation mode.
-- This records message previews only; it never contacts a carrier or WhatsApp.

CREATE TABLE IF NOT EXISTS public.seller_message_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  recipient text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, channel)
);

ALTER TABLE public.seller_message_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers and admins can view simulated messages" ON public.seller_message_simulations;
CREATE POLICY "Sellers and admins can view simulated messages"
  ON public.seller_message_simulations
  FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'general_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.record_seller_message_simulations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_store_name text;
  v_phone text;
  v_whatsapp text;
  v_items text;
  v_message text;
BEGIN
  SELECT b.owner_id, COALESCE(b.name, b.business_name, 'your store'),
         COALESCE(b.contact_phone, b.phone), b.whatsapp_url
  INTO v_seller_id, v_store_name, v_phone, v_whatsapp
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT string_agg(format('%s x%s', item->>'name', COALESCE(item->>'quantity', '1')), ', ')
  INTO v_items
  FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) AS item;

  v_message := format(
    'SIMULATED ALERT: New order #%s for %s. Items: %s. Total: GH₵%s. This is a test preview only; no SMS or WhatsApp message was sent.',
    left(NEW.id::text, 8), v_store_name, COALESCE(v_items, 'order items'), to_char(COALESCE(NEW.total, 0), 'FM999999990.00')
  );

  INSERT INTO public.seller_message_simulations (order_id, seller_id, channel, recipient, message)
  VALUES
    (NEW.id, v_seller_id, 'sms', v_phone, v_message),
    (NEW.id, v_seller_id, 'whatsapp', COALESCE(v_whatsapp, v_phone), v_message)
  ON CONFLICT (order_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_record_seller_message_simulations ON public.orders;
CREATE TRIGGER orders_record_seller_message_simulations
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_seller_message_simulations();

COMMENT ON TABLE public.seller_message_simulations IS
  'Free SMS and WhatsApp test previews. These records never send external messages.';

GRANT SELECT ON public.seller_message_simulations TO authenticated;
REVOKE ALL ON FUNCTION public.record_seller_message_simulations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_seller_message_simulations() TO postgres, service_role;

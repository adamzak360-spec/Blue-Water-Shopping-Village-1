-- Durable post-payment email delivery ledger for Reliable Now.
-- Email delivery is intentionally separate from payment/order persistence:
-- a provider outage must never roll back a paid order.

CREATE TABLE IF NOT EXISTS public.order_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'admin', 'seller')),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider text,
  provider_message_id text,
  last_error text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (order_id, recipient_type, recipient_email)
);

CREATE INDEX IF NOT EXISTS order_email_deliveries_order_idx
  ON public.order_email_deliveries(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_email_deliveries_retry_idx
  ON public.order_email_deliveries(status, updated_at);

ALTER TABLE public.order_email_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_email_deliveries_no_client_access ON public.order_email_deliveries;
CREATE POLICY order_email_deliveries_no_client_access
  ON public.order_email_deliveries
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.order_email_deliveries FROM anon, authenticated;
GRANT ALL ON TABLE public.order_email_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.touch_order_email_deliveries()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_email_deliveries_touch ON public.order_email_deliveries;
CREATE TRIGGER order_email_deliveries_touch
BEFORE UPDATE ON public.order_email_deliveries
FOR EACH ROW EXECUTE FUNCTION public.touch_order_email_deliveries();

COMMENT ON TABLE public.order_email_deliveries IS
  'Server-only idempotency and delivery evidence for customer, admin, and seller emails after paid order finalization.';

NOTIFY pgrst, 'reload schema';

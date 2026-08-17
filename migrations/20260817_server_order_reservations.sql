-- Server-side payment reservations for Reliable Now.
-- Reservations are deliberately separate from public.orders:
--   * unpaid attempts must not fire order triggers or reduce stock;
--   * the Paystack reference remains a durable idempotency key;
--   * the complete cart and delivery context survives browser loss.

CREATE TABLE IF NOT EXISTS public.order_payment_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  delivery_address text,
  city text,
  region text,
  notes text,
  items jsonb NOT NULL,
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total numeric(12,2) NOT NULL CHECK (total > 0),
  currency text NOT NULL DEFAULT 'GHS',
  delivery_method text,
  delivery_area text,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','paid','failed','expired')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  provider_transaction_id text,
  payment_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  finalized_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS order_payment_reservations_status_idx
  ON public.order_payment_reservations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_payment_reservations_user_idx
  ON public.order_payment_reservations(user_id, created_at DESC);

ALTER TABLE public.order_payment_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_payment_reservations_no_client_access ON public.order_payment_reservations;
CREATE POLICY order_payment_reservations_no_client_access
  ON public.order_payment_reservations
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.touch_order_payment_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_payment_reservations_touch ON public.order_payment_reservations;
CREATE TRIGGER order_payment_reservations_touch
BEFORE UPDATE ON public.order_payment_reservations
FOR EACH ROW EXECUTE FUNCTION public.touch_order_payment_reservation();

COMMENT ON TABLE public.order_payment_reservations IS
  'Server-only checkout context retained before Paystack redirect; finalized exactly once after verified payment.';
REVOKE ALL ON TABLE public.order_payment_reservations FROM anon, authenticated;
GRANT ALL ON TABLE public.order_payment_reservations TO service_role;

NOTIFY pgrst, 'reload schema';

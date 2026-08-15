-- Reliable seller payout foundation
-- Safe by design: this migration adds state and audit storage only.
-- It does not initiate Paystack transfers and does not alter customer checkout.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS customer_confirmed_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_confirmed_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_eligibility_status TEXT NOT NULL DEFAULT 'not_eligible',
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'not_queued',
  ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payout_eligibility_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payout_eligibility_status_check
  CHECK (payout_eligibility_status IN ('not_eligible', 'eligible', 'blocked'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payout_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payout_status_check
  CHECK (payout_status IN ('not_queued', 'pending', 'queued', 'processing', 'success', 'failed', 'retry_required', 'pending_funds', 'hold'));

CREATE INDEX IF NOT EXISTS orders_payout_eligibility_idx
  ON public.orders (payout_eligibility_status, payout_status);

CREATE TABLE IF NOT EXISTS public.seller_payout_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  recipient_code TEXT UNIQUE,
  account_name TEXT,
  bank_name TEXT,
  account_last4 TEXT,
  currency TEXT NOT NULL DEFAULT 'GHS',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount >= 0),
  commission_amount NUMERIC(14,2) NOT NULL CHECK (commission_amount >= 0),
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payout_reference TEXT NOT NULL UNIQUE,
  recipient_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  eligible_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT seller_payouts_status_check CHECK (status IN ('pending', 'queued', 'processing', 'success', 'failed', 'retry_required', 'pending_funds', 'hold')),
  CONSTRAINT seller_payouts_amounts_check CHECK (net_amount = gross_amount - commission_amount)
);

CREATE INDEX IF NOT EXISTS seller_payouts_queue_idx
  ON public.seller_payouts (status, queued_at);
CREATE INDEX IF NOT EXISTS seller_payouts_business_idx
  ON public.seller_payouts (business_id, status);

CREATE TABLE IF NOT EXISTS public.seller_payout_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID REFERENCES public.seller_payouts(id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  payout_reference TEXT,
  status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS seller_payout_events_order_idx
  ON public.seller_payout_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_payout_events_payout_idx
  ON public.seller_payout_events (payout_id, created_at DESC);

ALTER TABLE public.seller_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_events ENABLE ROW LEVEL SECURITY;

-- No browser/client role may create or modify payout records.
DROP POLICY IF EXISTS "No direct payout profile access" ON public.seller_payout_profiles;
DROP POLICY IF EXISTS "No direct payout access" ON public.seller_payouts;
DROP POLICY IF EXISTS "No direct payout event access" ON public.seller_payout_events;
CREATE POLICY "No direct payout profile access" ON public.seller_payout_profiles FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct payout access" ON public.seller_payouts FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct payout event access" ON public.seller_payout_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON COLUMN public.orders.delivery_confirmed_at IS 'Delivery confirmation is eligibility evidence; it is not proof of payment to the seller.';
COMMENT ON COLUMN public.orders.payout_status IS 'Seller payout state. Only a trusted verified Paystack transfer may set success.';
COMMENT ON TABLE public.seller_payouts IS 'Idempotent seller payout queue records. Transfer execution must remain server-side.';
COMMENT ON TABLE public.seller_payout_events IS 'Immutable-style audit trail for payout state transitions.';

REVOKE ALL ON TABLE public.seller_payout_profiles, public.seller_payouts, public.seller_payout_events FROM anon, authenticated;
GRANT ALL ON TABLE public.seller_payout_profiles, public.seller_payouts, public.seller_payout_events TO service_role;
-- This migration intentionally does not backfill existing orders as paid or eligible.
-- Existing order history remains unchanged until a reviewed eligibility process is deployed.

NOTIFY pgrst, 'reload schema';

-- End safe foundation migration.

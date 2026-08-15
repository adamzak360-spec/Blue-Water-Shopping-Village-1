-- Reliable seller payout phase 2: additive extension for the existing production schema.
-- This migration preserves existing orders, payments, commission rules, payout rows,
-- and seller payout identifiers. It does not send Paystack transfers.

BEGIN;

-- Existing production seller_payout_profiles uses seller_id/store_id.
ALTER TABLE public.seller_payout_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'NOT_COMPLETED',
  ADD COLUMN IF NOT EXISTS verification_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_last4 TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.seller_payout_profiles
  DROP CONSTRAINT IF EXISTS seller_payout_profiles_verification_status_check;
ALTER TABLE public.seller_payout_profiles
  ADD CONSTRAINT seller_payout_profiles_verification_status_check
  CHECK (verification_status IN ('NOT_COMPLETED', 'PENDING_VERIFICATION', 'VERIFIED', 'REQUIRES_ATTENTION'));

-- Existing production seller_payouts uses payout_id/seller_id/store_id and must be retained.
ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gross_amount_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_payout_amount_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS eligibility_status TEXT NOT NULL DEFAULT 'HELD',
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'HELD',
  ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paystack_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Normalize only newly-added/defaultable values; existing payout state is not promoted.
UPDATE public.seller_payouts
SET currency = COALESCE(currency, 'GHS'),
    eligibility_status = COALESCE(eligibility_status, 'HELD'),
    payout_status = COALESCE(payout_status, 'HELD'),
    gross_amount_minor = COALESCE(gross_amount_minor, 0),
    commission_amount_minor = COALESCE(commission_amount_minor, 0),
    seller_payout_amount_minor = COALESCE(seller_payout_amount_minor, 0),
    retry_count = COALESCE(retry_count, 0),
    updated_at = COALESCE(updated_at, timezone('utc'::text, now()));

ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS seller_payouts_eligibility_status_check,
  DROP CONSTRAINT IF EXISTS seller_payouts_payout_status_check,
  DROP CONSTRAINT IF EXISTS seller_payouts_amounts_check,
  DROP CONSTRAINT IF EXISTS seller_payouts_currency_check;
ALTER TABLE public.seller_payouts
  ADD CONSTRAINT seller_payouts_eligibility_status_check
    CHECK (eligibility_status IN ('HELD', 'ELIGIBLE')),
  ADD CONSTRAINT seller_payouts_payout_status_check
    CHECK (payout_status IN ('HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED', 'RETRY_REQUIRED', 'PENDING_FUNDS', 'ON_HOLD')),
  ADD CONSTRAINT seller_payouts_amounts_check
    CHECK (gross_amount_minor >= 0 AND commission_amount_minor >= 0 AND seller_payout_amount_minor >= 0),
  ADD CONSTRAINT seller_payouts_currency_check
    CHECK (currency = 'GHS');

CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_order_id_unique
  ON public.seller_payouts(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_transfer_reference_unique
  ON public.seller_payouts(paystack_transfer_reference)
  WHERE paystack_transfer_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS seller_payouts_queue_idx
  ON public.seller_payouts(payout_status, queued_at, created_at);
CREATE INDEX IF NOT EXISTS seller_payouts_seller_status_idx
  ON public.seller_payouts(seller_id, payout_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.seller_payout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID REFERENCES public.seller_payouts(payout_id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  transfer_reference TEXT,
  status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS seller_payout_events_order_idx
  ON public.seller_payout_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_payout_events_payout_idx
  ON public.seller_payout_events(payout_id, created_at DESC);

ALTER TABLE public.seller_payout_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct seller payout event writes" ON public.seller_payout_events;
CREATE POLICY "No direct seller payout event writes" ON public.seller_payout_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE public.seller_payout_events FROM anon, authenticated;
GRANT ALL ON TABLE public.seller_payout_events TO service_role;

COMMENT ON TABLE public.seller_payouts IS 'Seller payout ledger. Delivery confirmation makes a payout eligible; only verified Paystack transfer success makes it paid.';
COMMENT ON COLUMN public.seller_payouts.payout_status IS 'HELD, ELIGIBLE, QUEUED, PROCESSING, PAID, FAILED, REVERSED, RETRY_REQUIRED, PENDING_FUNDS, or ON_HOLD.';
COMMENT ON COLUMN public.seller_payouts.paystack_transfer_reference IS 'Server-side transfer reference only; never expose Paystack secret credentials.';

NOTIFY pgrst, 'reload schema';
COMMIT;

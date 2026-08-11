-- Secure POS subscription payments and country pricing integrity

-- A seller can have only one active POS pricing plan per country.
CREATE UNIQUE INDEX IF NOT EXISTS pos_subscription_plans_country_code_uidx
  ON public.pos_subscription_plans(country_code);

ALTER TABLE public.pos_subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view POS subscription plans" ON public.pos_subscription_plans;
CREATE POLICY "Public can view POS subscription plans"
  ON public.pos_subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Paystack references are recorded server-side before a subscription is activated.
-- This makes confirmation idempotent and prevents one successful transaction from
-- being applied repeatedly to the same business.
CREATE TABLE IF NOT EXISTS public.pos_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.pos_subscription_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pos_subscription_payments FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS pos_subscription_payments_business_idx
  ON public.pos_subscription_payments(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pos_subscription_payments_user_idx
  ON public.pos_subscription_payments(user_id, created_at DESC);

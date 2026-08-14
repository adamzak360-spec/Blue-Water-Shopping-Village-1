-- International payment providers: additive, backward-compatible foundation.
-- Existing Paystack columns and flows remain unchanged.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS orders_provider_reference_idx
  ON public.orders(payment_provider, provider_reference);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'stripe', 'paypal')),
  provider_reference TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency = upper(currency) AND length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('requires_action', 'pending', 'success', 'failed', 'refunded', 'reversed')),
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx
  ON public.payment_transactions(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx
  ON public.payment_transactions(provider, status, created_at DESC);

ALTER TABLE public.seller_payout_profiles
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_account_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_onboarding_status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (provider_onboarding_status IN ('NOT_STARTED', 'PENDING', 'ACTIVE', 'RESTRICTED', 'REJECTED'));

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_transfer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_provider_transfer_idx
  ON public.seller_payouts(payment_provider, provider_transfer_reference)
  WHERE provider_transfer_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_provider_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'stripe', 'paypal')),
  country_code TEXT NOT NULL REFERENCES public.countries(code),
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  checkout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  split_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sandbox_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, country_code, currency_code)
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins view payment transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Public read enabled payment capabilities" ON public.payment_provider_capabilities;
CREATE POLICY "Public read enabled payment capabilities" ON public.payment_provider_capabilities
  FOR SELECT TO anon, authenticated
  USING (checkout_enabled OR split_payment_enabled OR payout_enabled);

DROP POLICY IF EXISTS "Admins manage payment capabilities" ON public.payment_provider_capabilities;
CREATE POLICY "Admins manage payment capabilities" ON public.payment_provider_capabilities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

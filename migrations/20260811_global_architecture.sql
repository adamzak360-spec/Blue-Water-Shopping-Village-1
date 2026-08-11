-- Phase 2: Global Country/Currency Architecture

-- 1. Currencies Table
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY, -- e.g., 'GHS', 'USD', 'NGN'
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 2. Countries Table
CREATE TABLE IF NOT EXISTS public.countries (
  code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2 (e.g., 'GH', 'NG', 'US')
  name TEXT NOT NULL,
  currency_code TEXT REFERENCES public.currencies(code),
  status TEXT NOT NULL CHECK (status IN ('COMING_SOON', 'PAYMENTS_ONLY', 'FULLY_SUPPORTED', 'DISABLED')),
  payment_provider TEXT, -- e.g., 'paystack'
  payments_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  identity_verification_enabled BOOLEAN DEFAULT FALSE,
  business_verification_enabled BOOLEAN DEFAULT FALSE,
  store_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. Seed Initial Data
INSERT INTO public.currencies (code, name, symbol) VALUES
('GHS', 'Ghanaian Cedi', 'GH₵'),
('NGN', 'Nigerian Naira', '₦'),
('KES', 'Kenyan Shilling', 'KSh'),
('USD', 'US Dollar', '$'),
('GBP', 'British Pound', '£'),
('EUR', 'Euro', '€')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.countries (code, name, currency_code, status, payment_provider, payments_enabled, payouts_enabled, store_enabled) VALUES
('GH', 'Ghana', 'GHS', 'FULLY_SUPPORTED', 'paystack', TRUE, TRUE, TRUE),
('NG', 'Nigeria', 'NGN', 'COMING_SOON', 'paystack', FALSE, FALSE, FALSE),
('KE', 'Kenya', 'KES', 'COMING_SOON', 'paystack', FALSE, FALSE, FALSE),
('US', 'United States', 'USD', 'COMING_SOON', NULL, FALSE, FALSE, FALSE),
('GB', 'United Kingdom', 'GBP', 'COMING_SOON', NULL, FALSE, FALSE, FALSE)
ON CONFLICT (code) DO NOTHING;

-- 4. Update Existing Tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code);

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code);

-- Update existing businesses to GH/GHS
UPDATE public.businesses SET country_code = 'GH', currency_code = 'GHS' WHERE country_code IS NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code);
-- Update existing orders to GH/GHS
UPDATE public.orders SET country_code = 'GH' WHERE country_code IS NULL;
UPDATE public.orders SET currency = 'GHS' WHERE currency IS NULL OR currency = '';

-- Relax constraints on seller_payout_profiles and seller_payouts if they exist
DO $$ 
BEGIN
    ALTER TABLE public.seller_payout_profiles DROP CONSTRAINT IF EXISTS seller_payout_profiles_currency_check;
    ALTER TABLE public.seller_payouts DROP CONSTRAINT IF EXISTS seller_payouts_currency_check;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- RLS Policies for new tables
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to currencies" ON public.currencies;
CREATE POLICY "Allow public read access to currencies" ON public.currencies FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow public read access to countries" ON public.countries;
CREATE POLICY "Allow public read access to countries" ON public.countries FOR SELECT USING (status != 'DISABLED');

DROP POLICY IF EXISTS "Admins can manage currencies" ON public.currencies;
CREATE POLICY "Admins can manage currencies" ON public.currencies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;
CREATE POLICY "Admins can manage countries" ON public.countries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

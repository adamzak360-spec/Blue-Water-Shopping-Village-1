-- Reliable Ads pricing plans: admin-controlled packages for paid advertiser campaigns.
-- Amounts are stored in pesewas (GHS smallest currency unit).

CREATE TABLE IF NOT EXISTS public.ad_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  description TEXT,
  price_minor BIGINT NOT NULL CHECK (price_minor > 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS pricing_plan_id UUID REFERENCES public.ad_pricing_plans(id) ON DELETE SET NULL;

ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS pricing_plan_id UUID REFERENCES public.ad_pricing_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ad_pricing_plans_active_idx
  ON public.ad_pricing_plans(is_active, sort_order, price_minor);
CREATE INDEX IF NOT EXISTS advertisements_pricing_plan_idx
  ON public.advertisements(pricing_plan_id);
CREATE INDEX IF NOT EXISTS ad_payments_pricing_plan_idx
  ON public.ad_payments(pricing_plan_id);

ALTER TABLE public.ad_pricing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active ad pricing plans" ON public.ad_pricing_plans;
CREATE POLICY "Public read active ad pricing plans"
  ON public.ad_pricing_plans FOR SELECT
  USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins manage ad pricing plans" ON public.ad_pricing_plans;
CREATE POLICY "Admins manage ad pricing plans"
  ON public.ad_pricing_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

INSERT INTO public.ad_pricing_plans (name, description, price_minor, duration_days, sort_order)
SELECT 'Starter - 1 Day', 'One-day advertising package', 5000, 1, 10
WHERE NOT EXISTS (SELECT 1 FROM public.ad_pricing_plans);

INSERT INTO public.ad_pricing_plans (name, description, price_minor, duration_days, sort_order)
SELECT 'Growth - 7 Days', 'Seven-day advertising package', 20000, 7, 20
WHERE NOT EXISTS (
  SELECT 1 FROM public.ad_pricing_plans WHERE duration_days = 7 AND price_minor = 20000
);

GRANT SELECT ON public.ad_pricing_plans TO anon, authenticated;

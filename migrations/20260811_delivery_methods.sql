-- Phase 5: Dynamic global delivery methods

CREATE TABLE IF NOT EXISTS public.delivery_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_code TEXT REFERENCES public.countries(code),
  name TEXT NOT NULL,
  coverage_area TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency_code TEXT NOT NULL DEFAULT 'GHS' REFERENCES public.currencies(code),
  pricing_type TEXT NOT NULL DEFAULT 'flat' CHECK (pricing_type IN ('flat', 'per_item')),
  estimated_days TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS delivery_methods_business_idx
  ON public.delivery_methods (business_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS delivery_methods_country_idx
  ON public.delivery_methods (country_code, is_active, sort_order);

ALTER TABLE public.delivery_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active delivery methods" ON public.delivery_methods;
CREATE POLICY "Public can view active delivery methods"
  ON public.delivery_methods
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage delivery methods" ON public.delivery_methods;
CREATE POLICY "Admins can manage delivery methods"
  ON public.delivery_methods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can manage their delivery methods" ON public.delivery_methods;
CREATE POLICY "Sellers can manage their delivery methods"
  ON public.delivery_methods
  FOR ALL
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = delivery_methods.business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = delivery_methods.business_id AND b.owner_id = auth.uid()
    )
  );

-- Seed the existing Ghana delivery choices as global defaults, without creating duplicates.
INSERT INTO public.delivery_methods
  (country_code, name, coverage_area, price, currency_code, pricing_type, estimated_days, sort_order)
SELECT * FROM (VALUES
  ('GH', 'Tamale Delivery', 'Tamale and nearby communities', 15.00, 'GHS', 'flat', '1-2 days', 10),
  ('GH', 'STC Transport', 'Greater Accra and STC-connected areas', 35.00, 'GHS', 'flat', '3-5 days', 20),
  ('GH', 'VIP Transport', 'Lesser Accra and VIP-connected areas', 45.00, 'GHS', 'flat', '2-3 days', 30),
  ('GH', 'OA Transport', 'OA-connected regions', 40.00, 'GHS', 'flat', '3-4 days', 40),
  ('GH', 'VVIP Transport', 'VVIP-connected regions', 50.00, 'GHS', 'flat', '2-3 days', 50),
  ('GH', 'FedEx Delivery', 'Nationwide and international destinations supported by FedEx', 90.00, 'GHS', 'flat', '1-2 days', 60)
) AS defaults(country_code, name, coverage_area, price, currency_code, pricing_type, estimated_days, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_methods existing
  WHERE existing.business_id IS NULL
    AND existing.country_code = defaults.country_code
    AND existing.name = defaults.name
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_area TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_currency TEXT REFERENCES public.currencies(code);

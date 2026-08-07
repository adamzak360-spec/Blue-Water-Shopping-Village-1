-- =============================================
-- Migration: Seller Store Onboarding Fields
-- =============================================
-- Add fields required by the seller onboarding form:
-- business_name (legal business name), phone, location, category
-- and an updated_at trigger for businesses.

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS businesses_category_idx ON public.businesses(category);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_businesses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_businesses_timestamp ON public.businesses;
CREATE TRIGGER update_businesses_timestamp
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_businesses_timestamp();

-- =============================================
-- End of Migration: Seller Store Onboarding Fields
-- =============================================

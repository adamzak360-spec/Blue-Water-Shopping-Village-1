-- Reliable seller promotions MVP: featured products and stores.
-- Activation is performed only by the server after Paystack verification.

CREATE TABLE IF NOT EXISTS public.promotion_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('FEATURED_PRODUCT', 'FEATURED_STORE')),
  name TEXT NOT NULL,
  price_minor BIGINT NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0 AND duration_days <= 365),
  placement TEXT NOT NULL CHECK (placement IN ('MARKETPLACE', 'STORES')),
  max_active_promotions INTEGER NOT NULL DEFAULT 10 CHECK (max_active_promotions > 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.seller_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.promotion_plans(id) ON DELETE RESTRICT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('FEATURED_PRODUCT', 'FEATURED_STORE')),
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED', 'SUSPENDED')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  payment_reference TEXT UNIQUE,
  payment_paid_at TIMESTAMPTZ,
  impressions_count BIGINT NOT NULL DEFAULT 0 CHECK (impressions_count >= 0),
  clicks_count BIGINT NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT seller_promotions_target_check CHECK (
    (promotion_type = 'FEATURED_PRODUCT' AND product_id IS NOT NULL)
    OR (promotion_type = 'FEATURED_STORE' AND product_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.seller_promotion_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.seller_promotions(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS seller_promotions_status_idx ON public.seller_promotions(status, ends_at);
CREATE INDEX IF NOT EXISTS seller_promotions_seller_idx ON public.seller_promotions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_promotions_store_idx ON public.seller_promotions(store_id, status, ends_at);
CREATE INDEX IF NOT EXISTS seller_promotions_product_idx ON public.seller_promotions(product_id, status, ends_at);
CREATE INDEX IF NOT EXISTS seller_promotion_payments_reference_idx ON public.seller_promotion_payments(paystack_reference);

ALTER TABLE public.promotion_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_promotion_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active promotion plans" ON public.promotion_plans;
CREATE POLICY "Public read active promotion plans" ON public.promotion_plans FOR SELECT USING (is_active = TRUE OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage promotion plans" ON public.promotion_plans;
CREATE POLICY "Admins manage promotion plans" ON public.promotion_plans FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Public read active promotions" ON public.seller_promotions;
CREATE POLICY "Public read active promotions" ON public.seller_promotions FOR SELECT USING (status = 'ACTIVE' AND starts_at <= timezone('utc', now()) AND ends_at > timezone('utc', now()));
DROP POLICY IF EXISTS "Sellers view own promotions" ON public.seller_promotions;
CREATE POLICY "Sellers view own promotions" ON public.seller_promotions FOR SELECT TO authenticated USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage promotions" ON public.seller_promotions;
CREATE POLICY "Admins manage promotions" ON public.seller_promotions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Sellers view own promotion payments" ON public.seller_promotion_payments;
CREATE POLICY "Sellers view own promotion payments" ON public.seller_promotion_payments FOR SELECT TO authenticated USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.expire_seller_promotions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.seller_promotions SET status = 'EXPIRED', updated_at = timezone('utc', now())
  WHERE status = 'ACTIVE' AND ends_at <= timezone('utc', now());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_seller_promotions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_seller_promotions() TO service_role;

CREATE OR REPLACE FUNCTION public.get_active_promoted_products(p_limit INTEGER DEFAULT 12)
RETURNS SETOF public.seller_promotions LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.* FROM public.seller_promotions sp
  WHERE sp.promotion_type = 'FEATURED_PRODUCT' AND sp.status = 'ACTIVE'
    AND sp.starts_at <= timezone('utc', now()) AND sp.ends_at > timezone('utc', now())
  ORDER BY sp.created_at DESC LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;
REVOKE ALL ON FUNCTION public.get_active_promoted_products(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_promoted_products(INTEGER) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_promoted_stores(p_limit INTEGER DEFAULT 12)
RETURNS SETOF public.seller_promotions LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.* FROM public.seller_promotions sp
  WHERE sp.promotion_type = 'FEATURED_STORE' AND sp.status = 'ACTIVE'
    AND sp.starts_at <= timezone('utc', now()) AND sp.ends_at > timezone('utc', now())
  ORDER BY sp.created_at DESC LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;
REVOKE ALL ON FUNCTION public.get_active_promoted_stores(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_promoted_stores(INTEGER) TO anon, authenticated;

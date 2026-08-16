-- Reliable Now product visibility packages.
-- Products remain store-only unless a verified, active entitlement grants public placement.

CREATE TABLE IF NOT EXISTS public.product_visibility_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]+$'),
  name TEXT NOT NULL,
  description TEXT,
  target TEXT NOT NULL CHECK (target IN ('STORE_ONLY', 'PRODUCTS', 'HOME', 'HOME_AND_PRODUCTS')),
  price_minor BIGINT NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0 AND duration_days <= 365),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.product_visibility_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.product_visibility_plans(id) ON DELETE RESTRICT,
  target TEXT NOT NULL CHECK (target IN ('STORE_ONLY', 'PRODUCTS', 'HOME', 'HOME_AND_PRODUCTS')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'REVOKED')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0 AND duration_days <= 365),
  payment_reference TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT visibility_entitlement_target_snapshot CHECK (target IN ('STORE_ONLY', 'PRODUCTS', 'HOME', 'HOME_AND_PRODUCTS'))
);

CREATE INDEX IF NOT EXISTS product_visibility_entitlements_public_idx
  ON public.product_visibility_entitlements(product_id, status, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS product_visibility_entitlements_seller_idx
  ON public.product_visibility_entitlements(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_visibility_entitlements_store_idx
  ON public.product_visibility_entitlements(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS product_visibility_pending_reference_idx
  ON public.product_visibility_entitlements(payment_reference)
  WHERE payment_reference IS NOT NULL;

ALTER TABLE public.product_visibility_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_visibility_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active visibility plans" ON public.product_visibility_plans;
CREATE POLICY "Public read active visibility plans"
  ON public.product_visibility_plans FOR SELECT
  USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins manage visibility plans" ON public.product_visibility_plans;
CREATE POLICY "Admins manage visibility plans"
  ON public.product_visibility_plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Sellers view own visibility entitlements" ON public.product_visibility_entitlements;
CREATE POLICY "Sellers view own visibility entitlements"
  ON public.product_visibility_entitlements FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins manage visibility entitlements" ON public.product_visibility_entitlements;
CREATE POLICY "Admins manage visibility entitlements"
  ON public.product_visibility_entitlements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.expire_product_visibility_entitlements()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.product_visibility_entitlements
  SET status = 'EXPIRED', updated_at = timezone('utc', now())
  WHERE status = 'PAID' AND expires_at IS NOT NULL AND expires_at <= timezone('utc', now());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_product_visibility_entitlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_product_visibility_entitlements() TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_catalog_products(p_destination TEXT DEFAULT 'PRODUCTS', p_search TEXT DEFAULT NULL)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'active'
    AND (
      (
        NULLIF(trim(COALESCE(p_search, '')), '') IS NOT NULL
        AND (
          p.name ILIKE '%' || trim(p_search) || '%'
          OR COALESCE(p.description, '') ILIKE '%' || trim(p_search) || '%'
          OR COALESCE(p.category, '') ILIKE '%' || trim(p_search) || '%'
          OR COALESCE(p.brand, '') ILIKE '%' || trim(p_search) || '%'
        )
        AND p.business_id IS NOT NULL
      )
      OR (
        NULLIF(trim(COALESCE(p_search, '')), '') IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.product_visibility_entitlements e
          WHERE e.product_id = p.id
            AND e.status = 'PAID'
            AND e.starts_at IS NOT NULL
            AND e.starts_at <= timezone('utc', now())
            AND e.expires_at IS NOT NULL
            AND e.expires_at > timezone('utc', now())
            AND (
              (p_destination = 'PRODUCTS' AND e.target IN ('PRODUCTS', 'HOME_AND_PRODUCTS'))
              OR (p_destination = 'HOME' AND e.target IN ('HOME', 'HOME_AND_PRODUCTS'))
            )
        )
      )
    )
  ORDER BY p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_catalog_products(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_products(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_product_visibility_entitlement(
  p_store_id UUID,
  p_product_id UUID,
  p_plan_id UUID,
  p_payment_reference TEXT
)
RETURNS public.product_visibility_entitlements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_plan public.product_visibility_plans;
  v_product public.products;
  v_entitlement public.product_visibility_entitlements;
  v_owner UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_plan FROM public.product_visibility_plans WHERE id = p_plan_id AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visibility package is not active'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND business_id = p_store_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product does not belong to the selected store'; END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = p_store_id;
  IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'You do not own this store'; END IF;
  IF p_payment_reference IS NULL OR length(trim(p_payment_reference)) < 8 THEN RAISE EXCEPTION 'Payment reference is required'; END IF;

  INSERT INTO public.product_visibility_entitlements (
    seller_id, store_id, product_id, plan_id, target, amount_minor, currency, duration_days, payment_reference
  ) VALUES (
    v_user, p_store_id, p_product_id, v_plan.id, v_plan.target, v_plan.price_minor, v_plan.currency, v_plan.duration_days, trim(p_payment_reference)
  )
  ON CONFLICT (payment_reference) DO UPDATE SET updated_at = timezone('utc', now())
  RETURNING * INTO v_entitlement;
  RETURN v_entitlement;
END;
$$;
REVOKE ALL ON FUNCTION public.create_product_visibility_entitlement(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_product_visibility_entitlement(UUID, UUID, UUID, TEXT) TO authenticated;

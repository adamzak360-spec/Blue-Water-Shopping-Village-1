-- Admin-controlled compatibility mode for public catalog visibility.
-- When enabled, active products appear on Home and Products without a paid entitlement.
-- When disabled, the existing paid visibility entitlement rules remain enforced.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS free_public_catalog BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.businesses.free_public_catalog IS
  'Whether active seller products may appear on the public Home and Products catalogs without a paid visibility package; managed by platform administrators.';

UPDATE public.businesses
SET free_public_catalog = FALSE
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND free_public_catalog IS NULL;

CREATE OR REPLACE FUNCTION public.get_public_catalog_products(p_destination TEXT DEFAULT 'PRODUCTS', p_search TEXT DEFAULT NULL)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.*
  FROM public.products p
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT b.free_public_catalog
       FROM public.businesses b
       WHERE b.id = '00000000-0000-0000-0000-000000000001'),
      FALSE
    ) AS free_mode
  ) settings
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
        AND (
          settings.free_mode = TRUE
          OR EXISTS (
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
    )
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog_products(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_products(TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

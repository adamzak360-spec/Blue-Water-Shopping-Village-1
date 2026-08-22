-- Bounded public catalog RPC for storefront performance.
-- Additive only: preserves the existing two-argument RPC and all product records.

CREATE OR REPLACE FUNCTION public.get_public_catalog_products_bounded(
  p_destination TEXT DEFAULT 'PRODUCTS',
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    AND (NULLIF(trim(COALESCE(p_category, '')), '') IS NULL OR p.category = trim(p_category))
    AND (
      NULLIF(trim(COALESCE(p_search, '')), '') IS NULL
      OR p.name ILIKE '%' || trim(p_search) || '%'
      OR COALESCE(p.description, '') ILIKE '%' || trim(p_search) || '%'
      OR COALESCE(p.category, '') ILIKE '%' || trim(p_search) || '%'
      OR COALESCE(p.brand, '') ILIKE '%' || trim(p_search) || '%'
    )
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
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 60)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog_products_bounded(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_products_bounded(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

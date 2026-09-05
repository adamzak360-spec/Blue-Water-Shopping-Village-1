-- Additive product presentation styles. Existing and unspecified products remain standard cards.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS card_style TEXT NOT NULL DEFAULT 'standard';

UPDATE public.products
SET card_style = 'standard'
WHERE card_style IS NULL OR card_style NOT IN ('standard', 'marketplace-list');

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_card_style_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_card_style_check
  CHECK (card_style IN ('standard', 'marketplace-list'));

CREATE OR REPLACE FUNCTION public.get_public_catalog_cards_bounded(
  p_destination TEXT,
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p.id,
    'name', p.name,
    'description', LEFT(COALESCE(p.description, ''), 320),
    'price', p.price,
    'currency', COALESCE(p.currency, 'GHS'),
    'category', p.category,
    'image_url', p.image_url,
    'video_urls', COALESCE(p.video_urls, ARRAY[]::TEXT[]),
    'stock_quantity', COALESCE(p.stock_quantity, 0),
    'low_stock_threshold', COALESCE(p.low_stock_threshold, 5),
    'status', p.status,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'business_id', p.business_id,
    'card_style', COALESCE(p.card_style, 'standard'),
    'brand', p.brand,
    'original_price', p.original_price,
    'delivery_fee_tamale', p.delivery_fee_tamale,
    'delivery_fee_greater_accra', p.delivery_fee_greater_accra,
    'delivery_fee_lesser_accra', p.delivery_fee_lesser_accra,
    'delivery_fee_dhl', p.delivery_fee_dhl,
    'delivery_fee_ups', p.delivery_fee_ups,
    'delivery_fee_fedex', p.delivery_fee_fedex
  )
  FROM public.products AS p
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT b.free_public_catalog
       FROM public.businesses b
       WHERE b.id = '00000000-0000-0000-0000-000000000001'),
      FALSE
    ) AS free_mode
  ) settings
  WHERE p.status = 'active'
    AND (p_business_id IS NULL OR p.business_id = p_business_id)
    AND (NULLIF(trim(COALESCE(p_category, '')), '') IS NULL OR p.category = trim(p_category))
    AND (
      NULLIF(trim(COALESCE(p_search, '')), '') IS NULL OR
      p.name ILIKE '%' || trim(p_search) || '%' OR
      COALESCE(p.description, '') ILIKE '%' || trim(p_search) || '%' OR
      COALESCE(p.category, '') ILIKE '%' || trim(p_search) || '%' OR
      COALESCE(p.brand, '') ILIKE '%' || trim(p_search) || '%'
    )
    AND (
      p_business_id IS NOT NULL
      OR settings.free_mode = TRUE
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

COMMENT ON COLUMN public.products.card_style IS 'Optional product card presentation: standard or marketplace-list.';
COMMENT ON FUNCTION public.get_public_catalog_cards_bounded(TEXT, TEXT, TEXT, UUID, INTEGER, INTEGER)
IS 'Egress-optimized public catalog projection for product cards, including the optional card style.';

NOTIFY pgrst, 'reload schema';

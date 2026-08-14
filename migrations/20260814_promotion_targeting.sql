-- Seller-selected promotion targeting and admin review workflow.
ALTER TABLE public.seller_promotions
  ADD COLUMN IF NOT EXISTS target_categories TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_regions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

ALTER TABLE public.seller_promotions
  DROP CONSTRAINT IF EXISTS seller_promotions_review_status_check;
ALTER TABLE public.seller_promotions
  ADD CONSTRAINT seller_promotions_review_status_check
  CHECK (review_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED'));

-- Existing active placements were already approved under the previous workflow.
UPDATE public.seller_promotions
SET review_status = 'APPROVED'
WHERE status = 'ACTIVE' AND review_status = 'PENDING_REVIEW';

CREATE INDEX IF NOT EXISTS seller_promotions_review_status_idx
  ON public.seller_promotions(review_status, status, ends_at);

DROP FUNCTION IF EXISTS public.get_active_promoted_products(INTEGER);
CREATE OR REPLACE FUNCTION public.get_active_promoted_products(
  p_limit INTEGER DEFAULT 12,
  p_category TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS SETOF public.seller_promotions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.*
  FROM public.seller_promotions sp
  JOIN public.products product ON product.id = sp.product_id
  JOIN public.businesses store ON store.id = sp.store_id
  WHERE sp.promotion_type = 'FEATURED_PRODUCT'
    AND sp.status = 'ACTIVE'
    AND sp.review_status = 'APPROVED'
    AND sp.starts_at <= timezone('utc', now())
    AND sp.ends_at > timezone('utc', now())
    AND product.status = 'active'
    AND (coalesce(array_length(sp.target_categories, 1), 0) = 0 OR product.category = ANY(sp.target_categories))
    AND (coalesce(array_length(sp.target_regions, 1), 0) = 0 OR coalesce(store.location, '') = ANY(sp.target_regions) OR coalesce(store.country_code, '') = ANY(sp.target_regions))
  ORDER BY sp.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

REVOKE ALL ON FUNCTION public.get_active_promoted_products(INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_promoted_products(INTEGER, TEXT, TEXT) TO anon, authenticated;

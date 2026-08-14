-- Secure public tracking for active seller promotions.
-- Clients can increment counters only through these functions; they cannot update promotion rows directly.

CREATE OR REPLACE FUNCTION public.record_promotion_impression(p_promotion_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.seller_promotions
  SET impressions_count = impressions_count + 1,
      updated_at = timezone('utc', now())
  WHERE id = p_promotion_id
    AND promotion_type = 'FEATURED_PRODUCT'
    AND status = 'ACTIVE'
    AND starts_at <= timezone('utc', now())
    AND ends_at > timezone('utc', now());

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_promotion_click(p_promotion_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.seller_promotions
  SET clicks_count = clicks_count + 1,
      updated_at = timezone('utc', now())
  WHERE id = p_promotion_id
    AND promotion_type = 'FEATURED_PRODUCT'
    AND status = 'ACTIVE'
    AND starts_at <= timezone('utc', now())
    AND ends_at > timezone('utc', now());

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_promotion_impression(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_promotion_impression(UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.record_promotion_click(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_promotion_click(UUID) TO anon, authenticated;

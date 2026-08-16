-- Save Home showcase settings and selected products atomically.
-- The function performs its own administrator check and avoids client-side
-- multi-step RLS failures leaving a partially saved showcase.

CREATE OR REPLACE FUNCTION public.save_home_showcase_settings(
  p_mode TEXT,
  p_showcase_enabled BOOLEAN,
  p_product_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_ids UUID[] := COALESCE(p_product_ids, ARRAY[]::UUID[]);
  v_saved_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Administrator authentication is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(replace(p.role, '-', '_')) IN ('admin', 'general_admin')
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required';
  END IF;

  IF p_mode NOT IN ('FREE', 'PAID') THEN
    RAISE EXCEPTION 'Invalid Home showcase mode';
  END IF;

  UPDATE public.home_showcase_settings
  SET mode = p_mode,
      showcase_enabled = COALESCE(p_showcase_enabled, TRUE),
      updated_at = timezone('utc', now()),
      updated_by = auth.uid()
  WHERE id = TRUE;

  IF NOT FOUND THEN
    INSERT INTO public.home_showcase_settings (id, mode, showcase_enabled, updated_at, updated_by)
    VALUES (TRUE, p_mode, COALESCE(p_showcase_enabled, TRUE), timezone('utc', now()), auth.uid());
  END IF;

  DELETE FROM public.home_showcase_items;

  IF cardinality(v_product_ids) > 0 THEN
    INSERT INTO public.home_showcase_items (product_id, sort_order, is_active)
    SELECT DISTINCT selected.product_id, selected.sort_order, TRUE
    FROM unnest(v_product_ids) WITH ORDINALITY AS selected(product_id, sort_order)
    JOIN public.products product ON product.id = selected.product_id
    WHERE product.status = 'active';

    GET DIAGNOSTICS v_saved_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'mode', p_mode,
    'showcase_enabled', COALESCE(p_showcase_enabled, TRUE),
    'saved_product_count', v_saved_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_home_showcase_settings(TEXT, BOOLEAN, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_home_showcase_settings(TEXT, BOOLEAN, UUID[]) TO authenticated;

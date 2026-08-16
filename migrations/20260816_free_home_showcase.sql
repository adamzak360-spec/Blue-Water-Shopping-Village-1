-- Free admin-curated Home showcase, independent of seller subscription promotions.
-- Paid mode continues to use seller_promotions through get_active_promoted_products().

CREATE TABLE IF NOT EXISTS public.home_showcase_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  mode TEXT NOT NULL DEFAULT 'PAID' CHECK (mode IN ('FREE', 'PAID')),
  showcase_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.home_showcase_settings (id, mode, showcase_enabled)
VALUES (TRUE, 'PAID', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.home_showcase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS home_showcase_items_active_order_idx
  ON public.home_showcase_items(is_active, sort_order, created_at);

ALTER TABLE public.home_showcase_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_showcase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read home showcase settings" ON public.home_showcase_settings;
CREATE POLICY "Public read home showcase settings"
  ON public.home_showcase_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage home showcase settings" ON public.home_showcase_settings;
CREATE POLICY "Admins manage home showcase settings"
  ON public.home_showcase_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Public read active home showcase items" ON public.home_showcase_items;
CREATE POLICY "Public read active home showcase items"
  ON public.home_showcase_items FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage home showcase items" ON public.home_showcase_items;
CREATE POLICY "Admins manage home showcase items"
  ON public.home_showcase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.get_home_showcase_config()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'mode', settings.mode,
    'showcase_enabled', settings.showcase_enabled,
    'product_ids', COALESCE((
      SELECT jsonb_agg(items.product_id ORDER BY items.sort_order, items.created_at)
      FROM public.home_showcase_items items
      WHERE items.is_active = TRUE
    ), '[]'::jsonb)
  )
  FROM public.home_showcase_settings settings
  WHERE settings.id = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_home_showcase_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_home_showcase_config() TO anon, authenticated;

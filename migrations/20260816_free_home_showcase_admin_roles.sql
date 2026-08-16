-- Allow both supported administrator roles to manage the free Home showcase.
-- This is intentionally limited to the existing showcase tables and does not change paid promotions.

DROP POLICY IF EXISTS "Admins manage home showcase settings" ON public.home_showcase_settings;
CREATE POLICY "Admins manage home showcase settings"
  ON public.home_showcase_settings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Admins manage home showcase items" ON public.home_showcase_items;
CREATE POLICY "Admins manage home showcase items"
  ON public.home_showcase_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'general_admin')
  ));

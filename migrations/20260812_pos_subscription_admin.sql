-- Secure, country-specific POS subscription pricing management.

ALTER TABLE public.pos_subscription_plans
  ADD CONSTRAINT pos_subscription_plans_country_code_key UNIQUE (country_code);

ALTER TABLE public.pos_subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view POS subscription plans" ON public.pos_subscription_plans;
CREATE POLICY "Public can view POS subscription plans"
  ON public.pos_subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert POS subscription plans"
  ON public.pos_subscription_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update POS subscription plans"
  ON public.pos_subscription_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete POS subscription plans"
  ON public.pos_subscription_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

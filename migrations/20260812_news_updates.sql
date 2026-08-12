-- Admin-managed public news updates
CREATE TABLE IF NOT EXISTS public.news_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT news_updates_date_range CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active news updates" ON public.news_updates;
CREATE POLICY "Anyone can view active news updates"
  ON public.news_updates
  FOR SELECT
  USING (
    is_active = true
    AND starts_at <= timezone('utc', now())
    AND (ends_at IS NULL OR ends_at >= timezone('utc', now()))
  );

DROP POLICY IF EXISTS "Admins can view all news updates" ON public.news_updates;
CREATE POLICY "Admins can view all news updates"
  ON public.news_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert news updates" ON public.news_updates;
CREATE POLICY "Admins can insert news updates"
  ON public.news_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update news updates" ON public.news_updates;
CREATE POLICY "Admins can update news updates"
  ON public.news_updates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete news updates" ON public.news_updates;
CREATE POLICY "Admins can delete news updates"
  ON public.news_updates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS news_updates_active_dates_idx
  ON public.news_updates (is_active, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.set_news_updates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_updates_set_updated_at ON public.news_updates;
CREATE TRIGGER news_updates_set_updated_at
  BEFORE UPDATE ON public.news_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_news_updates_updated_at();

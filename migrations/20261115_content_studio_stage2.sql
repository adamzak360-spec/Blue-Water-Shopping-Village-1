-- Reliable Content Studio Stage 2
-- Additive only: secure access control and durable project records.
-- No existing marketplace tables, policies, buckets, payments, or auth flows are modified.

CREATE TABLE IF NOT EXISTS public.content_studio_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.content_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '',
  project_type TEXT NOT NULL DEFAULT 'video' CHECK (project_type IN ('video', 'advertisement', 'graphic', 'voiceover')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'completed', 'archived')),
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '1:1', '4:5', '16:9')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS content_projects_owner_updated_idx
  ON public.content_projects (owner_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.content_studio_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_studio_access_updated_at ON public.content_studio_access;
CREATE TRIGGER content_studio_access_updated_at
  BEFORE UPDATE ON public.content_studio_access
  FOR EACH ROW EXECUTE FUNCTION public.content_studio_updated_at();

DROP TRIGGER IF EXISTS content_projects_updated_at ON public.content_projects;
CREATE TRIGGER content_projects_updated_at
  BEFORE UPDATE ON public.content_projects
  FOR EACH ROW EXECUTE FUNCTION public.content_studio_updated_at();

-- Access is intentionally limited to current admin profiles that have been
-- seeded below, or future explicitly granted active access rows.
CREATE OR REPLACE FUNCTION public.can_access_content_studio(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.content_studio_access a
      WHERE a.user_id = p_user_id
        AND a.active = TRUE
    ), FALSE
  );
$$;

ALTER FUNCTION public.can_access_content_studio(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_content_studio(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_content_studio(UUID) TO authenticated;

ALTER TABLE public.content_studio_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Content Studio users view their access" ON public.content_studio_access;
CREATE POLICY "Content Studio users view their access"
  ON public.content_studio_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND active = TRUE);

DROP POLICY IF EXISTS "Content Studio users view own projects" ON public.content_projects;
CREATE POLICY "Content Studio users view own projects"
  ON public.content_projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND public.can_access_content_studio());

DROP POLICY IF EXISTS "Content Studio users create own projects" ON public.content_projects;
CREATE POLICY "Content Studio users create own projects"
  ON public.content_projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_access_content_studio());

DROP POLICY IF EXISTS "Content Studio users update own projects" ON public.content_projects;
CREATE POLICY "Content Studio users update own projects"
  ON public.content_projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() AND public.can_access_content_studio())
  WITH CHECK (owner_id = auth.uid() AND public.can_access_content_studio());

DROP POLICY IF EXISTS "Content Studio users archive own projects" ON public.content_projects;
CREATE POLICY "Content Studio users archive own projects"
  ON public.content_projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() AND public.can_access_content_studio());

GRANT SELECT ON public.content_studio_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_projects TO authenticated;

-- Authorize currently existing admin profiles for the first rollout. Future
-- delegated access is represented explicitly by rows in content_studio_access.
INSERT INTO public.content_studio_access (user_id, access_level, active, granted_by)
SELECT p.id, 'owner', TRUE, p.id
FROM public.profiles p
WHERE p.role = 'admin'
ON CONFLICT (user_id) DO UPDATE
SET active = TRUE,
    access_level = CASE WHEN public.content_studio_access.access_level = 'owner' THEN 'owner' ELSE EXCLUDED.access_level END,
    updated_at = timezone('utc', now());

COMMENT ON TABLE public.content_studio_access IS 'Explicit administrator access for the private Reliable Content Studio.';
COMMENT ON TABLE public.content_projects IS 'Durable administrator-owned Content Studio projects.';

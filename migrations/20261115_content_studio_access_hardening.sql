-- Prevent authenticated callers from probing another user's Content Studio access.
CREATE OR REPLACE FUNCTION public.can_access_content_studio(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.content_studio_access a
      WHERE a.user_id = auth.uid()
        AND a.active = TRUE
    );
$$;
ALTER FUNCTION public.can_access_content_studio(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_access_content_studio(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_content_studio(UUID) TO authenticated;

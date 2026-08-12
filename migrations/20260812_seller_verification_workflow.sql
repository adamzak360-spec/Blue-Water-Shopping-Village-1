-- Reliable seller verification workflow: additive and auditable.
-- Existing seller submission fields and document storage remain intact.

ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'suspended';

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS public.business_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status public.verification_status NOT NULL,
  new_status public.verification_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS business_verification_events_business_idx
  ON public.business_verification_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS business_verification_events_seller_idx
  ON public.business_verification_events(seller_id, created_at DESC);

ALTER TABLE public.business_verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view verification events" ON public.business_verification_events;
CREATE POLICY "Admins view verification events" ON public.business_verification_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Sellers view own verification events" ON public.business_verification_events;
CREATE POLICY "Sellers view own verification events" ON public.business_verification_events
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.business_verification_events FROM authenticated;
GRANT SELECT ON public.business_verification_events TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_business_verification(
  p_business_id UUID,
  p_new_status public.verification_status,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_previous public.verification_status;
  v_admin UUID;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator authorization required';
  END IF;

  IF p_new_status NOT IN ('not_submitted', 'pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid verification status';
  END IF;

  IF p_new_status IN ('rejected', 'suspended') AND NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required for rejected or suspended status';
  END IF;

  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  v_previous := COALESCE(v_business.verification_status, 'not_submitted');

  PERFORM set_config('reliable.verification_review', '1', true);

  UPDATE public.businesses
  SET verification_status = p_new_status,
      rejection_reason = CASE
        WHEN p_new_status IN ('rejected', 'suspended') THEN NULLIF(trim(p_reason), '')
        ELSE NULL
      END,
      verified_at = CASE
        WHEN p_new_status = 'approved' THEN timezone('utc', now())
        ELSE NULL
      END,
      verified_by = CASE
        WHEN p_new_status = 'approved' THEN v_admin
        ELSE NULL
      END,
      verification_reviewed_at = timezone('utc', now()),
      verification_reviewed_by = v_admin,
      updated_at = timezone('utc', now())
  WHERE id = p_business_id;

  INSERT INTO public.business_verification_events(
    business_id, seller_id, admin_id, previous_status, new_status, reason
  )
  VALUES (
    p_business_id, v_business.owner_id, v_admin, v_previous, p_new_status,
    NULLIF(trim(p_reason), '')
  );

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'previous_status', v_previous,
    'new_status', p_new_status,
    'reviewed_by', v_admin,
    'reviewed_at', timezone('utc', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_business_verification(UUID, public.verification_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_business_verification(UUID, public.verification_status, TEXT) TO authenticated;

-- Prevent seller-side or ordinary client writes from setting a final verification state.
-- Seller submission to pending remains supported by the existing submission flow.
CREATE OR REPLACE FUNCTION public.guard_business_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'pending'
       AND auth.uid() = NEW.owner_id
       AND OLD.verification_status IN ('not_submitted', 'rejected') THEN
      RETURN NEW;
    END IF;

    IF current_setting('reliable.verification_review', true) = '1'
       AND public.is_admin() THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Verification status can only be changed through the authorized workflow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_business_verification_status_trigger ON public.businesses;
CREATE TRIGGER guard_business_verification_status_trigger
  BEFORE UPDATE OF verification_status ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_verification_status();

COMMENT ON TABLE public.business_verification_events IS
  'Append-only audit history for Reliable seller verification decisions.';
COMMENT ON FUNCTION public.admin_review_business_verification(UUID, public.verification_status, TEXT) IS
  'Server-authorized, auditable admin transition for seller verification status.';


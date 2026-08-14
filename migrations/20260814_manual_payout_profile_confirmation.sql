-- Require seller confirmation of the saved payout profile before manual payout completion.

ALTER TABLE public.seller_payout_profiles
  ADD COLUMN IF NOT EXISTS payout_profile_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_profile_confirmation_note TEXT;

DROP POLICY IF EXISTS "Admins view payout profiles for settlement" ON public.seller_payout_profiles;
CREATE POLICY "Admins view payout profiles for settlement" ON public.seller_payout_profiles
  FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.admin_mark_manual_payout_paid(
  p_payout_id UUID,
  p_method TEXT,
  p_reference TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
  v_profile public.seller_payout_profiles%ROWTYPE;
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF NULLIF(trim(COALESCE(p_reference, '')), '') IS NULL THEN RAISE EXCEPTION 'Payout reference is required'; END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF v_payout.payout_mode <> 'MANUAL' THEN RAISE EXCEPTION 'This payout is assigned to automated settlement'; END IF;
  IF v_payout.payout_status = 'PAID' THEN RETURN jsonb_build_object('payout_id', p_payout_id, 'payout_status', 'PAID', 'already_paid', TRUE); END IF;
  IF v_payout.payout_status NOT IN ('ELIGIBLE', 'QUEUED', 'FAILED') THEN RAISE EXCEPTION 'Payout is not ready for manual completion'; END IF;

  SELECT * INTO v_profile
  FROM public.seller_payout_profiles
  WHERE seller_id = v_payout.seller_id AND store_id = v_payout.store_id
  FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Seller payout profile is not active'; END IF;
  IF v_profile.payout_profile_confirmed_at IS NULL THEN RAISE EXCEPTION 'Seller must confirm payout details before manual settlement'; END IF;
  IF NULLIF(trim(COALESCE(v_profile.account_name, '')), '') IS NULL THEN RAISE EXCEPTION 'Seller payout profile has no account name'; END IF;
  IF NULLIF(trim(COALESCE(v_profile.account_number_last4, '')), '') IS NULL THEN RAISE EXCEPTION 'Seller payout profile has no masked account identifier'; END IF;

  UPDATE public.seller_payouts
  SET payout_status = 'PAID',
      paid_at = COALESCE(paid_at, timezone('utc', now())),
      manual_paid_at = COALESCE(manual_paid_at, timezone('utc', now())),
      manual_paid_by = auth.uid(),
      manual_payout_method = COALESCE(NULLIF(trim(COALESCE(p_method, '')), ''), v_profile.recipient_type),
      manual_payout_reference = trim(p_reference),
      manual_payout_notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      failure_reason = NULL,
      updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id;

  RETURN jsonb_build_object(
    'payout_id', p_payout_id,
    'payout_status', 'PAID',
    'payout_mode', 'MANUAL',
    'manual_payout_method', COALESCE(NULLIF(trim(COALESCE(p_method, '')), ''), v_profile.recipient_type),
    'manual_payout_reference', trim(p_reference)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) TO authenticated;

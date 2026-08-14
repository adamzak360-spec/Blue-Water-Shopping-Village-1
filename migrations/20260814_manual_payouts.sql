-- Reliable manual payouts for seller countries without an approved automated payout provider.
-- Ghana/Paystack automation remains unchanged.

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS payout_mode TEXT NOT NULL DEFAULT 'AUTOMATED'
    CHECK (payout_mode IN ('AUTOMATED', 'MANUAL')),
  ADD COLUMN IF NOT EXISTS manual_payout_method TEXT,
  ADD COLUMN IF NOT EXISTS manual_payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS manual_payout_notes TEXT,
  ADD COLUMN IF NOT EXISTS manual_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS seller_payouts_manual_queue_idx
  ON public.seller_payouts(payout_mode, payout_status, created_at)
  WHERE payout_mode = 'MANUAL';

CREATE OR REPLACE FUNCTION public.set_seller_payout_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_code TEXT;
  v_currency_code TEXT;
BEGIN
  SELECT country_code, currency_code
    INTO v_country_code, v_currency_code
  FROM public.businesses
  WHERE id = NEW.store_id;

  -- Only the currently verified Ghana Paystack settlement route is automated.
  -- Every other seller country is held for administrator-controlled manual payout.
  IF COALESCE(v_country_code, 'GH') = 'GH' AND COALESCE(v_currency_code, NEW.currency, 'GHS') = 'GHS' THEN
    NEW.payout_mode := 'AUTOMATED';
  ELSE
    NEW.payout_mode := 'MANUAL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_seller_payout_mode_before_insert ON public.seller_payouts;
CREATE TRIGGER set_seller_payout_mode_before_insert
  BEFORE INSERT ON public.seller_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seller_payout_mode();

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
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(COALESCE(p_method, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payout method is required';
  END IF;
  IF NULLIF(trim(COALESCE(p_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payout reference is required';
  END IF;

  SELECT * INTO v_payout
  FROM public.seller_payouts
  WHERE payout_id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF v_payout.payout_mode <> 'MANUAL' THEN
    RAISE EXCEPTION 'This payout is assigned to automated settlement';
  END IF;
  IF v_payout.payout_status = 'PAID' THEN
    RETURN jsonb_build_object('payout_id', p_payout_id, 'payout_status', 'PAID', 'already_paid', TRUE);
  END IF;
  IF v_payout.payout_status NOT IN ('ELIGIBLE', 'QUEUED', 'FAILED') THEN
    RAISE EXCEPTION 'Payout is not ready for manual completion';
  END IF;

  UPDATE public.seller_payouts
  SET payout_status = 'PAID',
      paid_at = COALESCE(paid_at, timezone('utc', now())),
      manual_paid_at = COALESCE(manual_paid_at, timezone('utc', now())),
      manual_paid_by = auth.uid(),
      manual_payout_method = trim(p_method),
      manual_payout_reference = trim(p_reference),
      manual_payout_notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      failure_reason = NULL,
      updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id;

  RETURN jsonb_build_object(
    'payout_id', p_payout_id,
    'payout_status', 'PAID',
    'payout_mode', 'MANUAL',
    'manual_payout_method', trim(p_method),
    'manual_payout_reference', trim(p_reference)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- The automated queue must never claim manual payouts, even if a manual profile
-- accidentally contains a recipient code.
CREATE OR REPLACE FUNCTION public.claim_eligible_payouts(p_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  payout_id UUID,
  order_id UUID,
  seller_id UUID,
  store_id UUID,
  seller_payout_amount_minor BIGINT,
  currency TEXT,
  recipient_code TEXT,
  paystack_transfer_reference TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT p.payout_id
    FROM public.seller_payouts p
    JOIN public.seller_payout_profiles sp ON sp.seller_id = p.seller_id AND sp.store_id = p.store_id
    WHERE p.payout_status = 'ELIGIBLE'
      AND p.payout_mode = 'AUTOMATED'
      AND COALESCE(sp.payment_provider, 'paystack') = 'paystack'
      AND sp.is_active = TRUE
      AND sp.recipient_code IS NOT NULL
    ORDER BY p.created_at
    FOR UPDATE OF p SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), updated AS (
    UPDATE public.seller_payouts p
    SET payout_status = 'QUEUED', queued_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM claimed c
    WHERE p.payout_id = c.payout_id
    RETURNING p.*
  )
  SELECT u.payout_id, u.order_id, u.seller_id, u.store_id, u.seller_payout_amount_minor, u.currency, sp.recipient_code, u.paystack_transfer_reference
  FROM updated u
  JOIN public.seller_payout_profiles sp ON sp.seller_id = u.seller_id AND sp.store_id = u.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_eligible_payouts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_eligible_payouts(INTEGER) TO service_role;

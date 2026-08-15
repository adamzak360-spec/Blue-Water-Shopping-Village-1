-- Reliable payout controls and controlled single-payout test support.
-- Additive only: no order, payment, or historical payout reset.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_hold_payout(
  p_payout_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
  v_reason TEXT := NULLIF(trim(COALESCE(p_reason, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(COALESCE(p.role, '')) IN ('admin', 'general_admin')
  ) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'A hold reason is required'; END IF;

  UPDATE public.seller_payouts
  SET payout_status = 'ON_HOLD', eligibility_status = 'HELD', failure_reason = v_reason, updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id AND payout_status IN ('HELD', 'ELIGIBLE', 'FAILED', 'RETRY_REQUIRED', 'PENDING_FUNDS', 'ON_HOLD');
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout cannot be held in its current state'; END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id;
  INSERT INTO public.seller_payout_events(payout_id, order_id, seller_id, store_id, event_type, triggered_by, status, details)
  VALUES (v_payout.payout_id, v_payout.order_id, v_payout.seller_id, v_payout.store_id, 'ADMIN_HOLD', auth.uid()::TEXT, v_payout.payout_status, jsonb_build_object('reason', v_reason));
  RETURN jsonb_build_object('payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_release_held_payout(
  p_payout_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(COALESCE(p.role, '')) IN ('admin', 'general_admin')
  ) THEN RAISE EXCEPTION 'Administrator access required'; END IF;

  UPDATE public.seller_payouts
  SET payout_status = 'ELIGIBLE', eligibility_status = 'ELIGIBLE', failure_reason = NULL, updated_at = timezone('utc', now()), eligible_at = COALESCE(eligible_at, timezone('utc', now()))
  WHERE payout_id = p_payout_id AND payout_status IN ('HELD', 'ON_HOLD');
  IF NOT FOUND THEN RAISE EXCEPTION 'Only held payouts can be released'; END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id;
  INSERT INTO public.seller_payout_events(payout_id, order_id, seller_id, store_id, event_type, triggered_by, status, details)
  VALUES (v_payout.payout_id, v_payout.order_id, v_payout.seller_id, v_payout.store_id, 'ADMIN_RELEASE', auth.uid()::TEXT, v_payout.payout_status, jsonb_build_object('reason', NULLIF(trim(COALESCE(p_reason, '')), '')));
  RETURN jsonb_build_object('payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_retry_failed_payout(
  p_payout_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(COALESCE(p.role, '')) IN ('admin', 'general_admin')
  ) THEN RAISE EXCEPTION 'Administrator access required'; END IF;

  UPDATE public.seller_payouts
  SET payout_status = 'ELIGIBLE', eligibility_status = 'ELIGIBLE', failure_reason = NULL, retry_count = retry_count + 1, updated_at = timezone('utc', now()), eligible_at = COALESCE(eligible_at, timezone('utc', now()))
  WHERE payout_id = p_payout_id AND payout_status IN ('FAILED', 'RETRY_REQUIRED', 'PENDING_FUNDS');
  IF NOT FOUND THEN RAISE EXCEPTION 'Only failed or retryable payouts can be retried'; END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id;
  INSERT INTO public.seller_payout_events(payout_id, order_id, seller_id, store_id, event_type, triggered_by, status, details)
  VALUES (v_payout.payout_id, v_payout.order_id, v_payout.seller_id, v_payout.store_id, 'ADMIN_RETRY', auth.uid()::TEXT, v_payout.payout_status, jsonb_build_object('reason', NULLIF(trim(COALESCE(p_reason, '')), ''), 'retry_count', v_payout.retry_count));
  RETURN jsonb_build_object('payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status, 'retry_count', v_payout.retry_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_single_eligible_payout(p_payout_id UUID)
RETURNS TABLE (
  payout_id UUID,
  order_id UUID,
  seller_id UUID,
  store_id UUID,
  customer_id UUID,
  gross_amount_minor BIGINT,
  commission_amount_minor BIGINT,
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
    WHERE p.payout_id = p_payout_id
      AND p.payout_status = 'ELIGIBLE'
      AND p.eligibility_status = 'ELIGIBLE'
      AND sp.is_active = TRUE
      AND sp.recipient_code IS NOT NULL
    FOR UPDATE OF p SKIP LOCKED
  ), updated AS (
    UPDATE public.seller_payouts p
    SET payout_status = 'QUEUED', queued_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM claimed c WHERE p.payout_id = c.payout_id RETURNING p.*
  )
  SELECT u.payout_id, u.order_id, u.seller_id, u.store_id, u.customer_id, u.gross_amount_minor, u.commission_amount_minor, u.seller_payout_amount_minor, u.currency, sp.recipient_code, u.paystack_transfer_reference
  FROM updated u JOIN public.seller_payout_profiles sp ON sp.seller_id = u.seller_id AND sp.store_id = u.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hold_payout(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_release_held_payout(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_retry_failed_payout(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_single_eligible_payout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_hold_payout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_held_payout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_retry_failed_payout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_single_eligible_payout(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

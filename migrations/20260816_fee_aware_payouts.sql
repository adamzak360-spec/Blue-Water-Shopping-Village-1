-- Fee-aware Paystack payout accounting.
-- Additive only: does not reset orders, payouts, wallets, or transfer state.
-- Fee source of truth: payout_fee_config, protected from public writes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payout_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider = 'paystack'),
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('mobile_money', 'bank')),
  fee_minor BIGINT NOT NULL CHECK (fee_minor >= 0),
  minimum_transfer_minor BIGINT NOT NULL DEFAULT 1 CHECK (minimum_transfer_minor > 0),
  source TEXT NOT NULL DEFAULT 'paystack_ghana_published_pricing',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, country_code, currency, payout_method)
);

INSERT INTO public.payout_fee_config(provider, country_code, currency, payout_method, fee_minor, minimum_transfer_minor, source)
VALUES
  ('paystack', 'GH', 'GHS', 'mobile_money', 100, 1, 'paystack_ghana_published_pricing'),
  ('paystack', 'GH', 'GHS', 'bank', 800, 1, 'paystack_ghana_published_pricing')
ON CONFLICT (provider, country_code, currency, payout_method) DO NOTHING;

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'GH',
  ADD COLUMN IF NOT EXISTS payout_method TEXT,
  ADD COLUMN IF NOT EXISTS payout_fee_minor BIGINT,
  ADD COLUMN IF NOT EXISTS seller_amount_sent_minor BIGINT,
  ADD COLUMN IF NOT EXISTS provider_total_debit_minor BIGINT,
  ADD COLUMN IF NOT EXISTS minimum_transfer_minor BIGINT,
  ADD COLUMN IF NOT EXISTS payout_fee_source TEXT;

ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS seller_payout_fee_non_negative_check,
  ADD CONSTRAINT seller_payout_fee_non_negative_check CHECK (payout_fee_minor IS NULL OR payout_fee_minor >= 0),
  DROP CONSTRAINT IF EXISTS seller_payout_sent_non_negative_check,
  ADD CONSTRAINT seller_payout_sent_non_negative_check CHECK (seller_amount_sent_minor IS NULL OR seller_amount_sent_minor >= 0),
  DROP CONSTRAINT IF EXISTS seller_payout_debit_non_negative_check,
  ADD CONSTRAINT seller_payout_debit_non_negative_check CHECK (provider_total_debit_minor IS NULL OR provider_total_debit_minor >= 0);

ALTER TABLE public.payout_fee_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view payout fee config" ON public.payout_fee_config;
CREATE POLICY "Admins view payout fee config" ON public.payout_fee_config
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(COALESCE(p.role, '')) IN ('admin', 'general_admin')));

CREATE OR REPLACE FUNCTION public.refresh_payout_fee_snapshot(p_payout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
  v_profile public.seller_payout_profiles%ROWTYPE;
  v_fee public.payout_fee_config%ROWTYPE;
  v_method TEXT;
  v_sent BIGINT;
  v_debit BIGINT;
  v_reason TEXT := NULL;
BEGIN
  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;

  SELECT * INTO v_profile
  FROM public.seller_payout_profiles
  WHERE seller_id = v_payout.seller_id AND store_id = v_payout.store_id;

  v_method := CASE
    WHEN v_profile.recipient_type = 'mobile_money' THEN 'mobile_money'
    WHEN v_profile.recipient_type = 'ghipss' THEN 'bank'
    ELSE NULL
  END;

  SELECT * INTO v_fee
  FROM public.payout_fee_config
  WHERE provider = 'paystack'
    AND country_code = COALESCE(v_profile.country_code, v_payout.country_code, 'GH')
    AND currency = v_payout.currency
    AND payout_method = v_method
    AND is_active = TRUE;

  IF v_method IS NULL OR v_fee.id IS NULL THEN
    UPDATE public.seller_payouts
    SET payout_method = v_method,
        payout_fee_minor = NULL,
        seller_amount_sent_minor = NULL,
        provider_total_debit_minor = NULL,
        minimum_transfer_minor = NULL,
        payout_fee_source = NULL,
        failure_reason = CASE WHEN payout_status IN ('ELIGIBLE', 'QUEUED') THEN 'Payout method or fee configuration is not verified; payout remains queued.' ELSE failure_reason END,
        updated_at = timezone('utc', now())
    WHERE payout_id = p_payout_id;
    RETURN jsonb_build_object('ready', false, 'reason', 'Payout method or fee configuration is not verified');
  END IF;

  v_sent := v_payout.seller_payout_amount_minor - v_fee.fee_minor;
  IF v_sent < v_fee.minimum_transfer_minor THEN
    v_reason := CASE
      WHEN v_payout.seller_payout_amount_minor < v_fee.fee_minor THEN 'Seller amount is insufficient to cover the applicable payout transfer fee.'
      ELSE 'Calculated seller transfer is below the provider minimum; payout remains queued.'
    END;
    UPDATE public.seller_payouts
    SET payout_method = v_method,
        payout_fee_minor = v_fee.fee_minor,
        seller_amount_sent_minor = 0,
        provider_total_debit_minor = NULL,
        minimum_transfer_minor = v_fee.minimum_transfer_minor,
        payout_fee_source = v_fee.source,
        payout_status = CASE WHEN payout_status IN ('ELIGIBLE', 'QUEUED') THEN 'ON_HOLD' ELSE payout_status END,
        eligibility_status = CASE WHEN payout_status IN ('ELIGIBLE', 'QUEUED') THEN 'HELD' ELSE eligibility_status END,
        failure_reason = v_reason,
        updated_at = timezone('utc', now())
    WHERE payout_id = p_payout_id;
    RETURN jsonb_build_object('ready', false, 'reason', v_reason, 'fee_minor', v_fee.fee_minor);
  END IF;

  v_debit := v_sent + v_fee.fee_minor;
  UPDATE public.seller_payouts
  SET payout_method = v_method,
      payout_fee_minor = v_fee.fee_minor,
      seller_amount_sent_minor = v_sent,
      provider_total_debit_minor = v_debit,
      minimum_transfer_minor = v_fee.minimum_transfer_minor,
      payout_fee_source = v_fee.source,
      updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id;
  RETURN jsonb_build_object('ready', true, 'payout_method', v_method, 'fee_minor', v_fee.fee_minor, 'seller_amount_sent_minor', v_sent, 'provider_total_debit_minor', v_debit);
END;
$$;

DROP FUNCTION IF EXISTS public.claim_eligible_payouts(INTEGER);
CREATE OR REPLACE FUNCTION public.claim_eligible_payouts(p_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  payout_id UUID, order_id UUID, seller_id UUID, store_id UUID, seller_payout_amount_minor BIGINT,
  payout_fee_minor BIGINT, seller_amount_sent_minor BIGINT, provider_total_debit_minor BIGINT,
  minimum_transfer_minor BIGINT, payout_method TEXT, country_code TEXT, currency TEXT,
  recipient_code TEXT, paystack_transfer_reference TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.seller_payouts p
  SET payout_status = 'ON_HOLD', eligibility_status = 'HELD', failure_reason = 'Payout method or fee configuration is not verified; payout remains queued.', updated_at = timezone('utc', now())
  WHERE p.payout_status = 'ELIGIBLE'
    AND NOT EXISTS (
      SELECT 1 FROM public.seller_payout_profiles sp
      JOIN public.payout_fee_config fc ON fc.provider = 'paystack' AND fc.country_code = COALESCE(sp.country_code, 'GH') AND fc.currency = p.currency
        AND fc.payout_method = CASE WHEN sp.recipient_type = 'mobile_money' THEN 'mobile_money' WHEN sp.recipient_type = 'ghipss' THEN 'bank' END AND fc.is_active
      WHERE sp.seller_id = p.seller_id AND sp.store_id = p.store_id AND sp.is_active AND sp.recipient_code IS NOT NULL
        AND p.seller_payout_amount_minor - fc.fee_minor >= fc.minimum_transfer_minor
    );

  RETURN QUERY
  WITH candidates AS (
    SELECT p.payout_id
    FROM public.seller_payouts p
    JOIN public.seller_payout_profiles sp ON sp.seller_id = p.seller_id AND sp.store_id = p.store_id
    JOIN public.payout_fee_config fc ON fc.provider = 'paystack' AND fc.country_code = COALESCE(sp.country_code, 'GH') AND fc.currency = p.currency
      AND fc.payout_method = CASE WHEN sp.recipient_type = 'mobile_money' THEN 'mobile_money' WHEN sp.recipient_type = 'ghipss' THEN 'bank' END AND fc.is_active
    WHERE p.payout_status = 'ELIGIBLE' AND sp.is_active AND sp.recipient_code IS NOT NULL
      AND p.seller_payout_amount_minor - fc.fee_minor >= fc.minimum_transfer_minor
    ORDER BY p.created_at FOR UPDATE OF p SKIP LOCKED LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), updated AS (
    UPDATE public.seller_payouts p
    SET payout_status = 'QUEUED', queued_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM candidates c WHERE p.payout_id = c.payout_id RETURNING p.*
  )
  SELECT u.payout_id, u.order_id, u.seller_id, u.store_id, u.seller_payout_amount_minor,
    u.payout_fee_minor, u.seller_amount_sent_minor, u.provider_total_debit_minor, u.minimum_transfer_minor,
    u.payout_method, u.country_code, u.currency, sp.recipient_code, u.paystack_transfer_reference
  FROM updated u JOIN public.seller_payout_profiles sp ON sp.seller_id = u.seller_id AND sp.store_id = u.store_id;
END;
$$;

DROP FUNCTION IF EXISTS public.claim_single_eligible_payout(UUID);
CREATE OR REPLACE FUNCTION public.claim_single_eligible_payout(p_payout_id UUID)
RETURNS TABLE (
  payout_id UUID, order_id UUID, seller_id UUID, store_id UUID, customer_id UUID, gross_amount_minor BIGINT,
  commission_amount_minor BIGINT, seller_payout_amount_minor BIGINT, payout_fee_minor BIGINT,
  seller_amount_sent_minor BIGINT, provider_total_debit_minor BIGINT, minimum_transfer_minor BIGINT,
  payout_method TEXT, country_code TEXT, currency TEXT, recipient_code TEXT, paystack_transfer_reference TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_payout_fee_snapshot(p_payout_id);
  RETURN QUERY
  WITH updated AS (
    UPDATE public.seller_payouts p
    SET payout_status = 'QUEUED', queued_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM public.seller_payout_profiles sp
    WHERE p.payout_id = p_payout_id AND p.payout_status = 'ELIGIBLE' AND p.eligibility_status = 'ELIGIBLE'
      AND sp.seller_id = p.seller_id AND sp.store_id = p.store_id AND sp.is_active AND sp.recipient_code IS NOT NULL
      AND p.seller_amount_sent_minor >= COALESCE(p.minimum_transfer_minor, 1)
    RETURNING p.*
  )
  SELECT u.payout_id, u.order_id, u.seller_id, u.store_id, u.customer_id, u.gross_amount_minor,
    u.commission_amount_minor, u.seller_payout_amount_minor, u.payout_fee_minor, u.seller_amount_sent_minor,
    u.provider_total_debit_minor, u.minimum_transfer_minor, u.payout_method, u.country_code, u.currency,
    sp.recipient_code, u.paystack_transfer_reference
  FROM updated u JOIN public.seller_payout_profiles sp ON sp.seller_id = u.seller_id AND sp.store_id = u.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_payout_fee_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_payout_fee_snapshot(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.claim_eligible_payouts(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_single_eligible_payout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_eligible_payouts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_single_eligible_payout(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Keep seller earnings allocation separate from the cash amount actually sent.
CREATE OR REPLACE FUNCTION public.sync_seller_wallet_ledger_from_payout()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_earning_status TEXT;
  v_payout_status TEXT;
  v_sent BIGINT := COALESCE(NEW.seller_amount_sent_minor, NEW.seller_payout_amount_minor);
  v_metadata JSONB := jsonb_build_object(
    'gross_amount_minor', NEW.gross_amount_minor,
    'commission_amount_minor', NEW.commission_amount_minor,
    'seller_amount_before_transfer_fee_minor', NEW.seller_payout_amount_minor,
    'payout_fee_minor', NEW.payout_fee_minor,
    'seller_amount_sent_minor', NEW.seller_amount_sent_minor,
    'provider_total_debit_minor', NEW.provider_total_debit_minor,
    'payout_method', NEW.payout_method,
    'currency', NEW.currency
  );
BEGIN
  v_earning_status := CASE WHEN NEW.eligibility_status = 'ELIGIBLE' THEN 'ELIGIBLE' ELSE 'PENDING' END;
  IF NEW.seller_payout_amount_minor <> 0 THEN
    INSERT INTO public.seller_wallet_ledger(seller_id, store_id, order_id, payout_id, transaction_type, amount_minor, status, reference, description, metadata)
    VALUES (NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'SALE_EARNING', NEW.seller_payout_amount_minor, v_earning_status,
      'earning:' || NEW.payout_id::text, 'Seller earnings recorded before provider transfer fee', v_metadata)
    ON CONFLICT (reference) DO UPDATE SET status = EXCLUDED.status, metadata = EXCLUDED.metadata;
  END IF;

  IF NEW.commission_amount_minor <> 0 THEN
    INSERT INTO public.seller_wallet_ledger(seller_id, store_id, order_id, payout_id, transaction_type, amount_minor, status, reference, description, metadata)
    VALUES (NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'COMMISSION', -NEW.commission_amount_minor, 'POSTED',
      'commission:' || NEW.payout_id::text, 'Reliable commission recorded separately from seller transfer fee', v_metadata)
    ON CONFLICT (reference) DO UPDATE SET metadata = EXCLUDED.metadata;
  END IF;

  v_payout_status := CASE NEW.payout_status WHEN 'PAID' THEN 'PAID' WHEN 'PROCESSING' THEN 'PROCESSING' WHEN 'FAILED' THEN 'FAILED' WHEN 'REVERSED' THEN 'REVERSED' ELSE NULL END;
  IF v_payout_status IS NOT NULL THEN
    INSERT INTO public.seller_wallet_ledger(seller_id, store_id, order_id, payout_id, transaction_type, amount_minor, status, reference, description, metadata)
    VALUES (NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'PAYOUT', -v_sent, v_payout_status,
      'payout:' || NEW.payout_id::text || ':' || lower(v_payout_status), 'Seller payout lifecycle event; amount is actual cash sent after fee',
      v_metadata || jsonb_build_object('paystack_transfer_reference', NEW.paystack_transfer_reference))
    ON CONFLICT (reference) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, status = EXCLUDED.status, metadata = EXCLUDED.metadata;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_wallet_ledger_payout_sync ON public.seller_payouts;
CREATE TRIGGER seller_wallet_ledger_payout_sync
  AFTER INSERT OR UPDATE OF eligibility_status, payout_status, paystack_transfer_reference, payout_fee_minor, seller_amount_sent_minor, provider_total_debit_minor
  ON public.seller_payouts FOR EACH ROW EXECUTE FUNCTION public.sync_seller_wallet_ledger_from_payout();

CREATE OR REPLACE FUNCTION public.get_seller_wallet_summary(p_seller_id UUID DEFAULT auth.uid())
RETURNS TABLE (pending_minor BIGINT, available_minor BIGINT, total_earnings_minor BIGINT, total_sales_minor BIGINT, commission_minor BIGINT, paid_out_minor BIGINT, adjustments_minor BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_seller_id IS DISTINCT FROM auth.uid() AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN RAISE EXCEPTION 'Not authorized to view this wallet'; END IF;
  RETURN QUERY SELECT
    COALESCE((SELECT SUM(p.seller_payout_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status IN ('HELD', 'QUEUED', 'PROCESSING')), 0)::BIGINT,
    COALESCE((SELECT SUM(p.seller_payout_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status = 'ELIGIBLE'), 0)::BIGINT,
    COALESCE((SELECT SUM(l.amount_minor) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'SALE_EARNING'), 0)::BIGINT,
    COALESCE((SELECT SUM(p.gross_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id), 0)::BIGINT,
    COALESCE((SELECT SUM(ABS(l.amount_minor)) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'COMMISSION'), 0)::BIGINT,
    COALESCE((SELECT SUM(COALESCE(p.seller_amount_sent_minor, p.seller_payout_amount_minor)) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status = 'PAID'), 0)::BIGINT,
    COALESCE((SELECT SUM(l.amount_minor) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'ADJUSTMENT'), 0)::BIGINT;
END;
$$;

UPDATE public.seller_wallet_ledger l
SET amount_minor = COALESCE(p.seller_amount_sent_minor, p.seller_payout_amount_minor),
    metadata = l.metadata || jsonb_build_object('seller_amount_before_transfer_fee_minor', p.seller_payout_amount_minor, 'payout_fee_minor', p.payout_fee_minor, 'seller_amount_sent_minor', p.seller_amount_sent_minor, 'provider_total_debit_minor', p.provider_total_debit_minor, 'payout_method', p.payout_method)
FROM public.seller_payouts p
WHERE l.payout_id = p.payout_id AND l.transaction_type = 'PAYOUT' AND p.seller_amount_sent_minor IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_mark_manual_payout_paid(
  p_payout_id UUID,
  p_method TEXT,
  p_reference TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout public.seller_payouts%ROWTYPE;
  v_profile public.seller_payout_profiles%ROWTYPE;
  v_snapshot JSONB;
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF lower(COALESCE(v_admin_role, '')) NOT IN ('admin', 'general_admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF NULLIF(trim(COALESCE(p_reference, '')), '') IS NULL THEN RAISE EXCEPTION 'Payout reference is required'; END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF v_payout.payout_mode <> 'MANUAL' THEN RAISE EXCEPTION 'This payout is assigned to automated settlement'; END IF;
  IF v_payout.payout_status = 'PAID' THEN RETURN jsonb_build_object('payout_id', p_payout_id, 'payout_status', 'PAID', 'already_paid', TRUE); END IF;
  IF v_payout.payout_status NOT IN ('ELIGIBLE', 'QUEUED', 'FAILED') THEN RAISE EXCEPTION 'Payout is not ready for manual completion'; END IF;

  SELECT * INTO v_profile FROM public.seller_payout_profiles WHERE seller_id = v_payout.seller_id AND store_id = v_payout.store_id FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Seller payout profile is not active'; END IF;
  IF v_profile.payout_profile_confirmed_at IS NULL THEN RAISE EXCEPTION 'Seller must confirm payout details before manual settlement'; END IF;
  IF NULLIF(trim(COALESCE(v_profile.account_name, '')), '') IS NULL THEN RAISE EXCEPTION 'Seller payout profile has no account name'; END IF;
  IF NULLIF(trim(COALESCE(v_profile.account_number_last4, '')), '') IS NULL THEN RAISE EXCEPTION 'Seller payout profile has no masked account identifier'; END IF;

  v_snapshot := public.refresh_payout_fee_snapshot(p_payout_id);
  IF COALESCE((v_snapshot ->> 'ready')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION '%', COALESCE(v_snapshot ->> 'reason', 'Fee-aware payout calculation is not ready');
  END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE payout_id = p_payout_id FOR UPDATE;
  UPDATE public.seller_payouts
  SET payout_status = 'PAID',
      paid_at = COALESCE(paid_at, timezone('utc', now())),
      manual_paid_at = COALESCE(manual_paid_at, timezone('utc', now())),
      manual_paid_by = auth.uid(),
      manual_payout_method = COALESCE(NULLIF(trim(COALESCE(p_method, '')), ''), payout_method),
      manual_payout_reference = trim(p_reference),
      manual_payout_notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      failure_reason = NULL,
      updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id;

  RETURN jsonb_build_object('payout_id', p_payout_id, 'payout_status', 'PAID', 'payout_mode', 'MANUAL', 'manual_payout_reference', trim(p_reference), 'seller_amount_sent_minor', v_payout.seller_amount_sent_minor, 'provider_total_debit_minor', v_payout.provider_total_debit_minor);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_manual_payout_paid(UUID, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;

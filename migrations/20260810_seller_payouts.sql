-- Reliable seller payouts: additive migration only.
-- Customer payments and existing order status remain unchanged.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS commission_bps INTEGER NOT NULL DEFAULT 0
    CHECK (commission_bps >= 0 AND commission_bps <= 10000);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_delivery_confirmation TEXT
    CHECK (customer_delivery_confirmation IN ('PENDING', 'CONFIRMED', 'NOT_RECEIVED', 'DISPUTED')),
  ADD COLUMN IF NOT EXISTS customer_delivery_confirmation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_delivery_confirmation_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_delivery_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_delivery_confirmation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_delivery_confirmation_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_delivery_confirmation_notes TEXT;

UPDATE public.orders
SET customer_delivery_confirmation = CASE
  WHEN status = 'delivered' THEN COALESCE(customer_delivery_confirmation, 'PENDING')
  ELSE COALESCE(customer_delivery_confirmation, 'PENDING')
END
WHERE customer_delivery_confirmation IS NULL;

CREATE TABLE IF NOT EXISTS public.seller_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('ghipss', 'mobile_money')),
  recipient_code TEXT,
  account_name TEXT,
  account_number_last4 TEXT,
  bank_code TEXT,
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (seller_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gross_amount_minor BIGINT NOT NULL CHECK (gross_amount_minor >= 0),
  commission_amount_minor BIGINT NOT NULL CHECK (commission_amount_minor >= 0),
  seller_payout_amount_minor BIGINT NOT NULL CHECK (seller_payout_amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  eligibility_status TEXT NOT NULL DEFAULT 'HELD' CHECK (eligibility_status IN ('HELD', 'ELIGIBLE')),
  payout_status TEXT NOT NULL DEFAULT 'HELD' CHECK (payout_status IN ('HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED')),
  eligible_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  processing_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  paystack_transfer_reference TEXT,
  paystack_transfer_code TEXT,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (order_id),
  UNIQUE (paystack_transfer_reference)
);

CREATE INDEX IF NOT EXISTS seller_payouts_status_idx ON public.seller_payouts(payout_status, created_at);
CREATE INDEX IF NOT EXISTS seller_payouts_seller_idx ON public.seller_payouts(seller_id, created_at);
CREATE INDEX IF NOT EXISTS seller_payouts_store_idx ON public.seller_payouts(store_id, created_at);

CREATE TABLE IF NOT EXISTS public.delivery_confirmation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('CONFIRMED', 'NOT_RECEIVED', 'DISPUTED', 'ADMIN_CONFIRMED')),
  previous_delivery_state TEXT,
  new_delivery_state TEXT NOT NULL,
  confirmation_source TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (order_id, actor_id, response)
);

CREATE TABLE IF NOT EXISTS public.payout_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  transfer_reference TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.seller_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own payout profile" ON public.seller_payout_profiles;
CREATE POLICY "Sellers manage own payout profile" ON public.seller_payout_profiles
  FOR ALL TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers and admins view payouts" ON public.seller_payouts;
CREATE POLICY "Sellers and admins view payouts" ON public.seller_payouts
  FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Sellers and admins view confirmation events" ON public.delivery_confirmation_events;
CREATE POLICY "Sellers and admins view confirmation events" ON public.delivery_confirmation_events
  FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.confirm_order_delivery(
  p_order_id UUID,
  p_response TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_store public.businesses%ROWTYPE;
  v_payout public.seller_payouts%ROWTYPE;
  v_commission BIGINT;
  v_gross BIGINT;
  v_seller BIGINT;
  v_existing TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_response NOT IN ('CONFIRMED', 'NOT_RECEIVED') THEN RAISE EXCEPTION 'Invalid confirmation response'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order does not belong to the authenticated customer'; END IF;
  IF v_order.status <> 'delivered' THEN RAISE EXCEPTION 'Order must be marked delivered first'; END IF;
  IF v_order.status = 'cancelled' THEN RAISE EXCEPTION 'Cancelled orders cannot be confirmed'; END IF;

  v_existing := COALESCE(v_order.customer_delivery_confirmation, 'PENDING');
  IF v_existing IN ('CONFIRMED', 'NOT_RECEIVED', 'DISPUTED') THEN
    SELECT * INTO v_payout FROM public.seller_payouts WHERE order_id = p_order_id;
    RETURN jsonb_build_object('order_id', p_order_id, 'confirmation', v_existing, 'payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status);
  END IF;

  SELECT * INTO v_store FROM public.businesses WHERE id = v_order.business_id;
  IF NOT FOUND OR v_store.owner_id IS NULL THEN RAISE EXCEPTION 'Seller store is not configured'; END IF;

  INSERT INTO public.delivery_confirmation_events(order_id, customer_id, seller_id, store_id, actor_id, actor_role, response, previous_delivery_state, new_delivery_state, confirmation_source, reason)
  VALUES (p_order_id, v_order.user_id, v_store.owner_id, v_order.business_id, auth.uid(), 'customer', p_response, v_existing, p_response, 'customer_order_details', p_reason);

  UPDATE public.orders SET
    customer_delivery_confirmation = p_response,
    customer_delivery_confirmation_at = timezone('utc', now()),
    customer_delivery_confirmation_reason = p_reason
  WHERE id = p_order_id;

  IF p_response = 'NOT_RECEIVED' THEN
    v_gross := ROUND(COALESCE(v_order.total, 0) * 100);
    v_commission := ROUND(v_gross * v_store.commission_bps / 10000.0);
    v_seller := v_gross - v_commission;
    INSERT INTO public.seller_payouts(order_id, seller_id, store_id, customer_id, gross_amount_minor, commission_amount_minor, seller_payout_amount_minor, eligibility_status, payout_status)
    VALUES (p_order_id, v_store.owner_id, v_order.business_id, v_order.user_id, v_gross, v_commission, v_seller, 'HELD', 'HELD')
    ON CONFLICT (order_id) DO NOTHING;
  ELSE
    v_gross := ROUND(COALESCE(v_order.total, 0) * 100);
    v_commission := ROUND(v_gross * v_store.commission_bps / 10000.0);
    v_seller := v_gross - v_commission;
    IF v_seller < 0 THEN RAISE EXCEPTION 'Invalid commission configuration'; END IF;

    INSERT INTO public.seller_payouts(order_id, seller_id, store_id, customer_id, gross_amount_minor, commission_amount_minor, seller_payout_amount_minor, eligibility_status, payout_status, eligible_at)
    VALUES (p_order_id, v_store.owner_id, v_order.business_id, v_order.user_id, v_gross, v_commission, v_seller, 'ELIGIBLE', 'ELIGIBLE', timezone('utc', now()))
    ON CONFLICT (order_id) DO UPDATE SET
      eligibility_status = CASE WHEN seller_payouts.payout_status IN ('PAID', 'PROCESSING') THEN seller_payouts.eligibility_status ELSE 'ELIGIBLE' END,
      payout_status = CASE WHEN seller_payouts.payout_status IN ('PAID', 'PROCESSING') THEN seller_payouts.payout_status ELSE 'ELIGIBLE' END,
      eligible_at = COALESCE(seller_payouts.eligible_at, timezone('utc', now())),
      updated_at = timezone('utc', now());
  END IF;

  SELECT * INTO v_payout FROM public.seller_payouts WHERE order_id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'confirmation', p_response, 'payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_delivery(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_delivery(UUID, TEXT, TEXT) TO authenticated;


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

CREATE OR REPLACE FUNCTION public.mark_payout_processing(p_payout_id UUID, p_reference TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.seller_payouts
  SET payout_status = 'PROCESSING', processing_at = timezone('utc', now()), paystack_transfer_reference = p_reference, updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id AND payout_status = 'QUEUED' AND paystack_transfer_reference IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payout_to_queued(p_payout_id UUID, p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.seller_payouts
  SET payout_status = 'QUEUED', failure_reason = p_reason, updated_at = timezone('utc', now())
  WHERE payout_id = p_payout_id AND payout_status IN ('QUEUED', 'PROCESSING');
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payout_transfer_event(
  p_event_key TEXT,
  p_event_name TEXT,
  p_transfer_reference TEXT,
  p_payload JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO public.payout_webhook_events(event_key, event_name, transfer_reference, payload)
  VALUES (p_event_key, p_event_name, p_transfer_reference, p_payload)
  ON CONFLICT (event_key) DO NOTHING;
  IF NOT FOUND THEN RETURN TRUE; END IF;

  IF p_event_name = 'transfer.success' THEN
    UPDATE public.seller_payouts
    SET payout_status = 'PAID', paid_at = COALESCE(paid_at, timezone('utc', now())), updated_at = timezone('utc', now()), failure_reason = NULL
    WHERE paystack_transfer_reference = p_transfer_reference AND payout_status IN ('PROCESSING', 'QUEUED');
  ELSIF p_event_name = 'transfer.failed' THEN
    UPDATE public.seller_payouts
    SET payout_status = 'FAILED', failed_at = timezone('utc', now()), failure_reason = COALESCE(p_payload->>'message', p_payload->>'reason', 'Paystack transfer failed'), updated_at = timezone('utc', now())
    WHERE paystack_transfer_reference = p_transfer_reference AND payout_status IN ('PROCESSING', 'QUEUED');
  ELSIF p_event_name = 'transfer.reversed' THEN
    UPDATE public.seller_payouts
    SET payout_status = 'REVERSED', reversed_at = timezone('utc', now()), failure_reason = COALESCE(p_payload->>'message', p_payload->>'reason', 'Paystack transfer reversed'), updated_at = timezone('utc', now())
    WHERE paystack_transfer_reference = p_transfer_reference AND payout_status IN ('PROCESSING', 'PAID');
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_eligible_payouts(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_payout_processing(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_payout_to_queued(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_payout_transfer_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_eligible_payouts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_payout_processing(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payout_to_queued(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payout_transfer_event(TEXT, TEXT, TEXT, JSONB) TO service_role;


CREATE OR REPLACE FUNCTION public.admin_confirm_order_delivery(p_order_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_store public.businesses%ROWTYPE;
  v_payout public.seller_payouts%ROWTYPE;
  v_gross BIGINT;
  v_commission BIGINT;
  v_seller BIGINT;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'delivered' THEN RAISE EXCEPTION 'Delivered order not found'; END IF;
  SELECT * INTO v_store FROM public.businesses WHERE id = v_order.business_id;
  IF NOT FOUND OR v_store.owner_id IS NULL THEN RAISE EXCEPTION 'Seller store is not configured'; END IF;

  INSERT INTO public.delivery_confirmation_events(order_id, customer_id, seller_id, store_id, actor_id, actor_role, response, previous_delivery_state, new_delivery_state, confirmation_source, reason)
  VALUES (p_order_id, v_order.user_id, v_store.owner_id, v_order.business_id, auth.uid(), 'admin', 'ADMIN_CONFIRMED', COALESCE(v_order.customer_delivery_confirmation, 'PENDING'), 'ADMIN_CONFIRMED', 'admin_payout_dashboard', p_notes)
  ON CONFLICT (order_id, actor_id, response) DO NOTHING;

  UPDATE public.orders SET admin_delivery_confirmation = TRUE, admin_delivery_confirmation_at = timezone('utc', now()), admin_delivery_confirmation_by = auth.uid(), admin_delivery_confirmation_notes = p_notes WHERE id = p_order_id;

  v_gross := ROUND(COALESCE(v_order.total, 0) * 100);
  v_commission := ROUND(v_gross * v_store.commission_bps / 10000.0);
  v_seller := v_gross - v_commission;
  INSERT INTO public.seller_payouts(order_id, seller_id, store_id, customer_id, gross_amount_minor, commission_amount_minor, seller_payout_amount_minor, eligibility_status, payout_status, eligible_at)
  VALUES (p_order_id, v_store.owner_id, v_order.business_id, v_order.user_id, v_gross, v_commission, v_seller, 'ELIGIBLE', 'ELIGIBLE', timezone('utc', now()))
  ON CONFLICT (order_id) DO UPDATE SET
    eligibility_status = CASE WHEN seller_payouts.payout_status IN ('PAID', 'PROCESSING') THEN seller_payouts.eligibility_status ELSE 'ELIGIBLE' END,
    payout_status = CASE WHEN seller_payouts.payout_status IN ('PAID', 'PROCESSING') THEN seller_payouts.payout_status ELSE 'ELIGIBLE' END,
    eligible_at = COALESCE(seller_payouts.eligible_at, timezone('utc', now())), updated_at = timezone('utc', now());

  SELECT * INTO v_payout FROM public.seller_payouts WHERE order_id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'admin_confirmed', TRUE, 'payout_id', v_payout.payout_id, 'payout_status', v_payout.payout_status);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_confirm_order_delivery(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order_delivery(UUID, TEXT) TO authenticated;

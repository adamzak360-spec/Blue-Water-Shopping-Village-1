-- Phase 8: Global Seller Payout Setup

-- 1. Relax constraints on seller_payout_profiles
ALTER TABLE public.seller_payout_profiles DROP CONSTRAINT IF EXISTS seller_payout_profiles_currency_check;
ALTER TABLE public.seller_payout_profiles DROP CONSTRAINT IF EXISTS seller_payout_profiles_recipient_type_check;

-- Add international payout fields
ALTER TABLE public.seller_payout_profiles ADD COLUMN IF NOT EXISTS swift_code TEXT;
ALTER TABLE public.seller_payout_profiles ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.seller_payout_profiles ADD COLUMN IF NOT EXISTS routing_number TEXT;
ALTER TABLE public.seller_payout_profiles ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code);

-- 2. Relax constraints on seller_payouts
ALTER TABLE public.seller_payouts DROP CONSTRAINT IF EXISTS seller_payouts_currency_check;

-- 3. Update confirm_order_delivery function to handle dynamic currency
-- We'll use the currency from the order instead of hardcoded 'GHS'
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

  -- Calculate payout with order's currency
  v_gross := ROUND(COALESCE(v_order.total, 0) * 100);
  v_commission := ROUND(v_gross * v_store.commission_bps / 10000.0);
  v_seller := v_gross - v_commission;

  IF p_response = 'NOT_RECEIVED' THEN
    INSERT INTO public.seller_payouts(order_id, seller_id, store_id, customer_id, gross_amount_minor, commission_amount_minor, seller_payout_amount_minor, currency, eligibility_status, payout_status)
    VALUES (p_order_id, v_store.owner_id, v_order.business_id, v_order.user_id, v_gross, v_commission, v_seller, v_order.currency, 'HELD', 'HELD')
    ON CONFLICT (order_id) DO NOTHING;
  ELSE
    IF v_seller < 0 THEN RAISE EXCEPTION 'Invalid commission configuration'; END IF;

    INSERT INTO public.seller_payouts(order_id, seller_id, store_id, customer_id, gross_amount_minor, commission_amount_minor, seller_payout_amount_minor, currency, eligibility_status, payout_status, eligible_at)
    VALUES (p_order_id, v_store.owner_id, v_order.business_id, v_order.user_id, v_gross, v_commission, v_seller, v_order.currency, 'ELIGIBLE', 'ELIGIBLE', timezone('utc', now()))
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

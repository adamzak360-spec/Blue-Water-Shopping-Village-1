-- Paystack seller payout routing. Only explicitly enabled provider capabilities
-- may enter the automated transfer queue; all others remain manual.

INSERT INTO public.payment_provider_capabilities
  (provider, country_code, currency_code, checkout_enabled, split_payment_enabled, payout_enabled, sandbox_enabled, notes)
VALUES
  ('paystack', 'GH', 'GHS', TRUE, FALSE, TRUE, TRUE, 'Verified current Reliable Paystack settlement route.'),
  ('paystack', 'NG', 'NGN', FALSE, FALSE, FALSE, TRUE, 'Requires separate Paystack account approval and settlement capability.'),
  ('paystack', 'KE', 'KES', FALSE, FALSE, FALSE, TRUE, 'Requires separate Paystack account approval and settlement capability.')
ON CONFLICT (provider, country_code, currency_code) DO UPDATE SET
  checkout_enabled = EXCLUDED.checkout_enabled,
  payout_enabled = EXCLUDED.payout_enabled,
  notes = EXCLUDED.notes,
  updated_at = timezone('utc', now());

CREATE OR REPLACE FUNCTION public.set_seller_payout_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_code TEXT;
  v_currency_code TEXT;
  v_enabled BOOLEAN;
BEGIN
  SELECT country_code, currency_code INTO v_country_code, v_currency_code
  FROM public.businesses WHERE id = NEW.store_id;

  SELECT payout_enabled INTO v_enabled
  FROM public.payment_provider_capabilities
  WHERE provider = 'paystack'
    AND country_code = COALESCE(v_country_code, 'GH')
    AND currency_code = COALESCE(v_currency_code, NEW.currency, 'GHS');

  IF COALESCE(v_enabled, FALSE) AND COALESCE(NEW.payment_provider, 'paystack') = 'paystack' THEN
    NEW.payout_mode := 'AUTOMATED';
    NEW.payment_provider := 'paystack';
  ELSE
    NEW.payout_mode := 'MANUAL';
    NEW.payment_provider := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_seller_payout_mode_before_insert ON public.seller_payouts;
CREATE TRIGGER set_seller_payout_mode_before_insert
  BEFORE INSERT ON public.seller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_payout_mode();

-- Existing eligible payouts are recalculated only if they have not started or
-- completed settlement. Paid/processing records are never rewritten.
UPDATE public.seller_payouts p
SET payout_mode = CASE WHEN COALESCE(c.payout_enabled, FALSE) THEN 'AUTOMATED' ELSE 'MANUAL' END,
    payment_provider = CASE WHEN COALESCE(c.payout_enabled, FALSE) THEN 'paystack' ELSE NULL END,
    updated_at = timezone('utc', now())
FROM public.businesses b, public.payment_provider_capabilities c
WHERE p.store_id = b.id
  AND c.provider = 'paystack'
  AND c.country_code = b.country_code
  AND c.currency_code = p.currency
  AND p.payout_status IN ('HELD', 'ELIGIBLE', 'QUEUED')
  AND p.payout_mode IS DISTINCT FROM CASE WHEN COALESCE(c.payout_enabled, FALSE) THEN 'AUTOMATED' ELSE 'MANUAL' END;

CREATE OR REPLACE FUNCTION public.claim_eligible_payouts(p_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  payout_id UUID, order_id UUID, seller_id UUID, store_id UUID,
  seller_payout_amount_minor BIGINT, currency TEXT, recipient_code TEXT,
  paystack_transfer_reference TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT p.payout_id
    FROM public.seller_payouts p
    JOIN public.seller_payout_profiles sp ON sp.seller_id = p.seller_id AND sp.store_id = p.store_id
    JOIN public.businesses b ON b.id = p.store_id
    JOIN public.payment_provider_capabilities pc
      ON pc.provider = 'paystack'
     AND pc.country_code = b.country_code
     AND pc.currency_code = p.currency
     AND pc.payout_enabled = TRUE
    WHERE p.payout_status = 'ELIGIBLE'
      AND p.payout_mode = 'AUTOMATED'
      AND p.payment_provider = 'paystack'
      AND sp.payment_provider = 'paystack'
      AND sp.provider_onboarding_status = 'ACTIVE'
      AND sp.is_active = TRUE
      AND sp.recipient_code IS NOT NULL
    ORDER BY p.created_at
    FOR UPDATE OF p SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), updated AS (
    UPDATE public.seller_payouts p
    SET payout_status = 'QUEUED', queued_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM claimed c WHERE p.payout_id = c.payout_id RETURNING p.*
  )
  SELECT u.payout_id, u.order_id, u.seller_id, u.store_id, u.seller_payout_amount_minor,
         u.currency, sp.recipient_code, u.paystack_transfer_reference
  FROM updated u
  JOIN public.seller_payout_profiles sp ON sp.seller_id = u.seller_id AND sp.store_id = u.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_eligible_payouts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_eligible_payouts(INTEGER) TO service_role;

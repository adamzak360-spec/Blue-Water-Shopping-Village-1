-- Reliable seller wallet ledger: additive accounting layer around seller_payouts.
-- This migration does not release funds or change Paystack payout behavior.

CREATE TABLE IF NOT EXISTS public.seller_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  store_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payout_id UUID REFERENCES public.seller_payouts(payout_id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SALE_EARNING', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT', 'REVERSAL')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ELIGIBLE', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED', 'REFUNDED', 'POSTED')),
  reference TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS seller_wallet_ledger_seller_idx ON public.seller_wallet_ledger(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_wallet_ledger_order_idx ON public.seller_wallet_ledger(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_wallet_ledger_payout_idx ON public.seller_wallet_ledger(payout_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_wallet_ledger_type_status_idx ON public.seller_wallet_ledger(transaction_type, status, created_at DESC);

ALTER TABLE public.seller_wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers and admins view wallet ledger" ON public.seller_wallet_ledger;
CREATE POLICY "Sellers and admins view wallet ledger" ON public.seller_wallet_ledger
  FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.record_seller_wallet_adjustment(
  p_seller_id UUID,
  p_store_id UUID,
  p_amount_minor BIGINT,
  p_reason TEXT,
  p_reference TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF p_amount_minor = 0 OR NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Adjustment amount and reason are required';
  END IF;

  INSERT INTO public.seller_wallet_ledger(
    seller_id, store_id, transaction_type, amount_minor, status, reference,
    description, metadata, created_by
  ) VALUES (
    p_seller_id, p_store_id, 'ADJUSTMENT', p_amount_minor, 'POSTED',
    COALESCE(NULLIF(trim(p_reference), ''), 'adjustment:' || gen_random_uuid()::text),
    trim(p_reason), jsonb_build_object('source', 'admin_adjustment'), auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_seller_wallet_adjustment(UUID, UUID, BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_seller_wallet_adjustment(UUID, UUID, BIGINT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_seller_wallet_ledger_from_payout()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_earning_status TEXT;
  v_payout_status TEXT;
BEGIN
  v_earning_status := CASE WHEN NEW.eligibility_status = 'ELIGIBLE' THEN 'ELIGIBLE' ELSE 'PENDING' END;
  IF NEW.seller_payout_amount_minor <> 0 THEN
    INSERT INTO public.seller_wallet_ledger(
      seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
      status, reference, description, metadata
    ) VALUES (
      NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'SALE_EARNING',
      NEW.seller_payout_amount_minor, v_earning_status,
      'earning:' || NEW.payout_id::text,
      'Seller earnings recorded from order payout calculation',
      jsonb_build_object('gross_amount_minor', NEW.gross_amount_minor, 'commission_amount_minor', NEW.commission_amount_minor)
    ) ON CONFLICT (reference) DO UPDATE SET
      status = EXCLUDED.status,
      metadata = EXCLUDED.metadata;
  END IF;

  IF NEW.commission_amount_minor <> 0 THEN
    INSERT INTO public.seller_wallet_ledger(
      seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
      status, reference, description, metadata
    ) VALUES (
      NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'COMMISSION',
      -NEW.commission_amount_minor, 'POSTED',
      'commission:' || NEW.payout_id::text,
      'Reliable commission recorded for order payout calculation',
      jsonb_build_object('gross_amount_minor', NEW.gross_amount_minor)
    ) ON CONFLICT (reference) DO NOTHING;
  END IF;

  v_payout_status := CASE NEW.payout_status
    WHEN 'PAID' THEN 'PAID'
    WHEN 'PROCESSING' THEN 'PROCESSING'
    WHEN 'FAILED' THEN 'FAILED'
    WHEN 'REVERSED' THEN 'REVERSED'
    ELSE NULL
  END;
  IF v_payout_status IS NOT NULL THEN
    INSERT INTO public.seller_wallet_ledger(
      seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
      status, reference, description, metadata
    ) VALUES (
      NEW.seller_id, NEW.store_id, NEW.order_id, NEW.payout_id, 'PAYOUT',
      -NEW.seller_payout_amount_minor, v_payout_status,
      'payout:' || NEW.payout_id::text || ':' || lower(v_payout_status),
      'Seller payout lifecycle event; paid status is written only by verified transfer processing',
      jsonb_build_object('paystack_transfer_reference', NEW.paystack_transfer_reference)
    ) ON CONFLICT (reference) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_wallet_ledger_payout_sync ON public.seller_payouts;
CREATE TRIGGER seller_wallet_ledger_payout_sync
  AFTER INSERT OR UPDATE OF eligibility_status, payout_status, paystack_transfer_reference ON public.seller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.sync_seller_wallet_ledger_from_payout();

INSERT INTO public.seller_wallet_ledger(
  seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
  status, reference, description, metadata
)
SELECT
  p.seller_id, p.store_id, p.order_id, p.payout_id, 'SALE_EARNING',
  p.seller_payout_amount_minor,
  CASE WHEN p.eligibility_status = 'ELIGIBLE' THEN 'ELIGIBLE' ELSE 'PENDING' END,
  'earning:' || p.payout_id::text,
  'Seller earnings recorded from existing order payout calculation',
  jsonb_build_object('gross_amount_minor', p.gross_amount_minor, 'commission_amount_minor', p.commission_amount_minor)
FROM public.seller_payouts p
WHERE p.seller_payout_amount_minor <> 0
ON CONFLICT (reference) DO NOTHING;

INSERT INTO public.seller_wallet_ledger(
  seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
  status, reference, description, metadata
)
SELECT
  p.seller_id, p.store_id, p.order_id, p.payout_id, 'COMMISSION',
  -p.commission_amount_minor, 'POSTED',
  'commission:' || p.payout_id::text,
  'Reliable commission recorded from existing order payout calculation',
  jsonb_build_object('gross_amount_minor', p.gross_amount_minor)
FROM public.seller_payouts p
WHERE p.commission_amount_minor <> 0
ON CONFLICT (reference) DO NOTHING;

INSERT INTO public.seller_wallet_ledger(
  seller_id, store_id, order_id, payout_id, transaction_type, amount_minor,
  status, reference, description, metadata
)
SELECT
  p.seller_id, p.store_id, p.order_id, p.payout_id, 'PAYOUT',
  -p.seller_payout_amount_minor,
  CASE p.payout_status WHEN 'PAID' THEN 'PAID' WHEN 'PROCESSING' THEN 'PROCESSING' WHEN 'FAILED' THEN 'FAILED' WHEN 'REVERSED' THEN 'REVERSED' END,
  'payout:' || p.payout_id::text || ':' || lower(p.payout_status),
  'Existing seller payout lifecycle event',
  jsonb_build_object('paystack_transfer_reference', p.paystack_transfer_reference)
FROM public.seller_payouts p
WHERE p.payout_status IN ('PAID', 'PROCESSING', 'FAILED', 'REVERSED')
ON CONFLICT (reference) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_seller_wallet_summary(p_seller_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  pending_minor BIGINT,
  available_minor BIGINT,
  total_earnings_minor BIGINT,
  total_sales_minor BIGINT,
  commission_minor BIGINT,
  paid_out_minor BIGINT,
  adjustments_minor BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_seller_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized to view this wallet';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(p.seller_payout_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status IN ('HELD', 'QUEUED', 'PROCESSING')), 0)::BIGINT,
    COALESCE((SELECT SUM(p.seller_payout_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status = 'ELIGIBLE'), 0)::BIGINT,
    COALESCE((SELECT SUM(l.amount_minor) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'SALE_EARNING'), 0)::BIGINT,
    COALESCE((SELECT SUM(p.gross_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id), 0)::BIGINT,
    COALESCE((SELECT SUM(ABS(l.amount_minor)) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'COMMISSION'), 0)::BIGINT,
    COALESCE((SELECT SUM(p.seller_payout_amount_minor) FROM public.seller_payouts p WHERE p.seller_id = p_seller_id AND p.payout_status = 'PAID'), 0)::BIGINT,
    COALESCE((SELECT SUM(l.amount_minor) FROM public.seller_wallet_ledger l WHERE l.seller_id = p_seller_id AND l.transaction_type = 'ADJUSTMENT'), 0)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_seller_wallet_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_wallet_summary(UUID) TO authenticated;

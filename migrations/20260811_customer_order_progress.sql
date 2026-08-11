-- Keep the customer-readable order row in sync with the private seller_payouts lifecycle.
-- The customer account already has realtime access to its own orders, while
-- seller_payouts is intentionally restricted to sellers and admins.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payout_status TEXT
    CHECK (payout_status IN ('HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED')),
  ADD COLUMN IF NOT EXISTS payout_id UUID,
  ADD COLUMN IF NOT EXISTS payout_updated_at TIMESTAMPTZ;

UPDATE public.orders AS o
SET
  payout_status = p.payout_status,
  payout_id = p.payout_id,
  payout_updated_at = p.updated_at
FROM public.seller_payouts AS p
WHERE p.order_id = o.id;

CREATE OR REPLACE FUNCTION public.sync_order_payout_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET
    payout_status = NEW.payout_status,
    payout_id = NEW.payout_id,
    payout_updated_at = NEW.updated_at
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_payouts_sync_order_progress ON public.seller_payouts;
CREATE TRIGGER seller_payouts_sync_order_progress
AFTER INSERT OR UPDATE OF payout_status, payout_id, updated_at
ON public.seller_payouts
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_payout_snapshot();

REVOKE ALL ON FUNCTION public.sync_order_payout_snapshot() FROM PUBLIC;

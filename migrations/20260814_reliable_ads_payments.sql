-- Reliable Ads payment reconciliation extensions.
-- Advertiser payments are kept separate from marketplace, promotion, and seller payout ledgers.

ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS ad_payments_reference_idx
  ON public.ad_payments(payment_reference);

CREATE INDEX IF NOT EXISTS ad_payments_advertiser_idx
  ON public.ad_payments(advertiser_id, created_at DESC);

-- Payment rows are created and finalized only by the server-side Paystack handler.
-- Browser clients can read their own advertiser payment history through the existing owner policy,
-- but cannot forge a successful payment or alter campaign status.
DROP POLICY IF EXISTS "Advertiser owners view ad payments" ON public.ad_payments;
CREATE POLICY "Advertiser owners view ad payments"
  ON public.ad_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advertisers a
      WHERE a.id = advertiser_id AND a.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view ad payments" ON public.ad_payments;
CREATE POLICY "Admins view ad payments"
  ON public.ad_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.ad_payments FROM anon, authenticated;
GRANT SELECT ON public.ad_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements, public.advertisers TO authenticated;

COMMENT ON TABLE public.ad_payments IS 'Separate Reliable advertising revenue ledger; rows are written only by verified server-side payment handlers.';
COMMENT ON COLUMN public.ad_payments.metadata IS 'Paystack verification metadata retained for reconciliation and support.';

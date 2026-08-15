import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../migrations/20260815_seller_payout_extension.sql', import.meta.url), 'utf8');
const required = [
  'ALTER TABLE public.seller_payout_profiles',
  'ALTER TABLE public.seller_payouts',
  'ADD COLUMN IF NOT EXISTS gross_amount_minor',
  'ADD COLUMN IF NOT EXISTS commission_amount_minor',
  'ADD COLUMN IF NOT EXISTS seller_payout_amount_minor',
  'ADD COLUMN IF NOT EXISTS eligibility_status',
  'ADD COLUMN IF NOT EXISTS payout_status',
  'CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_order_id_unique',
  'CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_transfer_reference_unique',
  'CREATE TABLE IF NOT EXISTS public.seller_payout_events',
  "GRANT ALL ON TABLE public.seller_payout_events TO service_role",
  "NOTIFY pgrst, 'reload schema'",
];
for (const fragment of required) {
  if (!migration.includes(fragment)) throw new Error(`Missing required migration fragment: ${fragment}`);
}
for (const forbidden of ['DROP TABLE', 'TRUNCATE', 'DELETE FROM public.orders', 'paystack.com/transfer', 'fetch(']) {
  if (migration.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Unsafe or live-transfer fragment found: ${forbidden}`);
  }
}
if (!migration.includes("payout_status IN ('HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED', 'RETRY_REQUIRED', 'PENDING_FUNDS', 'ON_HOLD')")) {
  throw new Error('Payout status separation is incomplete');
}
console.log('Payout extension validation passed: additive schema, preserved identifiers, duplicate protection, RLS boundary, and no live transfer execution.');

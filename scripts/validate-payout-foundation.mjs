import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../migrations/20260815_seller_payout_foundation.sql', import.meta.url), 'utf8')

for (const required of [
  'delivery_confirmed_at',
  'customer_confirmed_received_at',
  'admin_confirmed_delivery_at',
  'payout_eligibility_status',
  'payout_status',
  'CREATE TABLE IF NOT EXISTS public.seller_payouts',
  'order_id UUID NOT NULL UNIQUE',
  'payout_reference TEXT NOT NULL UNIQUE',
  'CREATE TABLE IF NOT EXISTS public.seller_payout_events',
  'No direct payout access',
  'GRANT ALL ON TABLE public.seller_payout_profiles, public.seller_payouts, public.seller_payout_events TO service_role',
]) {
  assert.ok(migration.includes(required), `Missing required migration safeguard: ${required}`)
}

assert.equal(/transfer_initiated|api\.paystack\.co\/transfer/i.test(migration), false, 'Foundation migration must not initiate transfers')
assert.equal(/DROP TABLE|DELETE FROM public\.(orders|seller_payouts)/i.test(migration), false, 'Foundation migration must not delete financial history')
assert.equal(/payout_status.*success.*verified/i.test(migration), false, 'Success must not be implied by queue state')

console.log('Payout foundation validation passed: state separation, uniqueness, restricted access, and no live transfer logic.')

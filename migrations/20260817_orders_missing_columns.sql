-- Add columns that server-side order finalization may write, so future
-- payloads never fail with "column does not exist in schema cache".
-- These were discovered missing on production at runtime:
--   - finalizeReservedOrder inserts customer_phone + delivery_method
--   - the webhook fallback update writes webhook_received_at (as a
--     metadata key, but a dedicated column avoids ambiguity)
--   - metadata jsonb is used by legacy clients and tests
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS webhook_received_at timestamptz;

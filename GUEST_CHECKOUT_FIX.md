# Guest Checkout Fix - 2026-07-10

## Problem
Guest checkout was failing with the error:
> "Permission denied: Guest checkout is not allowed. The server may have RLS policies blocking guest orders."

This error was triggered by a `42501` (insufficient_privilege) error code from Supabase.

## Root Cause Analysis

The error code `42501` specifically indicates an RLS (Row Level Security) policy violation in PostgreSQL/Supabase.

Investigation of the Supabase database revealed:

1. **Orders table schema**: The `customer_email` column was defined as `NOT NULL` with no default value
2. **Guest order payload**: When a guest checks out, the `customer_email` field can be null (optional in the interface)
3. **RLS policies**: The INSERT policy for anon/public existed but the NOT NULL constraint on `customer_email` was preventing successful inserts

## Fix Applied

The fix was applied directly in the Supabase database via SQL Editor:

```sql
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;
DROP POLICY IF EXISTS "Allow anyone to create an order" ON orders;
CREATE POLICY "Allow anyone to create an order" ON orders FOR INSERT WITH CHECK (true);
```

### What Changed
| Aspect | Before | After |
|--------|--------|-------|
| `customer_email` constraint | NOT NULL | NULL (nullable) |
| INSERT RLS policy roles | `{anon}` | `{public}` (includes both anon and authenticated) |
| INSERT policy WITH CHECK | `true` | `true` (unchanged) |

## Frontend Code
No frontend code changes were required. The existing code correctly:
- Uses the anonymous Supabase client for guest orders
- Sends `customer_email` as `null` when not provided
- Properly handles the 42501 error code with a helpful message

## Migration File
See `migrations/20260710_fix_guest_checkout.sql` for the SQL migration.

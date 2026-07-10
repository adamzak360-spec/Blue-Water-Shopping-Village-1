-- Migration: Fix guest checkout order creation
-- Date: 2026-07-10
-- Issue: Guest checkout was failing with 42501 (RLS) error
-- Root Cause: customer_email column was NOT NULL with no default,
--   and the RLS INSERT policy needed to be robust for anon/public access.
--
-- Changes:
-- 1. Make customer_email nullable (guests may not provide email)
-- 2. Ensure RLS INSERT policy for public/anon is properly configured

-- Step 1: Make customer_email nullable
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;

-- Step 2: Re-create the INSERT policy for public access
DROP POLICY IF EXISTS "Allow anyone to create an order" ON orders;
CREATE POLICY "Allow anyone to create an order" ON orders
  FOR INSERT
  WITH CHECK (true);

-- Step 3: Verify the schema change
-- Expected: customer_email is_nullable = YES

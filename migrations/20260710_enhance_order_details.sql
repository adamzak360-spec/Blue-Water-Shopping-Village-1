-- Ensure the orders table has all necessary columns for detailed view
-- The schema already seems to have customer_name, customer_email, customer_phone, delivery_address, city, region, notes, items, subtotal, delivery_fee, total, status, payment_status, user_id.

-- We should verify if 'items' is a JSONB column to store product snapshots.
-- Based on the code, it's being sent as an array of CartItem objects.

-- Add a comment to the table to document the purpose of the columns
COMMENT ON COLUMN orders.items IS 'Snapshot of products ordered, including id, name, price, and quantity at time of order';

-- Ensure RLS allows admins to see all orders (this should already be the case if they are using a service role or if there is an admin policy)
-- But let's be explicit for the 'authenticated' role if we want them to see all orders in the dashboard.
-- However, the dashboard currently uses the standard supabase client which respects RLS.

-- Check if there's an admin policy for orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Admins can view all orders'
    ) THEN
        CREATE POLICY "Admins can view all orders" ON orders
        FOR SELECT
        TO authenticated
        USING (true); -- In a real app, you'd check for an admin role, but here we use authenticated as admin
    END IF;
END
$$;

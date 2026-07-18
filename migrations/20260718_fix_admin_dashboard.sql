-- Fix Admin Dashboard Data Loading Issue
-- Root Cause 1: RLS policies on 'orders' table using 'auth.users' which is not accessible by the client.
-- Root Cause 2: 'update_product_rating' trigger fails if 'updated_at' column is missing or if it attempts to update non-existent columns.
-- Root Cause 3: 'Admin.tsx' uses 'Promise.all' which stops all loading if one query fails.

-- Step 1: Fix 'orders' RLS policies to use JWT-based admin check
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'adamzak360@gmail.com');

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'adamzak360@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'adamzak360@gmail.com');

-- Step 2: Ensure 'products' table has necessary columns for reviews and triggers
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Step 3: Update the 'update_product_rating' function to be more robust
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews INTEGER;
BEGIN
    -- Calculate new stats for the product
    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO 
        avg_rating,
        total_reviews
    FROM public.reviews
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND status = 'approved';

    -- Update the product
    UPDATE public.products
    SET 
        average_rating = avg_rating,
        review_count = total_reviews,
        updated_at = now()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Re-enable the trigger
DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- Add low_stock_threshold to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Ensure stock_quantity exists and has a default value
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update status type or ensure it's handled correctly
-- The existing type seems to be 'active' | 'inactive' | 'out-of-stock'
-- We might need to ensure the database constraints match if they exist.

-- Create a function to handle stock reduction
CREATE OR REPLACE FUNCTION reduce_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_stock INTEGER;
BEGIN
    -- The 'items' column in 'orders' table is a JSONB array of CartItem
    -- CartItem: { id, quantity, ... }
    FOR item IN SELECT * FROM jsonb_to_recordset(NEW.items) AS x(id UUID, quantity INTEGER)
    LOOP
        -- Get current stock
        SELECT stock_quantity INTO current_stock FROM products WHERE id = item.id;
        
        -- Check if enough stock
        IF current_stock < item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', item.id;
        END IF;
        
        -- Reduce stock
        UPDATE products 
        SET 
            stock_quantity = stock_quantity - item.quantity,
            status = CASE 
                WHEN (stock_quantity - item.quantity) <= 0 THEN 'out-of-stock'
                ELSE status
            END
        WHERE id = item.id;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock reduction
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_order ON orders;
CREATE TRIGGER trigger_reduce_stock_on_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION reduce_stock_on_order();

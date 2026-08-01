-- Create Product Variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_type TEXT NOT NULL, -- e.g., 'size', 'color'
    variant_value TEXT NOT NULL, -- e.g., 'M', 'XL', 'Red'
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add has_sizes column to products if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'has_sizes') THEN
        ALTER TABLE products ADD COLUMN has_sizes BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Policies for product_variants
CREATE POLICY "Allow public read access for product_variants" ON product_variants
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for product_variants" ON product_variants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update for product_variants" ON product_variants
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete for product_variants" ON product_variants
    FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update stock reduction trigger to handle variants
CREATE OR REPLACE FUNCTION reduce_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_stock INTEGER;
    variant_stock INTEGER;
BEGIN
    -- The 'items' column in 'orders' table is a JSONB array of CartItem
    -- CartItem: { id, quantity, selected_size, ... }
    FOR item IN SELECT * FROM jsonb_to_recordset(NEW.items) AS x(id UUID, quantity INTEGER, selected_size TEXT)
    LOOP
        -- If it's a variant product
        IF item.selected_size IS NOT NULL THEN
            -- Get current variant stock
            SELECT stock_quantity INTO variant_stock 
            FROM product_variants 
            WHERE product_id = item.id AND variant_value = item.selected_size;
            
            -- Check if enough stock
            IF variant_stock IS NULL OR variant_stock < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product % size %', item.id, item.selected_size;
            END IF;
            
            -- Reduce variant stock
            UPDATE product_variants 
            SET stock_quantity = stock_quantity - item.quantity
            WHERE product_id = item.id AND variant_value = item.selected_size;
            
            -- Also reduce main product total stock to keep in sync
            UPDATE products 
            SET 
                stock_quantity = stock_quantity - item.quantity,
                status = CASE 
                    WHEN (stock_quantity - item.quantity) <= 0 THEN 'out-of-stock'
                    ELSE status
                END
            WHERE id = item.id;
        ELSE
            -- Non-variant product, standard logic
            SELECT stock_quantity INTO current_stock FROM products WHERE id = item.id;
            
            IF current_stock < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.id;
            END IF;
            
            UPDATE products 
            SET 
                stock_quantity = stock_quantity - item.quantity,
                status = CASE 
                    WHEN (stock_quantity - item.quantity) <= 0 THEN 'out-of-stock'
                    ELSE status
                END
            WHERE id = item.id;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

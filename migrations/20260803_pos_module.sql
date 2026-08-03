-- Add source column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ONLINE';

-- Update existing orders to be 'ONLINE' (though default already handles new ones)
UPDATE orders SET source = 'ONLINE' WHERE source IS NULL;

-- Ensure the column is not null for future orders
ALTER TABLE orders ALTER COLUMN source SET NOT NULL;

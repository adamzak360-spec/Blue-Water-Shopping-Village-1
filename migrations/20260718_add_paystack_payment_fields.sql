-- Add Paystack payment fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Create index on paystack_reference for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference ON orders(paystack_reference);

-- Add comment to document the new columns
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (e.g., paystack)';
COMMENT ON COLUMN orders.paystack_reference IS 'Unique Paystack transaction reference';
COMMENT ON COLUMN orders.amount_paid IS 'Amount paid through Paystack in the smallest currency unit';
COMMENT ON COLUMN orders.payment_date IS 'Timestamp when payment was completed';

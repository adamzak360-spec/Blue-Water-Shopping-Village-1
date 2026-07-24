-- Add delivery fee columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_tamale DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_stc DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_vip DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_oa DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_vvip DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_fedex DECIMAL(10, 2) DEFAULT 0;

-- Create delivery_settings table for global defaults
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_type VARCHAR(50) NOT NULL UNIQUE, -- 'tamale', 'stc', 'vip', 'oa', 'vvip', 'fedex'
  default_fee DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default delivery settings
INSERT INTO delivery_settings (delivery_type, default_fee, description) VALUES
  ('tamale', 15.00, 'Delivery within Tamale'),
  ('stc', 35.00, 'STC Transport'),
  ('vip', 45.00, 'VIP Transport'),
  ('oa', 40.00, 'OA Transport'),
  ('vvip', 50.00, 'VVIP Transport'),
  ('fedex', 90.00, 'FedEx Delivery')
ON CONFLICT (delivery_type) DO NOTHING;

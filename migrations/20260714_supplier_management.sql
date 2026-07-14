-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email_address TEXT NOT NULL,
  business_address TEXT NOT NULL,
  tax_id TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for products and suppliers (Many-to-Many)
CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, supplier_id)
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on suppliers
CREATE POLICY "Admins can manage suppliers" ON suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'adamzak360@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'adamzak360@gmail.com'
    )
  );

-- Admins can manage product_suppliers
CREATE POLICY "Admins can manage product_suppliers" ON product_suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'adamzak360@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'adamzak360@gmail.com'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_suppliers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_suppliers_timestamp ON suppliers;
CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_timestamp();

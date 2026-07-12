-- Create customer_profiles table to store customer-specific data
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  delivery_address TEXT,
  city TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for customer_profiles
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Customers can view their own profile
CREATE POLICY "Customers can view own profile" ON customer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Customers can update their own profile
CREATE POLICY "Customers can update own profile" ON customer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Customers can insert their own profile
CREATE POLICY "Customers can insert own profile" ON customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_profiles_timestamp ON customer_profiles;
CREATE TRIGGER update_customer_profiles_timestamp
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_profiles_timestamp();

-- Ensure RLS allows customers to view only their own orders
-- Update the orders table RLS policy to be more restrictive
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to view all orders (authenticated users with admin role)
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is admin (you can modify this logic based on your admin identification)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'adamzak360@gmail.com'
    )
  );

-- Allow anyone to insert orders (for both guest and authenticated)
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to update orders
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE
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

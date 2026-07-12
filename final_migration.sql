-- 1. Create customer_profiles table
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

-- 2. Enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for customer_profiles
DROP POLICY IF EXISTS "Customers can view own profile" ON customer_profiles;
CREATE POLICY "Customers can view own profile" ON customer_profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Customers can update own profile" ON customer_profiles;
CREATE POLICY "Customers can update own profile" ON customer_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Customers can insert own profile" ON customer_profiles;
CREATE POLICY "Customers can insert own profile" ON customer_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 4. Create trigger for timestamp
CREATE OR REPLACE FUNCTION update_customer_profiles_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_customer_profiles_timestamp ON customer_profiles;
CREATE TRIGGER update_customer_profiles_timestamp BEFORE UPDATE ON customer_profiles FOR EACH ROW EXECUTE FUNCTION update_customer_profiles_timestamp();

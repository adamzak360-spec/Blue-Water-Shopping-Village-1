-- =============================================
-- Migration: MVP Phase 2 — Multi-Tenant Foundation
-- =============================================

-- 1. Create Businesses (Stores) table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active businesses / storefronts
DROP POLICY IF EXISTS "Public can view businesses" ON public.businesses;
CREATE POLICY "Public can view businesses" ON public.businesses
    FOR SELECT USING (true);

-- Allow authenticated users to insert a new business
DROP POLICY IF EXISTS "Users can create businesses" ON public.businesses;
CREATE POLICY "Users can create businesses" ON public.businesses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- Allow business owners to update their own business
DROP POLICY IF EXISTS "Owners can update own business" ON public.businesses;
CREATE POLICY "Owners can update own business" ON public.businesses
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS businesses_slug_idx ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS businesses_owner_id_idx ON public.businesses(owner_id);

-- 2. Insert default Reliable Premium Marketplace business record if not exists
INSERT INTO public.businesses (id, name, slug, description, contact_email, contact_phone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Reliable Premium Marketplace',
    'reliable-marketplace',
    'Your trusted destination for premium shopping, electronics, fashion, and everyday essentials.',
    'adamzak360@gmail.com',
    '+233240000000'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Add business_id column to tenant-aware tables
-- Products table
ALTER TABLE IF EXISTS public.products 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.products SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.products ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS products_business_id_idx ON public.products(business_id);

-- Orders table
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.orders SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS orders_business_id_idx ON public.orders(business_id);

-- Customer Profiles table
ALTER TABLE IF EXISTS public.customer_profiles 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.customer_profiles SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.customer_profiles ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS customer_profiles_business_id_idx ON public.customer_profiles(business_id);

-- Suppliers table
ALTER TABLE IF EXISTS public.suppliers 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.suppliers SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.suppliers ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS suppliers_business_id_idx ON public.suppliers(business_id);

-- Reviews table
ALTER TABLE IF EXISTS public.reviews 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.reviews SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.reviews ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS reviews_business_id_idx ON public.reviews(business_id);

-- Delivery Settings table
ALTER TABLE IF EXISTS public.delivery_settings 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.delivery_settings SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.delivery_settings ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS delivery_settings_business_id_idx ON public.delivery_settings(business_id);

-- Call to Order Settings table
ALTER TABLE IF EXISTS public.call_to_order_settings 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.call_to_order_settings SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE public.call_to_order_settings ALTER COLUMN business_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS call_to_order_settings_business_id_idx ON public.call_to_order_settings(business_id);

-- =============================================
-- End of Migration: MVP Phase 2
-- =============================================

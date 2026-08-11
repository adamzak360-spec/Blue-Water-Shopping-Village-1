-- Phase 11: Security Hardening - Replacing hardcoded admin emails with role checks

-- 1. Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update RLS policies for various tables

-- Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Products
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin());

-- Orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());

-- Reviews
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL TO authenticated USING (public.is_admin());

-- Suppliers
DROP POLICY IF EXISTS "Admins can manage all suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage all suppliers" ON public.suppliers
  FOR ALL TO authenticated USING (public.is_admin());

-- Businesses
DROP POLICY IF EXISTS "Admins can manage all businesses" ON public.businesses;
CREATE POLICY "Admins can manage all businesses" ON public.businesses
  FOR ALL TO authenticated USING (public.is_admin());

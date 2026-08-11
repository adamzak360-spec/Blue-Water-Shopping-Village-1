-- Enable Row-Level Security on public.products table
-- Project: Tamale-Daa (obbwccldkvnoxtxmlraj)
-- This fixes the Supabase security advisor warning "RLS Disabled in Public" for public.products

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'products';

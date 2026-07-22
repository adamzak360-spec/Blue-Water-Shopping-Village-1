-- ============================================================
-- Migration: Add gallery_urls column to products table
-- Purpose: Support multiple product images (gallery feature)
-- Date: 2026-07-22
-- Backward Compatibility: Fully backward compatible
--   - Existing products with only image_url continue to work
--   - gallery_urls defaults to empty array for existing rows
-- ============================================================

-- Add gallery_urls column (JSONB array of image URLs)
-- Using text[] instead of jsonb for simpler query patterns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN public.products.gallery_urls IS 'Array of additional product image URLs (gallery images). The primary cover image remains in image_url.';

-- Verify the column was added
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'gallery_urls'
  ) THEN
    RAISE NOTICE 'gallery_urls column successfully added to products table';
  ELSE
    RAISE EXCEPTION 'Failed to add gallery_urls column';
  END IF;
END $$;

-- ============================================================
-- Create storage bucket policies if they don't exist
-- ============================================================

-- Ensure the product-images bucket has proper policies
-- (These may already exist from previous configuration, but we ensure they are complete)

-- First, check if the bucket exists by attempting to create it
-- If it already exists, this will fail silently in Supabase Dashboard
-- NOTE: This should be run in Supabase Dashboard SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('product-images', 'product-images', true) 
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Existing products are unaffected:
--   - gallery_urls = '{}' (empty array)
--   - image_url still serves as the cover/main image
--   - Frontend already handles this case with fallback logic
-- ============================================================

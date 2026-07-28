-- ============================================================
-- Migration: Add video support to products table
-- Purpose: Enable product video uploads alongside images
-- Date: 2026-07-28
-- Backward Compatibility: Fully backward compatible
--   - Existing products continue to work without videos
--   - video_urls defaults to empty array for existing rows
-- ============================================================

-- Add video_urls column (text array of video URLs)
-- Following the same pattern as gallery_urls for consistency
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN public.products.video_urls IS 'Array of product video URLs. Supported formats: MP4, MOV, WEBM. Videos are displayed in the product gallery alongside images.';

-- Verify the column was added
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'video_urls'
  ) THEN
    RAISE NOTICE 'video_urls column successfully added to products table';
  ELSE
    RAISE EXCEPTION 'Failed to add video_urls column';
  END IF;
END $$;

-- ============================================================
-- Storage bucket configuration notes:
-- The 'product-videos' bucket should be created in Supabase Dashboard
-- with the following settings:
--   - Bucket ID: product-videos
--   - Public: true (to allow public video playback)
--   - File size limit: 500MB (or higher for large videos)
--   - Allowed MIME types: video/mp4, video/quicktime, video/webm
--
-- Storage policies should be configured to:
--   - Allow authenticated users to upload
--   - Allow public read access
--   - Allow authenticated users to delete their own uploads
-- ============================================================

-- ============================================================
-- Existing products are unaffected:
--   - video_urls = '{}' (empty array)
--   - image_url and gallery_urls continue to work as before
--   - Frontend handles mixed media display
-- ============================================================

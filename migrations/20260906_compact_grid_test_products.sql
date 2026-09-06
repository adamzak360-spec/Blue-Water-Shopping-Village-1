-- Temporary test data for validating the third compact-grid product card style.
-- Run after 20260905_product_card_compact_grid.sql succeeds.
-- These products are clearly labeled and can be removed with the cleanup query below.

INSERT INTO public.products (
  name,
  description,
  price,
  currency,
  category,
  image_url,
  stock_quantity,
  low_stock_threshold,
  status,
  business_id,
  card_style,
  original_price,
  brand
)
VALUES
(
  'TEST Compact Card - Wireless Headphones',
  'Temporary compact-grid card test product. Click the image or name to view full details.',
  149,
  'GHS',
  'Test Cards',
  'https://iwouhwizzwwykchgflyk.supabase.co/storage/v1/object/public/product-images/1786492637754-1lpkq8u-213093.jpg',
  20,
  5,
  'active',
  '00000000-0000-0000-0000-000000000001',
  'compact-grid',
  199,
  'Reliable Test Lab'
),
(
  'TEST Compact Card - Everyday Backpack',
  'Temporary compact-grid card test product with a visible percentage discount. Click for full details.',
  89,
  'GHS',
  'Test Cards',
  'https://iwouhwizzwwykchgflyk.supabase.co/storage/v1/object/public/product-images/1785086154514-kxkgtq8-213139.jpg',
  15,
  5,
  'active',
  '00000000-0000-0000-0000-000000000001',
  'compact-grid',
  125,
  'Reliable Test Lab'
),
(
  'TEST Existing Style - Standard Card Control',
  'Temporary control product confirming the existing standard card remains available.',
  59,
  'GHS',
  'Test Cards',
  'https://iwouhwizzwwykchgflyk.supabase.co/storage/v1/object/public/product-images/1784812554678-w24x0ro-211015.jpg',
  10,
  5,
  'active',
  '00000000-0000-0000-0000-000000000001',
  'standard',
  79,
  'Reliable Test Lab'
)
RETURNING id, name, price, original_price, card_style;

-- Cleanup after visual verification, if desired:
-- DELETE FROM public.products
-- WHERE name IN (
--   'TEST Compact Card - Wireless Headphones',
--   'TEST Compact Card - Everyday Backpack',
--   'TEST Existing Style - Standard Card Control'
-- );

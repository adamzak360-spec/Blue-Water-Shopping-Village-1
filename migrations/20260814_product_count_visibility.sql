-- Platform storefront display setting: product-count visibility
-- The default marketplace business row is the single source of truth for the public products page.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS show_product_count BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.show_product_count IS
  'Whether the public products page displays product totals; managed by platform administrators.';

UPDATE public.businesses
SET show_product_count = false
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND show_product_count IS NULL;

-- Existing public SELECT and admin UPDATE policies on businesses apply.
-- Sellers do not receive update access to the default marketplace row through their owner policy.

NOTIFY pgrst, 'reload schema';

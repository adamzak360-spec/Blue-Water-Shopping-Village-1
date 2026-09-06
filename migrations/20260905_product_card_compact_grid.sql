-- Add the third product card style without changing existing product records.
-- Existing values remain standard or marketplace-list.

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_card_style_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_card_style_check
  CHECK (card_style IN ('standard', 'marketplace-list', 'compact-grid'));

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can view their own wishlist"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can add to their own wishlist"
  ON public.wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can remove from their own wishlist"
  ON public.wishlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wishlist_items_product_id_idx
  ON public.wishlist_items(product_id);

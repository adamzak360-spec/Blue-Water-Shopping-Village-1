-- Reliable Articles / Blog platform
-- Additive migration: does not modify existing authentication, products, stores,
-- orders, checkout, Paystack, payouts, inventory, or news tables.

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  category TEXT NOT NULL DEFAULT 'Shopping Guides',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Reliable Editorial Team',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN NOT NULL DEFAULT false,
  reading_time_minutes INTEGER CHECK (reading_time_minutes IS NULL OR reading_time_minutes BETWEEN 1 AND 180),
  primary_keyword TEXT,
  secondary_topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT articles_published_requires_date CHECK (status = 'draft' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS articles_public_listing_idx
  ON public.articles (status, published_at DESC, featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_idx
  ON public.articles (category, status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_title_search_idx
  ON public.articles USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

CREATE TABLE IF NOT EXISTS public.article_products (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (article_id, product_id)
);
CREATE INDEX IF NOT EXISTS article_products_product_idx ON public.article_products (product_id, sort_order);

CREATE TABLE IF NOT EXISTS public.article_stores (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (article_id, business_id)
);
CREATE INDEX IF NOT EXISTS article_stores_business_idx ON public.article_stores (business_id, sort_order);

CREATE TABLE IF NOT EXISTS public.article_related_articles (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  related_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  PRIMARY KEY (article_id, related_article_id),
  CONSTRAINT article_related_articles_no_self_link CHECK (article_id <> related_article_id)
);
CREATE INDEX IF NOT EXISTS article_related_articles_related_idx
  ON public.article_related_articles (related_article_id, sort_order);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_related_articles ENABLE ROW LEVEL SECURITY;

-- Public visitors only see published articles whose publication time has arrived.
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
CREATE POLICY "Anyone can view published articles"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= timezone('utc', now())
  );

DROP POLICY IF EXISTS "Admins can view all articles" ON public.articles;
CREATE POLICY "Admins can view all articles"
  ON public.articles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Admins can insert articles" ON public.articles;
CREATE POLICY "Admins can insert articles"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
CREATE POLICY "Admins can update articles"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
CREATE POLICY "Admins can delete articles"
  ON public.articles FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Anyone can view published article products" ON public.article_products;
CREATE POLICY "Anyone can view published article products"
  ON public.article_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_products.article_id
      AND a.status = 'published'
      AND a.published_at IS NOT NULL
      AND a.published_at <= timezone('utc', now())
  ));

DROP POLICY IF EXISTS "Admins can manage article products" ON public.article_products;
CREATE POLICY "Admins can manage article products"
  ON public.article_products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Anyone can view published article stores" ON public.article_stores;
CREATE POLICY "Anyone can view published article stores"
  ON public.article_stores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_stores.article_id
      AND a.status = 'published'
      AND a.published_at IS NOT NULL
      AND a.published_at <= timezone('utc', now())
  ));

DROP POLICY IF EXISTS "Admins can manage article stores" ON public.article_stores;
CREATE POLICY "Admins can manage article stores"
  ON public.article_stores FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

DROP POLICY IF EXISTS "Anyone can view published related articles" ON public.article_related_articles;
CREATE POLICY "Anyone can view published related articles"
  ON public.article_related_articles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_related_articles.article_id
      AND a.status = 'published'
      AND a.published_at IS NOT NULL
      AND a.published_at <= timezone('utc', now())
  ));

DROP POLICY IF EXISTS "Admins can manage related articles" ON public.article_related_articles;
CREATE POLICY "Admins can manage related articles"
  ON public.article_related_articles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
  ));

CREATE OR REPLACE FUNCTION public.set_articles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_articles_updated_at();

-- Dedicated public bucket. Only admins can write; public users can read.
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-assets', 'article-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view article assets" ON storage.objects;
CREATE POLICY "Public can view article assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-assets');

DROP POLICY IF EXISTS "Admins can insert article assets" ON storage.objects;
CREATE POLICY "Admins can insert article assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update article assets" ON storage.objects;
CREATE POLICY "Admins can update article assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'article-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete article assets" ON storage.objects;
CREATE POLICY "Admins can delete article assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'general_admin')
    )
  );

-- Small set of reviewed starter drafts. These are deliberately not public.
INSERT INTO public.articles (title, slug, excerpt, content_html, category, author_name, status, featured, reading_time_minutes, primary_keyword, seo_title, seo_description)
VALUES
(
  'How to Shop Online Safely in Ghana',
  'how-to-shop-online-safely-in-ghana',
  'A practical guide to checking sellers, product details, delivery information, and payment steps before you buy online.',
  '<p>Online shopping can be convenient, but a few thoughtful checks help customers make confident decisions.</p><h2>Check the seller and store information</h2><p>Review the store name, product details, available contact information, and any delivery notes before placing an order.</p><h2>Read the product information carefully</h2><p>Compare size, condition, materials, images, price, and stock information. Ask questions when something is unclear.</p><h2>Understand delivery and payment</h2><p>Confirm the delivery area, fee, pickup option, and payment instructions before completing checkout.</p><h2>Keep your order information</h2><p>Save your order reference and delivery details so you can follow up easily if you need support.</p><p>Reliable is designed to help customers discover products and stores in one marketplace.</p>',
  'Shopping Guides', 'Reliable Editorial Team', 'draft', false, 4, 'shop online safely in Ghana',
  'How to Shop Online Safely in Ghana | Reliable',
  'Learn practical steps for safer online shopping in Ghana, from checking sellers and product information to understanding delivery and payment.'
),
(
  'How to Start Selling Online in Ghana',
  'how-to-start-selling-online-in-ghana',
  'A beginner-friendly guide for Ghanaian businesses that want to present products online and reach more customers.',
  '<p>Moving from in-person selling to an online marketplace can help a small business present its products to customers beyond its usual location.</p><h2>Start with clear store information</h2><p>Use a store name, description, contact details, service area, and delivery information that customers can understand.</p><h2>Prepare useful product listings</h2><p>Use clear product names, honest descriptions, accurate prices, stock details, and well-lit photos.</p><h2>Make delivery expectations simple</h2><p>Explain where you deliver, how long processing may take, and which pickup or delivery options customers can use.</p><h2>Build trust through consistency</h2><p>Respond to questions, keep stock information current, and use the same business identity across your online channels.</p>',
  'Seller Guides', 'Reliable Editorial Team', 'draft', false, 4, 'start selling online in Ghana',
  'How to Start Selling Online in Ghana | Reliable',
  'A practical guide for Ghanaian businesses preparing products, store information, photos, and delivery details for online selling.'
),
(
  'How to Choose the Right Product When Shopping Online',
  'how-to-choose-the-right-product-online',
  'Use this simple checklist to compare product details, quality, price, availability, and delivery before buying online.',
  '<p>Good online shopping decisions begin with the information on the product page. Take a moment to compare what matters most to you.</p><h2>Define what you need</h2><p>Write down the size, colour, purpose, budget, and important features you are looking for.</p><h2>Compare the details</h2><p>Read the description, inspect the images, check stock, and compare similar products before making a decision.</p><h2>Consider the total cost</h2><p>Include the product price and any delivery or pickup fee so you can compare options fairly.</p><h2>Ask useful questions</h2><p>If the listing does not answer an important question, contact the seller before placing the order.</p>',
  'Product Advice', 'Reliable Editorial Team', 'draft', false, 3, 'choose the right product online',
  'How to Choose the Right Product Online | Reliable',
  'A simple checklist for comparing product details, quality, price, availability, and delivery before buying online.'
)
ON CONFLICT (slug) DO NOTHING;

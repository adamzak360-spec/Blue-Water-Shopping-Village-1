-- Seller social links for public store and product-detail profiles
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS x_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN public.businesses.facebook_url IS 'Public Facebook profile or page URL for this business';
COMMENT ON COLUMN public.businesses.tiktok_url IS 'Public TikTok profile URL for this business';
COMMENT ON COLUMN public.businesses.instagram_url IS 'Public Instagram profile URL for this business';
COMMENT ON COLUMN public.businesses.x_url IS 'Public X/Twitter profile URL for this business';
COMMENT ON COLUMN public.businesses.whatsapp_url IS 'Public WhatsApp contact or wa.me URL for this business';
COMMENT ON COLUMN public.businesses.youtube_url IS 'Public YouTube channel URL for this business';

-- Public storefronts already use the businesses SELECT policy; owners retain
-- update access through the existing owner policy.

-- Stores the administrator-managed browser tab icon for the default marketplace business.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Phase 6: Business Verification Architecture

-- 1. Add verification fields to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'not_submitted';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registration_document_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- 2. Update storage policies for business documents
-- Note: Reusing identity-documents bucket or creating a new one? 
-- Let's create a dedicated bucket for business docs.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for business-documents
DROP POLICY IF EXISTS "Owners can upload their own business documents" ON storage.objects;
CREATE POLICY "Owners can upload their own business documents" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owners can view their own business documents" ON storage.objects;
CREATE POLICY "Owners can view their own business documents" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all business documents" ON storage.objects;
CREATE POLICY "Admins can view all business documents" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'business-documents' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 3. Storage Bucket for Business Assets (Logo, Banner)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for business-assets
DROP POLICY IF EXISTS "Public can view business assets" ON storage.objects;
CREATE POLICY "Public can view business assets" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Owners can manage their own business assets" ON storage.objects;
CREATE POLICY "Owners can manage their own business assets" 
  ON storage.objects FOR ALL 
  TO authenticated 
  USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

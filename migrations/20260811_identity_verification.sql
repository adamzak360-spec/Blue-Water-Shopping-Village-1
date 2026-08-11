-- Phase 3: Global Identity Verification Architecture

-- 1. Create verification status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected');
    END IF;
END $$;

-- 2. Identity Verifications Table
CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL, -- 'passport', 'national_id', 'driver_license'
  id_number TEXT,
  id_image_front_url TEXT NOT NULL,
  id_image_back_url TEXT,
  status verification_status DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

-- 3. Update profiles table to include verification status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_status verification_status DEFAULT 'not_submitted';

-- 4. RLS Policies
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification status
DROP POLICY IF EXISTS "Users can view their own identity verification" ON public.identity_verifications;
CREATE POLICY "Users can view their own identity verification" 
  ON public.identity_verifications FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own verification
DROP POLICY IF EXISTS "Users can submit their own identity verification" ON public.identity_verifications;
CREATE POLICY "Users can submit their own identity verification" 
  ON public.identity_verifications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all verifications
DROP POLICY IF EXISTS "Admins can manage all identity verifications" ON public.identity_verifications;
CREATE POLICY "Admins can manage all identity verifications" 
  ON public.identity_verifications FOR ALL 
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 5. Trigger to update profile status when identity_verifications changes
CREATE OR REPLACE FUNCTION public.handle_identity_status_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET identity_status = NEW.status
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_identity_verification_change ON public.identity_verifications;
CREATE TRIGGER on_identity_verification_change
  AFTER INSERT OR UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_identity_status_change();

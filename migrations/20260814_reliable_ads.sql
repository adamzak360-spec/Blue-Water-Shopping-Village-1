-- Standalone Reliable Ads module. This is intentionally separate from seller promotions.
-- Advertising is OFF by default and public eligibility is enforced by RPCs.

CREATE TABLE IF NOT EXISTS public.advertising_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  advertising_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  seller_advertising_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  external_advertising_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (minimum_budget_minor >= 0),
  maximum_duration_days INTEGER NOT NULL DEFAULT 365 CHECK (maximum_duration_days > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.advertising_settings (id, advertising_enabled)
VALUES (TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  contact_email TEXT,
  advertiser_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (advertiser_type IN ('INTERNAL', 'SELLER', 'EXTERNAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE RESTRICT,
  campaign_name TEXT NOT NULL CHECK (length(trim(campaign_name)) BETWEEN 2 AND 160),
  ad_type TEXT NOT NULL CHECK (ad_type IN ('BANNER', 'PRODUCT', 'STORE', 'SPONSORED_PRODUCT', 'SPONSORED_STORE', 'HOMEPAGE_PROMOTION')),
  placement TEXT NOT NULL CHECK (placement IN ('HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'PRODUCT_LIST_TOP', 'PRODUCT_LIST_MIDDLE', 'PRODUCT_DETAILS', 'STORE_PAGE', 'CATEGORY_PAGE', 'SEARCH_RESULTS', 'SIDEBAR_DESKTOP', 'MOBILE_BANNER')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'ARCHIVED')),
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 100),
  headline TEXT NOT NULL CHECK (length(trim(headline)) BETWEEN 1 AND 180),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  image_url TEXT CHECK (image_url IS NULL OR image_url ~* '^https://'),
  destination_url TEXT NOT NULL CHECK (destination_url ~* '^https://'),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (budget_minor >= 0),
  revenue_minor BIGINT NOT NULL DEFAULT 0 CHECK (revenue_minor >= 0),
  impressions_count BIGINT NOT NULL DEFAULT 0 CHECK (impressions_count >= 0),
  clicks_count BIGINT NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT advertisements_date_check CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  session_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  session_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ad_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE RESTRICT,
  advertisement_id UUID REFERENCES public.advertisements(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  purpose TEXT NOT NULL DEFAULT 'ADVERTISING_PAYMENT' CHECK (purpose = 'ADVERTISING_PAYMENT'),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  payment_reference TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS advertisements_public_idx ON public.advertisements(placement, status, starts_at, ends_at, priority DESC);
CREATE INDEX IF NOT EXISTS advertisements_advertiser_idx ON public.advertisements(advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ad_impressions_lookup_idx ON public.ad_impressions(advertisement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ad_clicks_lookup_idx ON public.ad_clicks(advertisement_id, created_at DESC);

ALTER TABLE public.advertising_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read advertising settings" ON public.advertising_settings;
CREATE POLICY "Public read advertising settings" ON public.advertising_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage advertising settings" ON public.advertising_settings;
CREATE POLICY "Admins manage advertising settings" ON public.advertising_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admins manage advertisers" ON public.advertisers;
CREATE POLICY "Admins manage advertisers" ON public.advertisers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "Advertiser owners view own advertiser" ON public.advertisers;
CREATE POLICY "Advertiser owners view own advertiser" ON public.advertisers FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage advertisements" ON public.advertisements;
CREATE POLICY "Admins manage advertisements" ON public.advertisements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "Owners view own advertisements" ON public.advertisements;
CREATE POLICY "Owners view own advertisements" ON public.advertisements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins view ad payments" ON public.ad_payments;
CREATE POLICY "Admins view ad payments" ON public.ad_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "Advertiser owners view ad payments" ON public.ad_payments;
CREATE POLICY "Advertiser owners view ad payments" ON public.ad_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.owner_user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_active_reliable_ads(p_placement TEXT, p_limit INTEGER DEFAULT 3)
RETURNS SETOF public.advertisements LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ad.* FROM public.advertisements ad
  JOIN public.advertisers advertiser ON advertiser.id = ad.advertiser_id
  CROSS JOIN public.advertising_settings settings
  WHERE settings.id = TRUE AND settings.advertising_enabled = TRUE
    AND ad.placement = p_placement
    AND ad.status IN ('ACTIVE', 'SCHEDULED')
    AND ad.starts_at <= timezone('utc', now())
    AND ad.ends_at > timezone('utc', now())
    AND (settings.approval_required = FALSE OR ad.status IN ('ACTIVE', 'SCHEDULED'))
    AND advertiser.advertiser_type IN ('INTERNAL', 'SELLER', 'EXTERNAL')
  ORDER BY ad.priority ASC, ad.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 10));
$$;

CREATE OR REPLACE FUNCTION public.record_ad_impression(p_advertisement_id UUID, p_session_key TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.get_active_reliable_ads((SELECT placement FROM public.advertisements WHERE id = p_advertisement_id), 10) WHERE id = p_advertisement_id) THEN RETURN FALSE; END IF;
  IF p_session_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.ad_impressions WHERE advertisement_id = p_advertisement_id AND session_key = p_session_key AND created_at > timezone('utc', now()) - interval '30 minutes') THEN RETURN FALSE; END IF;
  INSERT INTO public.ad_impressions(advertisement_id, session_key) VALUES (p_advertisement_id, p_session_key);
  UPDATE public.advertisements SET impressions_count = impressions_count + 1, updated_at = timezone('utc', now()) WHERE id = p_advertisement_id;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ad_click(p_advertisement_id UUID, p_session_key TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.get_active_reliable_ads((SELECT placement FROM public.advertisements WHERE id = p_advertisement_id), 10) WHERE id = p_advertisement_id) THEN RETURN FALSE; END IF;
  IF p_session_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.ad_clicks WHERE advertisement_id = p_advertisement_id AND session_key = p_session_key AND created_at > timezone('utc', now()) - interval '30 minutes') THEN RETURN FALSE; END IF;
  INSERT INTO public.ad_clicks(advertisement_id, session_key) VALUES (p_advertisement_id, p_session_key);
  UPDATE public.advertisements SET clicks_count = clicks_count + 1, updated_at = timezone('utc', now()) WHERE id = p_advertisement_id;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_reliable_ads(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_reliable_ads(TEXT, INTEGER) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ad_impression(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_impression(UUID, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ad_click(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_click(UUID, TEXT) TO anon, authenticated;

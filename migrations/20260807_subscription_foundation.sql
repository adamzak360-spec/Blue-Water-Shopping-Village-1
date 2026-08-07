-- =============================================
-- Migration: MVP Phase 7 — Subscription Foundation
-- =============================================

-- 1. Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_products INTEGER NOT NULL DEFAULT 50,
    max_staff INTEGER NOT NULL DEFAULT 1,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

-- Seed default plans
INSERT INTO public.subscription_plans (name, price_monthly, max_products, max_staff, features)
VALUES 
    ('Free', 0.00, 25, 1, '{"pos": true, "analytics": false, "custom_domain": false}'::jsonb),
    ('Starter', 29.00, 250, 3, '{"pos": true, "analytics": true, "custom_domain": false}'::jsonb),
    ('Professional', 79.00, 1000, 10, '{"pos": true, "analytics": true, "custom_domain": true}'::jsonb),
    ('Enterprise', 199.00, 99999, 50, '{"pos": true, "analytics": true, "custom_domain": true, "priority_support": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 2. Create business subscriptions table
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, past_due, cancelled, trial
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own subscription" ON public.business_subscriptions;
CREATE POLICY "Owners can view own subscription" ON public.business_subscriptions
    FOR SELECT TO authenticated
    USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

-- Assign Reliable Marketplace to Enterprise / Professional plan by default
INSERT INTO public.business_subscriptions (business_id, plan_id, status)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    id,
    'active'
FROM public.subscription_plans
WHERE name = 'Enterprise'
ON CONFLICT (business_id) DO NOTHING;

-- =============================================
-- End of Migration: Subscription Foundation
-- =============================================

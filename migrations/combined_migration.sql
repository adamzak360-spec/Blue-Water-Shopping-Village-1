
-- =============================================
-- Migration: Add delivery fee columns
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_tamale INTEGER DEFAULT 50;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_greater_accra INTEGER DEFAULT 30;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_lesser_accra INTEGER DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_fedex INTEGER DEFAULT 150;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_dhl INTEGER DEFAULT 150;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_ups INTEGER DEFAULT 150;

-- =============================================
-- Migration: Create notifications table
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

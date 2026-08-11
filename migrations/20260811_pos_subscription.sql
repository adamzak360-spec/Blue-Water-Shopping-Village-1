-- Add POS subscription fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS pos_subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pos_subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create a table for POS subscription plans/prices per country
CREATE TABLE IF NOT EXISTS public.pos_subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code TEXT NOT NULL,
    monthly_price DECIMAL(12,2) NOT NULL,
    currency_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert some default plans
INSERT INTO public.pos_subscription_plans (country_code, monthly_price, currency_code)
VALUES 
('GH', 50.00, 'GHS'),
('NG', 5000.00, 'NGN'),
('KE', 1000.00, 'KES'),
('US', 10.00, 'USD'),
('GB', 8.00, 'GBP')
ON CONFLICT DO NOTHING;

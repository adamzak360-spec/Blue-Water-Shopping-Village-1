-- Create call_to_order_settings table for managing the phone number displayed in the banner
CREATE TABLE IF NOT EXISTS call_to_order_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL DEFAULT '+233 53 855 7781',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE call_to_order_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to read (anyone can see the phone number)
CREATE POLICY "Allow public read" ON call_to_order_settings
  FOR SELECT
  USING (true);

-- Allow only admins to update
CREATE POLICY "Allow admin update" ON call_to_order_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin%'
    )
  );

-- Insert default record
INSERT INTO call_to_order_settings (phone_number, is_active)
VALUES ('+233 53 855 7781', true)
ON CONFLICT DO NOTHING;

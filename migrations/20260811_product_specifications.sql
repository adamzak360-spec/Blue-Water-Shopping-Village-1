-- Add specifications column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb;

-- Example structure: [{"label": "Material", "value": "Cotton"}, {"label": "Voltage", "value": "220V"}]

-- Add new columns to shirt_models for photo variations
ALTER TABLE shirt_models 
ADD COLUMN IF NOT EXISTS image_front_small_logo TEXT,
ADD COLUMN IF NOT EXISTS image_front_large_logo TEXT,
ADD COLUMN IF NOT EXISTS image_front_clean TEXT,
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

-- Create storage bucket for customer logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-logos', 'customer-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for customer logos bucket
CREATE POLICY "Public can view customer logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'customer-logos');

CREATE POLICY "Anyone can upload customer logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'customer-logos');

CREATE POLICY "Anyone can update their customer logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'customer-logos');

CREATE POLICY "Anyone can delete customer logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'customer-logos');
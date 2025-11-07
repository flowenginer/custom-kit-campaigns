-- Add segment_id to shirt_models table
ALTER TABLE public.shirt_models 
ADD COLUMN segment_id uuid REFERENCES public.segments(id) ON DELETE CASCADE;

-- Create storage bucket for shirt model images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shirt-models-images', 'shirt-models-images', true);

-- Storage policies for shirt-models-images bucket
-- Authenticated admins can upload
CREATE POLICY "Admins can upload shirt model images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shirt-models-images' 
  AND auth.role() = 'authenticated'
);

-- Authenticated admins can update
CREATE POLICY "Admins can update shirt model images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shirt-models-images' 
  AND auth.role() = 'authenticated'
);

-- Authenticated admins can delete
CREATE POLICY "Admins can delete shirt model images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shirt-models-images' 
  AND auth.role() = 'authenticated'
);

-- Public can view shirt model images
CREATE POLICY "Public can view shirt model images"
ON storage.objects FOR SELECT
USING (bucket_id = 'shirt-models-images');

-- Drop campaign_models table as it's no longer needed
DROP TABLE IF EXISTS public.campaign_models;
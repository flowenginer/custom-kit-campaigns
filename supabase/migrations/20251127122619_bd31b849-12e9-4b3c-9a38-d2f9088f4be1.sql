-- Create storage bucket for campaign assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for campaign-assets bucket
CREATE POLICY "Anyone can view campaign assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated users can upload campaign assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-assets' 
  AND auth.role() = 'authenticated'
);
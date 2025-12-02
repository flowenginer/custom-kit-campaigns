-- Add Bling OAuth credentials columns to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS bling_client_id TEXT,
ADD COLUMN IF NOT EXISTS bling_client_secret TEXT;
-- Add custom scripts columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS custom_head_scripts TEXT,
ADD COLUMN IF NOT EXISTS custom_body_scripts TEXT;

COMMENT ON COLUMN public.campaigns.custom_head_scripts IS 'Scripts personalizados para inserir no <head> (GTM, Analytics, Clarity, etc.)';
COMMENT ON COLUMN public.campaigns.custom_body_scripts IS 'Scripts personalizados para inserir no início do <body> (GTM noscript, pixels, etc.)';
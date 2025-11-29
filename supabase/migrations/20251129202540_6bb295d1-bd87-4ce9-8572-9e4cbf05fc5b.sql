-- Add Bling integration fields to company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS bling_api_key TEXT,
ADD COLUMN IF NOT EXISTS bling_environment VARCHAR(20) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS bling_enabled BOOLEAN DEFAULT false;
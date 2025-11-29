-- Add custom domain field to company settings
ALTER TABLE company_settings 
ADD COLUMN custom_domain TEXT DEFAULT NULL;
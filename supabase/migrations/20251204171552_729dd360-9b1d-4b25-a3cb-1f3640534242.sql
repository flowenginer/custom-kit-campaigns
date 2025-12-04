-- Add shipping markup configuration fields to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS shipping_markup_type text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS shipping_markup_value numeric DEFAULT 0;
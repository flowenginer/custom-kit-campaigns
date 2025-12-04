-- Add shipping options and selected shipping to quotes table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS shipping_options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selected_shipping jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shipping_value numeric DEFAULT 0;
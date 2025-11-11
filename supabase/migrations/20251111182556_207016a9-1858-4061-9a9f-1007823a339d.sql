-- Add SKU column to shirt_models table
ALTER TABLE public.shirt_models 
ADD COLUMN sku text;
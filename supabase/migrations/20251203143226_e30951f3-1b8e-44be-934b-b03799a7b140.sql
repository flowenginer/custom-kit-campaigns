-- Add discount fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_before_discount numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.quotes.discount_type IS 'Type of discount: percentage or fixed';
COMMENT ON COLUMN public.quotes.discount_value IS 'Discount value (percentage 0-100 or fixed amount)';
COMMENT ON COLUMN public.quotes.subtotal_before_discount IS 'Total before discount applied';
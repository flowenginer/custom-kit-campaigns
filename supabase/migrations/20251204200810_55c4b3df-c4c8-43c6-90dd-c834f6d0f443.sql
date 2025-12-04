-- Add quote_number and is_active columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN quote_number integer DEFAULT 1,
ADD COLUMN is_active boolean DEFAULT true;

-- Create index for faster queries
CREATE INDEX idx_quotes_task_id_active ON public.quotes(task_id, is_active);

-- Create function to auto-increment quote_number per task
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  max_number integer;
BEGIN
  SELECT COALESCE(MAX(quote_number), 0) INTO max_number
  FROM public.quotes
  WHERE task_id = NEW.task_id;
  
  NEW.quote_number := max_number + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto quote_number
CREATE TRIGGER set_quote_number_trigger
BEFORE INSERT ON public.quotes
FOR EACH ROW
WHEN (NEW.quote_number IS NULL OR NEW.quote_number = 1)
EXECUTE FUNCTION public.set_quote_number();
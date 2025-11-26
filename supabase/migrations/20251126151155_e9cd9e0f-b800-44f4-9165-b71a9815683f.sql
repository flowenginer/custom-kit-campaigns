-- Corrigir função para ter search_path definido
CREATE OR REPLACE FUNCTION update_urgent_reasons_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
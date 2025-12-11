-- Função RPC SECURITY DEFINER para criar cliente via link de cadastro
-- Isso evita problemas de RLS já que a função executa com privilégios do owner

CREATE OR REPLACE FUNCTION public.create_customer_from_registration(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_person_type TEXT DEFAULT 'pf',
  p_cpf TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_state_registration TEXT DEFAULT NULL,
  p_birth_date TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT '',
  p_state TEXT DEFAULT '',
  p_city TEXT DEFAULT '',
  p_neighborhood TEXT DEFAULT '',
  p_street TEXT DEFAULT '',
  p_number TEXT DEFAULT '',
  p_complement TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id UUID;
  v_birth_date DATE := NULL;
BEGIN
  -- Converter birth_date se fornecido
  IF p_birth_date IS NOT NULL AND p_birth_date != '' THEN
    v_birth_date := p_birth_date::DATE;
  END IF;

  INSERT INTO customers (
    name, phone, email, person_type, cpf, cnpj, company_name,
    state_registration, birth_date, cep, state, city, neighborhood,
    street, number, complement, created_by
  ) VALUES (
    p_name, 
    p_phone, 
    NULLIF(p_email, ''), 
    p_person_type, 
    NULLIF(p_cpf, ''), 
    NULLIF(p_cnpj, ''), 
    NULLIF(p_company_name, ''),
    NULLIF(p_state_registration, ''), 
    v_birth_date,
    p_cep, 
    p_state, 
    p_city, 
    p_neighborhood, 
    p_street, 
    p_number, 
    NULLIF(p_complement, ''), 
    p_created_by
  )
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$;

-- Permitir que usuários anônimos e autenticados chamem esta função
GRANT EXECUTE ON FUNCTION public.create_customer_from_registration TO anon, authenticated;
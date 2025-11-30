-- Função SECURITY DEFINER para verificar cliente existente
-- Ignora RLS e retorna apenas dados necessários para verificação de duplicidade
CREATE OR REPLACE FUNCTION public.check_customer_exists(
  p_cpf TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
BEGIN
  -- Buscar por CPF se fornecido
  IF p_cpf IS NOT NULL THEN
    SELECT id, name, company_name, phone, cpf, cnpj
    INTO v_customer
    FROM customers
    WHERE cpf = p_cpf
    LIMIT 1;
  -- Buscar por CNPJ se fornecido
  ELSIF p_cnpj IS NOT NULL THEN
    SELECT id, name, company_name, phone, cpf, cnpj
    INTO v_customer
    FROM customers
    WHERE cnpj = p_cnpj
    LIMIT 1;
  ELSE
    RETURN NULL;
  END IF;
  
  -- Se não encontrou nada, retorna NULL
  IF v_customer IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retorna JSON com dados básicos do cliente
  RETURN json_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'company_name', v_customer.company_name,
    'phone', v_customer.phone,
    'cpf', v_customer.cpf,
    'cnpj', v_customer.cnpj
  );
END;
$$;
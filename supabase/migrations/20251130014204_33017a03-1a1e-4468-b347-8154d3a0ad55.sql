-- Adicionar coluna is_active na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Criar função SECURITY DEFINER para criar notificação de cadastro completo
-- Permite que usuários anônimos (clientes) criem notificações para vendedores
CREATE OR REPLACE FUNCTION public.notify_customer_registered(
  p_user_id UUID,
  p_task_id UUID,
  p_customer_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, task_id, title, message, type, customer_name)
  VALUES (
    p_user_id,
    p_task_id,
    '📋 Cliente Cadastrado',
    'O cliente ' || p_customer_name || ' completou o cadastro via link!',
    'customer_registered',
    p_customer_name
  );
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.notify_customer_registered TO anon;
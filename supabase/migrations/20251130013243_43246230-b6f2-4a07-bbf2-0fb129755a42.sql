-- Criar função SECURITY DEFINER para atualizar customer_id em design_tasks
-- Isso permite que usuários anônimos (clientes) atualizem a task sem violar RLS
CREATE OR REPLACE FUNCTION public.update_task_customer_id(
  p_task_id UUID,
  p_customer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE design_tasks 
  SET customer_id = p_customer_id,
      registration_completed_at = now()
  WHERE id = p_task_id;
END;
$$;
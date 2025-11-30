-- Criar função RPC para marcar link de cadastro como usado
CREATE OR REPLACE FUNCTION public.complete_customer_registration(
  p_token text,
  p_customer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
  v_task_id uuid;
  v_created_by uuid;
BEGIN
  -- Buscar link válido
  SELECT id, task_id, created_by
  INTO v_link_id, v_task_id, v_created_by
  FROM customer_registration_links
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF v_link_id IS NULL THEN
    RAISE EXCEPTION 'Link inválido ou expirado';
  END IF;
  
  -- Atualizar link como usado
  UPDATE customer_registration_links
  SET used_at = now(),
      customer_id = p_customer_id
  WHERE id = v_link_id;
  
  -- Atualizar task com customer_id
  IF v_task_id IS NOT NULL THEN
    UPDATE design_tasks
    SET customer_id = p_customer_id,
        registration_completed_at = now()
    WHERE id = v_task_id;
  END IF;
END;
$$;
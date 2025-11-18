-- Modificar função para atribuir vendedor aleatório quando needs_logo=true
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_created_by uuid;
  v_needs_logo boolean;
  v_random_salesperson uuid;
BEGIN
  -- Buscar lead_id, created_by e needs_logo relacionados ao order
  SELECT id, created_by, needs_logo 
  INTO v_lead_id, v_created_by, v_needs_logo
  FROM public.leads
  WHERE session_id = NEW.session_id
  LIMIT 1;

  -- Se needs_logo=true e não tem created_by, atribuir a um vendedor aleatório
  IF v_needs_logo = true AND v_created_by IS NULL THEN
    SELECT user_id INTO v_random_salesperson
    FROM public.user_roles
    WHERE role = 'salesperson'
    ORDER BY RANDOM()
    LIMIT 1;
    
    v_created_by := v_random_salesperson;
    
    -- Atualizar lead com vendedor atribuído
    UPDATE public.leads
    SET created_by = v_created_by,
        salesperson_status = 'awaiting_logo'
    WHERE id = v_lead_id;
  END IF;

  INSERT INTO public.design_tasks (
    order_id,
    lead_id,
    campaign_id,
    status,
    priority,
    created_by
  )
  VALUES (
    NEW.id,
    v_lead_id,
    NEW.campaign_id,
    'pending',
    'normal',
    v_created_by
  );
  
  -- Log the creation
  INSERT INTO public.design_task_history (
    task_id,
    action,
    new_status,
    notes
  )
  VALUES (
    (SELECT id FROM public.design_tasks WHERE order_id = NEW.id),
    'created',
    'pending',
    'Tarefa criada automaticamente a partir do pedido'
  );
  
  RETURN NEW;
END;
$$;
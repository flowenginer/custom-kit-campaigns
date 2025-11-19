-- Recriar a função create_design_task_on_order com a flag created_by_salesperson
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_created_by uuid;
  v_needs_logo boolean;
  v_random_salesperson uuid;
  v_created_by_salesperson boolean;
BEGIN
  -- Buscar lead_id, created_by, needs_logo E created_by_salesperson
  SELECT id, created_by, needs_logo, created_by_salesperson
  INTO v_lead_id, v_created_by, v_needs_logo, v_created_by_salesperson
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
    created_by,
    created_by_salesperson
  )
  VALUES (
    NEW.id,
    v_lead_id,
    NEW.campaign_id,
    'pending',
    'normal',
    v_created_by,
    COALESCE(v_created_by_salesperson, false)
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
    CASE 
      WHEN v_created_by_salesperson THEN 'Tarefa criada por vendedor'
      ELSE 'Tarefa criada automaticamente a partir do pedido'
    END
  );
  
  RETURN NEW;
END;
$function$;

-- Atualizar tasks existentes que foram criadas por vendedores
UPDATE design_tasks dt
SET created_by_salesperson = true
FROM leads l
WHERE dt.lead_id = l.id
  AND l.created_by_salesperson = true
  AND dt.created_by_salesperson = false
  AND dt.created_by IS NOT NULL;

-- Log da atualização para tasks corrigidas
INSERT INTO design_task_history (task_id, action, notes)
SELECT 
  dt.id,
  'updated',
  'Flag created_by_salesperson corrigida automaticamente'
FROM design_tasks dt
JOIN leads l ON dt.lead_id = l.id
WHERE l.created_by_salesperson = true
  AND dt.created_by_salesperson = true
  AND dt.created_by IS NOT NULL;
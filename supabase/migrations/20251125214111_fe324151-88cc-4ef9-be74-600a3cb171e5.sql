-- Corrigir trigger para associar lead correto à task
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id uuid;
  v_created_by uuid;
  v_needs_logo boolean;
  v_random_salesperson uuid;
  v_created_by_salesperson boolean;
BEGIN
  -- ✅ CORREÇÃO: Buscar lead pelo ORDER_ID (mais preciso)
  SELECT id, created_by, needs_logo, created_by_salesperson
  INTO v_lead_id, v_created_by, v_needs_logo, v_created_by_salesperson
  FROM public.leads
  WHERE order_id = NEW.id
  LIMIT 1;
  
  -- Se não encontrou pelo order_id, busca pelo session_id (mais recente)
  IF v_lead_id IS NULL THEN
    SELECT id, created_by, needs_logo, created_by_salesperson
    INTO v_lead_id, v_created_by, v_needs_logo, v_created_by_salesperson
    FROM public.leads
    WHERE session_id = NEW.session_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Se needs_logo=true e não tem created_by, atribuir vendedor aleatório
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Corrigir task específica que foi reportada com lead errado
UPDATE design_tasks 
SET lead_id = '66a50638-23c9-4bf2-be64-dc7128386ea9'
WHERE id = 'd319d111-3a30-4c2d-af5d-774d49ea9ef7';
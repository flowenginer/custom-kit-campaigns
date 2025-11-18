-- 1. Adicionar campo created_by na tabela leads se não existir
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Atualizar a função create_design_task_on_order para incluir created_by
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_created_by uuid;
BEGIN
  -- Buscar lead_id e created_by relacionados ao order
  SELECT id, created_by INTO v_lead_id, v_created_by
  FROM public.leads
  WHERE session_id = NEW.session_id
  LIMIT 1;

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

-- 3. Recriar trigger on_order_created
DROP TRIGGER IF EXISTS on_order_created ON public.orders;

CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_design_task_on_order();
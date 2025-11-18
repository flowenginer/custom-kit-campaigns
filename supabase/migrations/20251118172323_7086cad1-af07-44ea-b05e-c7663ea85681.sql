-- 1. Adicionar coluna created_by na tabela design_tasks
ALTER TABLE public.design_tasks 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- 2. Criar índice para performance
CREATE INDEX idx_design_tasks_created_by ON public.design_tasks(created_by);

-- 3. Atualizar tasks existentes criadas por vendedores (usar o primeiro usuário salesperson como fallback)
UPDATE public.design_tasks dt
SET created_by = (
  SELECT ur.user_id
  FROM user_roles ur
  WHERE ur.role = 'salesperson'
  LIMIT 1
)
WHERE dt.created_by_salesperson = true AND dt.created_by IS NULL;

-- 4. Atualizar função de notificação para incluir vendedores
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_customer_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  SELECT o.customer_name INTO v_customer_name
  FROM orders o
  WHERE o.id = NEW.order_id;

  -- Notificar DESIGNER (assigned_to)
  IF NEW.assigned_to IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_title := 'Status da Tarefa Atualizado';
    v_message := CASE 
      WHEN NEW.status = 'in_progress' THEN 'A tarefa de ' || v_customer_name || ' foi iniciada'
      WHEN NEW.status = 'awaiting_approval' THEN 'A tarefa de ' || v_customer_name || ' foi enviada para aprovação'
      WHEN NEW.status = 'approved' THEN 'A tarefa de ' || v_customer_name || ' foi aprovada pelo cliente'
      WHEN NEW.status = 'changes_requested' THEN 'Alterações solicitadas na tarefa de ' || v_customer_name
      WHEN NEW.status = 'completed' THEN 'A tarefa de ' || v_customer_name || ' foi enviada para produção'
      ELSE 'Status da tarefa de ' || v_customer_name || ' foi alterado'
    END;

    INSERT INTO public.notifications (
      user_id,
      task_id,
      title,
      message,
      type,
      task_status,
      customer_name
    ) VALUES (
      NEW.assigned_to,
      NEW.id,
      v_title,
      v_message,
      'status_change',
      NEW.status,
      v_customer_name
    );
  END IF;

  -- Notificar VENDEDOR quando mockup estiver pronto, aprovado ou concluído
  IF NEW.created_by IS NOT NULL 
     AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('awaiting_approval', 'approved', 'completed') THEN
    
    v_title := CASE
      WHEN NEW.status = 'awaiting_approval' THEN '✅ Mockup Pronto para Aprovação'
      WHEN NEW.status = 'approved' THEN '🎉 Mockup Aprovado'
      WHEN NEW.status = 'completed' THEN '📦 Pedido Enviado para Produção'
    END;
    
    v_message := CASE
      WHEN NEW.status = 'awaiting_approval' THEN 'O mockup de ' || v_customer_name || ' está pronto! Clique para visualizar e aprovar.'
      WHEN NEW.status = 'approved' THEN 'O mockup de ' || v_customer_name || ' foi aprovado e segue para produção.'
      WHEN NEW.status = 'completed' THEN 'O pedido de ' || v_customer_name || ' foi enviado para produção.'
    END;

    INSERT INTO public.notifications (
      user_id,
      task_id,
      title,
      message,
      type,
      task_status,
      customer_name
    ) VALUES (
      NEW.created_by,
      NEW.id,
      v_title,
      v_message,
      'approval',
      NEW.status,
      v_customer_name
    );
  END IF;

  -- Atualizar salesperson_status da lead quando status muda
  IF NEW.status = 'awaiting_approval' THEN
    UPDATE public.leads
    SET salesperson_status = 'awaiting_final_confirmation'
    WHERE order_id = NEW.order_id;
  ELSIF NEW.status = 'changes_requested' THEN
    UPDATE public.leads
    SET salesperson_status = 'sent_to_designer'
    WHERE order_id = NEW.order_id;
  ELSIF NEW.status = 'approved' OR NEW.status = 'completed' THEN
    UPDATE public.leads
    SET salesperson_status = 'approved'
    WHERE order_id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Criar RLS policies para vendedores visualizarem suas próprias tasks
CREATE POLICY "Salespersons can view own tasks"
ON public.design_tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role)
  AND created_by = auth.uid()
);

-- 6. Criar RLS policy para vendedores aprovarem suas próprias tasks
CREATE POLICY "Salespersons can approve own tasks"
ON public.design_tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'salesperson'::app_role)
  AND created_by = auth.uid()
  AND status = 'awaiting_approval'
)
WITH CHECK (
  has_role(auth.uid(), 'salesperson'::app_role)
  AND created_by = auth.uid()
  AND status IN ('approved', 'changes_requested')
);
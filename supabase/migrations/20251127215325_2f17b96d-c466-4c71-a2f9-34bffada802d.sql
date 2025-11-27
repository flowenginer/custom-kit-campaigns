-- Corrigir funções existentes sem search_path

CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_design_task_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.design_task_history (
      task_id,
      action,
      old_status,
      new_status,
      notes
    )
    VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.status = 'in_progress' THEN 'Tarefa iniciada'
        WHEN NEW.status = 'awaiting_approval' THEN 'Enviado para aprovação'
        WHEN NEW.status = 'approved' THEN 'Aprovado pelo cliente'
        WHEN NEW.status = 'changes_requested' THEN 'Alterações solicitadas'
        WHEN NEW.status = 'completed' THEN 'Enviado para produção'
        ELSE 'Status alterado'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;
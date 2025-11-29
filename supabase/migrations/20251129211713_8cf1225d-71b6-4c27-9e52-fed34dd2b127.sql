-- Função que notifica o vendedor quando cliente é cadastrado
CREATE OR REPLACE FUNCTION public.notify_customer_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_name TEXT;
  v_salesperson_id UUID;
BEGIN
  -- Só notifica se customer_id mudou de NULL para um valor
  IF OLD.customer_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    -- Buscar nome do cliente
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    -- Buscar o vendedor (created_by da task)
    v_salesperson_id := NEW.created_by;

    -- Se existe vendedor, criar notificação
    IF v_salesperson_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        task_id,
        title,
        message,
        type,
        task_status,
        customer_name
      ) VALUES (
        v_salesperson_id,
        NEW.id,
        '📋 Cadastro Concluído',
        'O cliente ' || COALESCE(v_customer_name, 'N/A') || ' completou o cadastro via link.',
        'customer_registered',
        NEW.status,
        v_customer_name
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger na tabela design_tasks
DROP TRIGGER IF EXISTS on_customer_registration ON design_tasks;
CREATE TRIGGER on_customer_registration
  AFTER UPDATE OF customer_id ON design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_registration();
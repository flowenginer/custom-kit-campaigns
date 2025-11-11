-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'assignment', 'approval', 'comment')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  task_status TEXT,
  customer_name TEXT
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification on task status change
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
  -- Get customer name from orders
  SELECT o.customer_name INTO v_customer_name
  FROM orders o
  WHERE o.id = NEW.order_id;

  -- Create notification for assigned designer
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

  RETURN NEW;
END;
$$;

-- Function to notify when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Get customer name
    SELECT o.customer_name INTO v_customer_name
    FROM orders o
    WHERE o.id = NEW.order_id;

    -- Create notification for newly assigned user
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
      'Nova Tarefa Atribuída',
      'Você foi atribuído à tarefa de ' || v_customer_name,
      'assignment',
      NEW.status,
      v_customer_name
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_task_status_change
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();

CREATE TRIGGER trigger_notify_task_assignment
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();
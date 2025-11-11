-- Create enum for task status
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'awaiting_approval',
  'approved',
  'changes_requested',
  'completed'
);

-- Create enum for priority
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create design_tasks table
CREATE TABLE public.design_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  
  -- Status and Flow
  status task_status NOT NULL DEFAULT 'pending',
  
  -- Assignment
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Files and Versions
  current_version INTEGER DEFAULT 0,
  design_files JSONB DEFAULT '[]'::jsonb,
  
  -- Client Approval
  client_feedback TEXT,
  client_approved_at TIMESTAMP WITH TIME ZONE,
  changes_notes TEXT,
  
  -- Priority and Deadline
  priority task_priority DEFAULT 'normal',
  deadline TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create design_task_history table for audit trail
CREATE TABLE public.design_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  old_status task_status,
  new_status task_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create design_task_comments table
CREATE TABLE public.design_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  user_id UUID,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX idx_design_tasks_status ON public.design_tasks(status);
CREATE INDEX idx_design_tasks_assigned ON public.design_tasks(assigned_to);
CREATE INDEX idx_design_tasks_order ON public.design_tasks(order_id);
CREATE INDEX idx_design_task_history_task ON public.design_task_history(task_id);
CREATE INDEX idx_design_task_comments_task ON public.design_task_comments(task_id);

-- Enable RLS
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_tasks
CREATE POLICY "Authenticated users can view all design tasks"
  ON public.design_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create design tasks"
  ON public.design_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update design tasks"
  ON public.design_tasks
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete design tasks"
  ON public.design_tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for design_task_history
CREATE POLICY "Authenticated users can view design task history"
  ON public.design_task_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert design task history"
  ON public.design_task_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for design_task_comments
CREATE POLICY "Authenticated users can view design task comments"
  ON public.design_task_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create design task comments"
  ON public.design_task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own comments"
  ON public.design_task_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own comments"
  ON public.design_task_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on design_tasks
CREATE TRIGGER update_design_tasks_updated_at
  BEFORE UPDATE ON public.design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create design task on order completion
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.design_tasks (
    order_id,
    lead_id,
    campaign_id,
    status,
    priority
  )
  VALUES (
    NEW.id,
    (SELECT id FROM public.leads WHERE session_id = NEW.session_id LIMIT 1),
    NEW.campaign_id,
    'pending',
    'normal'
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

-- Trigger to auto-create design task when order is created
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_design_task_on_order();

-- Function to log task status changes
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

-- Trigger to log status changes
CREATE TRIGGER log_design_task_status_change
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_design_task_status_change();
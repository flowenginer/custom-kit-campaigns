
-- Create quotes table for storing quote data
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'correction_requested', 'approved', 'expired')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  correction_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_name TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view quotes"
ON public.quotes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert quotes"
ON public.quotes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update quotes"
ON public.quotes FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view quotes by token"
ON public.quotes FOR SELECT
USING (true);

CREATE POLICY "Public can update quote status"
ON public.quotes FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create index for token lookups
CREATE INDEX idx_quotes_token ON public.quotes(token);
CREATE INDEX idx_quotes_task_id ON public.quotes(task_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);

-- Trigger to update updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify salesperson when quote status changes
CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_customer_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get task and customer info
    SELECT dt.*, o.customer_name INTO v_task
    FROM design_tasks dt
    JOIN orders o ON o.id = dt.order_id
    WHERE dt.id = NEW.task_id;
    
    v_customer_name := v_task.customer_name;
    
    -- Create notification based on status
    IF NEW.status = 'correction_requested' THEN
      v_title := '🔄 Correção de Orçamento Solicitada';
      v_message := 'O cliente ' || v_customer_name || ' solicitou ajustes no orçamento.';
    ELSIF NEW.status = 'approved' THEN
      v_title := '✅ Orçamento Aprovado!';
      v_message := 'O cliente ' || v_customer_name || ' aprovou o orçamento de R$ ' || NEW.total_amount::TEXT;
    ELSE
      RETURN NEW;
    END IF;
    
    -- Insert notification for salesperson (created_by)
    IF v_task.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        task_id,
        title,
        message,
        type,
        customer_name
      ) VALUES (
        v_task.created_by,
        NEW.task_id,
        v_title,
        v_message,
        CASE WHEN NEW.status = 'approved' THEN 'approval' ELSE 'status_change' END,
        v_customer_name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for quote status notifications
CREATE TRIGGER notify_quote_status
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_status_change();

-- Enable realtime for quotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;

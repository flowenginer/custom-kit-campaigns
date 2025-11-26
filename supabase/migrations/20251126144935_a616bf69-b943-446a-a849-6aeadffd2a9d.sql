-- Create pending_urgent_requests table
CREATE TABLE public.pending_urgent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request data (saved to create later)
  request_data JSONB NOT NULL,
  requested_priority task_priority NOT NULL DEFAULT 'urgent',
  
  -- Who requested
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  
  -- Approval status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  -- Who reviewed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  final_priority task_priority,
  rejection_reason TEXT,
  
  -- Result
  created_order_id UUID REFERENCES public.orders(id),
  created_task_id UUID REFERENCES public.design_tasks(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_urgent_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Salespersons can view own pending requests"
ON public.pending_urgent_requests
FOR SELECT
USING (has_role(auth.uid(), 'salesperson'::app_role) AND requested_by = auth.uid());

CREATE POLICY "Salespersons can insert pending requests"
ON public.pending_urgent_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'salesperson'::app_role) AND requested_by = auth.uid());

CREATE POLICY "Admins can view all pending requests"
ON public.pending_urgent_requests
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update pending requests"
ON public.pending_urgent_requests
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Super admins full access to pending_urgent_requests"
ON public.pending_urgent_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_pending_urgent_requests_updated_at
BEFORE UPDATE ON public.pending_urgent_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
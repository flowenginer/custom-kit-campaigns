-- Create table for pending priority change requests
CREATE TABLE public.pending_priority_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  current_priority task_priority NOT NULL,
  requested_priority task_priority NOT NULL,
  urgent_reason_id UUID REFERENCES public.urgent_reasons(id),
  urgent_reason_text TEXT,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_priority_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Salespersons can insert own priority change requests"
ON public.pending_priority_change_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid()
);

CREATE POLICY "Salespersons can view own priority change requests"
ON public.pending_priority_change_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid()
);

CREATE POLICY "Admins can view all priority change requests"
ON public.pending_priority_change_requests
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update priority change requests"
ON public.pending_priority_change_requests
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Super admins full access to priority change requests"
ON public.pending_priority_change_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_pending_priority_change_requests_updated_at
BEFORE UPDATE ON public.pending_priority_change_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
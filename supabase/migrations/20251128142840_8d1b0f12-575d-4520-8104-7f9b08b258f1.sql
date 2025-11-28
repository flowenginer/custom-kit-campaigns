-- Create table for delete task requests
CREATE TABLE IF NOT EXISTS public.pending_delete_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_delete_requests ENABLE ROW LEVEL SECURITY;

-- Salespersons can insert delete requests for their own tasks
CREATE POLICY "Salespersons can insert delete requests"
  ON public.pending_delete_requests
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'salesperson'::app_role) 
    AND requested_by = auth.uid()
  );

-- Salespersons can view their own delete requests
CREATE POLICY "Salespersons can view own delete requests"
  ON public.pending_delete_requests
  FOR SELECT
  USING (
    has_role(auth.uid(), 'salesperson'::app_role) 
    AND requested_by = auth.uid()
  );

-- Admins can view all delete requests
CREATE POLICY "Admins can view all delete requests"
  ON public.pending_delete_requests
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can update delete requests (approve/reject)
CREATE POLICY "Admins can update delete requests"
  ON public.pending_delete_requests
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access to pending_delete_requests"
  ON public.pending_delete_requests
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pending_delete_requests_task_id ON public.pending_delete_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_pending_delete_requests_status ON public.pending_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_pending_delete_requests_requested_by ON public.pending_delete_requests(requested_by);
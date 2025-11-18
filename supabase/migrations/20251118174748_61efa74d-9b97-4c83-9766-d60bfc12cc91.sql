-- Add soft delete column to leads, orders, and design_tasks tables
ALTER TABLE public.leads 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.orders 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.design_tasks 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for better query performance on deleted_at
CREATE INDEX idx_leads_deleted_at ON public.leads(deleted_at);
CREATE INDEX idx_orders_deleted_at ON public.orders(deleted_at);
CREATE INDEX idx_design_tasks_deleted_at ON public.design_tasks(deleted_at);

-- Add comments to explain the soft delete pattern
COMMENT ON COLUMN public.leads.deleted_at IS 'Timestamp when the lead was soft-deleted. NULL means active.';
COMMENT ON COLUMN public.orders.deleted_at IS 'Timestamp when the order was soft-deleted. NULL means active.';
COMMENT ON COLUMN public.design_tasks.deleted_at IS 'Timestamp when the task was soft-deleted. NULL means active.';
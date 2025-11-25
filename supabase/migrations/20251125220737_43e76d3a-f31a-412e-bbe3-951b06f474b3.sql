-- Add deleted_at column to campaigns table for soft delete
ALTER TABLE public.campaigns 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance on non-deleted campaigns
CREATE INDEX idx_campaigns_deleted_at ON public.campaigns(deleted_at) WHERE deleted_at IS NULL;
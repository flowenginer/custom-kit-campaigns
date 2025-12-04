-- Create shipment_history table for tracking all shipments
CREATE TABLE public.shipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  melhor_envio_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  tracking_code TEXT,
  label_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  status_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  posted_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view shipment history" 
ON public.shipment_history FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert shipment history" 
ON public.shipment_history FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipment history" 
ON public.shipment_history FOR UPDATE 
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX idx_shipment_history_task_id ON public.shipment_history(task_id);
CREATE INDEX idx_shipment_history_melhor_envio_id ON public.shipment_history(melhor_envio_id);
CREATE INDEX idx_shipment_history_status ON public.shipment_history(status);

-- Trigger for updated_at
CREATE TRIGGER update_shipment_history_updated_at
  BEFORE UPDATE ON public.shipment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for shipment_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_history;
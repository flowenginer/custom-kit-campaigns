-- Criar tabela para logs de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Index para buscar logs por tarefa
CREATE INDEX idx_webhook_logs_task_id ON public.webhook_logs(task_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
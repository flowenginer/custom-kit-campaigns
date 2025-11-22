-- Adicionar apenas orders à publicação realtime (leads e design_tasks já estão)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Garantir que todas as tabelas tenham REPLICA IDENTITY FULL
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.design_tasks REPLICA IDENTITY FULL;
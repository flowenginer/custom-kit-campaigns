-- Criar tabela ab_tests
CREATE TABLE public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unique_link text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  
  -- Configuração do teste
  campaigns jsonb NOT NULL,
  
  -- Critérios de conclusão
  completion_criteria jsonb NOT NULL DEFAULT '{}',
  
  -- Métricas em tempo real
  total_visits integer DEFAULT 0,
  actual_distribution jsonb DEFAULT '{}',
  
  -- Datas
  started_at timestamp with time zone DEFAULT now(),
  paused_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Criador do teste
  created_by uuid
);

-- Índices para performance
CREATE INDEX idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX idx_ab_tests_unique_link ON public.ab_tests(unique_link);

-- Modificar tabela leads para rastreamento de A/B
ALTER TABLE public.leads
ADD COLUMN ab_test_id uuid REFERENCES public.ab_tests(id) ON DELETE SET NULL,
ADD COLUMN ab_variant uuid;

-- Índice para análise
CREATE INDEX idx_leads_ab_test ON public.leads(ab_test_id, ab_variant);

-- Criar tabela ab_test_events para histórico detalhado
CREATE TABLE public.ab_test_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id uuid NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  campaign_id uuid,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ab_test_events_test_id ON public.ab_test_events(ab_test_id);
CREATE INDEX idx_ab_test_events_type ON public.ab_test_events(event_type);

-- RLS Policies para ab_tests
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ab_tests"
  ON public.ab_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ab_tests"
  ON public.ab_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own ab_tests"
  ON public.ab_tests FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete own ab_tests"
  ON public.ab_tests FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies para ab_test_events
ALTER TABLE public.ab_test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ab_test_events"
  ON public.ab_test_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view ab_test_events"
  ON public.ab_test_events FOR SELECT
  TO authenticated
  USING (true);

-- Function para incrementar visitas
CREATE OR REPLACE FUNCTION increment_ab_test_visit(test_id uuid, variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ab_tests
  SET 
    total_visits = total_visits + 1,
    actual_distribution = jsonb_set(
      COALESCE(actual_distribution, '{}'::jsonb),
      ARRAY[variant_id::text],
      to_jsonb(COALESCE((actual_distribution->variant_id::text)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE id = test_id;
END;
$$;

-- Trigger para notificação de conclusão
CREATE OR REPLACE FUNCTION notify_ab_test_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      NEW.created_by,
      'Teste A/B Concluído',
      'O teste "' || NEW.name || '" foi concluído. Veja os resultados!',
      'ab_test_completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ab_test_completion
  AFTER UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION notify_ab_test_completion();
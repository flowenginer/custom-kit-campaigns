-- Criar tabela de motivos de urgência
CREATE TABLE IF NOT EXISTS public.urgent_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.urgent_reasons ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem visualizar motivos ativos"
  ON public.urgent_reasons
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar motivos"
  ON public.urgent_reasons
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Adicionar campos na tabela pending_urgent_requests
ALTER TABLE public.pending_urgent_requests 
  ADD COLUMN IF NOT EXISTS urgent_reason_id UUID REFERENCES public.urgent_reasons(id),
  ADD COLUMN IF NOT EXISTS urgent_reason_text TEXT;

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_urgent_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_urgent_reasons_updated_at
  BEFORE UPDATE ON public.urgent_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_urgent_reasons_updated_at();

-- Inserir motivos padrão
INSERT INTO public.urgent_reasons (label, description, display_order) VALUES
  ('Evento em menos de 3 dias', 'O cliente tem um evento muito próximo', 1),
  ('Cliente VIP/Grande quantidade', 'Cliente importante ou pedido volumoso', 2),
  ('Reposição de pedido com problema', 'Precisa repor uniformes com defeito', 3),
  ('Parceria especial', 'Acordo especial que exige agilidade', 4),
  ('Outro (especificar)', 'Motivo não listado acima', 99);
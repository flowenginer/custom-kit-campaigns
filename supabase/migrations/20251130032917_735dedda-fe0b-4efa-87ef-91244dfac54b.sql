-- Criar tabela de variações de produtos
CREATE TABLE IF NOT EXISTS public.shirt_model_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.shirt_models(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('P', 'M', 'G', 'GG', 'XG', '2XG', '3XG')),
  gender TEXT NOT NULL DEFAULT 'unissex' CHECK (gender IN ('masculino', 'feminino', 'unissex')),
  sku_suffix TEXT,
  price_adjustment NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_shirt_model_variations_model_id ON public.shirt_model_variations(model_id);
CREATE INDEX idx_shirt_model_variations_is_active ON public.shirt_model_variations(is_active);

-- Criar constraint única para evitar variações duplicadas
CREATE UNIQUE INDEX idx_unique_variation ON public.shirt_model_variations(model_id, size, gender) WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.shirt_model_variations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para variações
CREATE POLICY "Admins podem gerenciar variações"
  ON public.shirt_model_variations
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar variações"
  ON public.shirt_model_variations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public pode visualizar variações ativas"
  ON public.shirt_model_variations
  FOR SELECT
  USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_shirt_model_variations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shirt_model_variations_timestamp
  BEFORE UPDATE ON public.shirt_model_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_shirt_model_variations_updated_at();

-- Adicionar item "Produtos" no menu
INSERT INTO public.menu_items (label, slug, icon, route, description, display_order, is_active)
VALUES (
  'Produtos',
  'produtos',
  'Package',
  '/admin/products',
  'Cadastro e gestão de produtos com variações e dados de frete',
  50,
  true
)
ON CONFLICT (slug) DO NOTHING;
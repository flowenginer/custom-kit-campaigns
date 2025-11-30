-- Criar tabela de atributos de variação (estilo Bling)
CREATE TABLE IF NOT EXISTS variation_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de presets de dimensões
CREATE TABLE IF NOT EXISTS dimension_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_tag TEXT NOT NULL,
  name TEXT NOT NULL,
  peso NUMERIC DEFAULT 0,
  altura NUMERIC DEFAULT 0,
  largura NUMERIC DEFAULT 0,
  profundidade NUMERIC DEFAULT 0,
  volumes INT DEFAULT 1,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de regras de preço
CREATE TABLE IF NOT EXISTS price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('fixed', 'adjustment', 'promotion')),
  apply_to TEXT NOT NULL CHECK (apply_to IN ('all', 'segment', 'model_tag', 'size')),
  segment_tag TEXT,
  model_tag TEXT,
  sizes TEXT[] DEFAULT '{}',
  price_value NUMERIC NOT NULL,
  is_percentage BOOLEAN DEFAULT false,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies para variation_attributes
ALTER TABLE variation_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar atributos de variação"
  ON variation_attributes FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar atributos"
  ON variation_attributes FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies para dimension_presets
ALTER TABLE dimension_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar presets de dimensões"
  ON dimension_presets FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar presets"
  ON dimension_presets FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies para price_rules
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar regras de preço"
  ON price_rules FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar regras"
  ON price_rules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserir dados padrão para variation_attributes
INSERT INTO variation_attributes (name, options, is_system, display_order) VALUES
  ('TAMANHO', ARRAY['PP','P','M','G','GG','XG','G1','G2','G3','G4','G5'], true, 1),
  ('GÊNERO', ARRAY['Masculino','Feminino','Unissex'], true, 2),
  ('COR', ARRAY['Branco','Preto','Azul','Verde','Vermelho','Amarelo'], true, 3)
ON CONFLICT DO NOTHING;

-- Inserir dados padrão para dimension_presets
INSERT INTO dimension_presets (model_tag, name, peso, altura, largura, profundidade, volumes, is_default) VALUES
  ('manga_curta', 'Manga Curta Padrão', 0.3, 35, 25, 3, 1, true),
  ('manga_longa', 'Manga Longa Padrão', 0.4, 40, 28, 4, 1, true),
  ('regata', 'Regata Padrão', 0.25, 30, 22, 2, 1, true),
  ('ziper', 'Zíper Padrão', 0.5, 42, 30, 5, 1, true)
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at em variation_attributes
CREATE OR REPLACE FUNCTION update_variation_attributes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER variation_attributes_updated_at
  BEFORE UPDATE ON variation_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_variation_attributes_updated_at();

-- Função para gerar SKU automático
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
  v_segment TEXT;
  v_type TEXT;
  v_seq INTEGER;
  v_sku TEXT;
BEGIN
  -- Se já tem SKU, não faz nada
  IF NEW.sku IS NOT NULL AND NEW.sku != '' THEN
    RETURN NEW;
  END IF;
  
  -- Pegar abreviação do segmento (primeiras 4 letras maiúsculas)
  v_segment := UPPER(COALESCE(
    LEFT(REGEXP_REPLACE(NEW.segment_tag, '[^a-zA-Z]', '', 'g'), 4),
    'PROD'
  ));
  
  -- Pegar abreviação do tipo/modelo (ML=manga longa, MC=manga curta, etc)
  v_type := CASE 
    WHEN NEW.model_tag ILIKE '%manga_longa%' OR NEW.model_tag ILIKE '%manga-longa%' THEN 'ML'
    WHEN NEW.model_tag ILIKE '%manga_curta%' OR NEW.model_tag ILIKE '%manga-curta%' THEN 'MC'
    WHEN NEW.model_tag ILIKE '%regata%' THEN 'RG'
    WHEN NEW.model_tag ILIKE '%ziper%' OR NEW.model_tag ILIKE '%zipper%' THEN 'ZP'
    WHEN NEW.model_tag ILIKE '%polo%' THEN 'PL'
    ELSE UPPER(COALESCE(LEFT(REGEXP_REPLACE(NEW.model_tag, '[^a-zA-Z]', '', 'g'), 2), 'XX'))
  END;
  
  -- Contar quantos produtos já existem com esse prefixo
  SELECT COUNT(*) + 1 INTO v_seq
  FROM shirt_models
  WHERE sku LIKE v_segment || '-' || v_type || '-%';
  
  -- Gerar SKU final
  v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
  
  -- Garantir unicidade
  WHILE EXISTS (SELECT 1 FROM shirt_models WHERE sku = v_sku) LOOP
    v_seq := v_seq + 1;
    v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
  END LOOP;
  
  NEW.sku := v_sku;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos produtos
DROP TRIGGER IF EXISTS auto_generate_sku ON shirt_models;
CREATE TRIGGER auto_generate_sku
  BEFORE INSERT ON shirt_models
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_sku();

-- Atualizar todos os produtos existentes sem SKU
DO $$
DECLARE
  r RECORD;
  v_segment TEXT;
  v_type TEXT;
  v_seq INTEGER;
  v_sku TEXT;
BEGIN
  FOR r IN SELECT id, segment_tag, model_tag FROM shirt_models WHERE sku IS NULL OR sku = '' LOOP
    -- Pegar abreviação do segmento
    v_segment := UPPER(COALESCE(
      LEFT(REGEXP_REPLACE(r.segment_tag, '[^a-zA-Z]', '', 'g'), 4),
      'PROD'
    ));
    
    -- Pegar abreviação do tipo
    v_type := CASE 
      WHEN r.model_tag ILIKE '%manga_longa%' OR r.model_tag ILIKE '%manga-longa%' THEN 'ML'
      WHEN r.model_tag ILIKE '%manga_curta%' OR r.model_tag ILIKE '%manga-curta%' THEN 'MC'
      WHEN r.model_tag ILIKE '%regata%' THEN 'RG'
      WHEN r.model_tag ILIKE '%ziper%' OR r.model_tag ILIKE '%zipper%' THEN 'ZP'
      WHEN r.model_tag ILIKE '%polo%' THEN 'PL'
      ELSE UPPER(COALESCE(LEFT(REGEXP_REPLACE(r.model_tag, '[^a-zA-Z]', '', 'g'), 2), 'XX'))
    END;
    
    -- Contar sequencial
    SELECT COUNT(*) + 1 INTO v_seq
    FROM shirt_models
    WHERE sku LIKE v_segment || '-' || v_type || '-%';
    
    -- Gerar SKU
    v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
    
    -- Garantir unicidade
    WHILE EXISTS (SELECT 1 FROM shirt_models WHERE sku = v_sku) LOOP
      v_seq := v_seq + 1;
      v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
    END LOOP;
    
    -- Atualizar produto
    UPDATE shirt_models SET sku = v_sku WHERE id = r.id;
  END LOOP;
END $$;

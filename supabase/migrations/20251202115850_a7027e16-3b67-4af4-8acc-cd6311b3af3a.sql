
-- Corrigir search_path da função de SKU
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Pegar abreviação do tipo/modelo
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
$$;

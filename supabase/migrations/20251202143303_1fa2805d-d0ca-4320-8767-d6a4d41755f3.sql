-- Função para formatar tag em nome legível (igual ao frontend)
CREATE OR REPLACE FUNCTION format_tag_to_name(tag text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tag IS NULL OR tag = '' THEN
    RETURN '';
  END IF;
  
  -- Remove underscores do final, substitui underscores por espaços, aplica initcap
  RETURN initcap(
    regexp_replace(
      regexp_replace(tag, '_+$', ''), -- Remove underscores do final
      '_', ' ', 'g' -- Substitui underscores por espaços
    )
  );
END;
$$;

-- Atualizar todos os produtos existentes com o novo formato de nome
UPDATE shirt_models
SET name = format_tag_to_name(segment_tag) || ' ' || 
           format_tag_to_name(model_tag) || ' Modelo ' || 
           LPAD(
             COALESCE(regexp_replace(name, '[^0-9]', '', 'g'), '0'),
             2, '0'
           ),
    updated_at = now()
WHERE segment_tag IS NOT NULL 
  AND model_tag IS NOT NULL
  AND segment_tag != ''
  AND model_tag != '';
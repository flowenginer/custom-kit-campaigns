-- Adicionar etapa "adicionar_logo" no workflow padrão
-- Esta etapa já existe no código mas não está no banco de dados

-- Primeiro, vamos verificar e atualizar o workflow padrão
-- A etapa "adicionar_logo" deve vir entre "sleeve_left" (order 5) e "review" (order 6)

UPDATE workflow_templates
SET workflow_config = (
  -- Construir novo array com a etapa adicionar_logo inserida
  SELECT jsonb_agg(new_step ORDER BY (new_step->>'order')::int)
  FROM (
    -- Manter etapas com order < 6 (inicial_data, select_model, customize_front, customize_back, sleeve_right, sleeve_left)
    SELECT step as new_step
    FROM jsonb_array_elements(workflow_config) AS step
    WHERE (step->>'order')::int < 6
    
    UNION ALL
    
    -- Adicionar nova etapa "adicionar_logo" com order 6
    SELECT jsonb_build_object(
      'id', 'adicionar_logo',
      'label', 'Adicionar Logo',
      'order', 6,
      'enabled', true,
      'is_custom', false
    )
    
    UNION ALL
    
    -- Incrementar order das etapas >= 6 (review e qualquer outra posterior)
    SELECT jsonb_set(
      step, 
      '{order}', 
      to_jsonb((step->>'order')::int + 1)
    ) as new_step
    FROM jsonb_array_elements(workflow_config) AS step
    WHERE (step->>'order')::int >= 6
  ) combined
),
updated_at = now()
WHERE name ILIKE '%padrão%' OR name ILIKE '%default%';

-- Verificar se foi atualizado corretamente
SELECT id, name, jsonb_pretty(workflow_config) as config
FROM workflow_templates 
WHERE name ILIKE '%padrão%' OR name ILIKE '%default%';
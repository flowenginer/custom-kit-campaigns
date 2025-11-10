-- Adicionar coluna workflow_config para configuração de etapas das campanhas
ALTER TABLE campaigns
ADD COLUMN workflow_config jsonb DEFAULT '[
  {"id": "initial_data", "label": "Dados Iniciais", "order": 0},
  {"id": "select_model", "label": "Selecionar Modelo", "order": 1},
  {"id": "customize_front", "label": "Personalizar Frente", "order": 2},
  {"id": "customize_back", "label": "Personalizar Costas", "order": 3},
  {"id": "sleeve_right", "label": "Manga Direita", "order": 4},
  {"id": "sleeve_left", "label": "Manga Esquerda", "order": 5},
  {"id": "review", "label": "Revisão e Envio", "order": 6}
]'::jsonb;
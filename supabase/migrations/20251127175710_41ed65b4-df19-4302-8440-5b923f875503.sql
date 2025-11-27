-- Remover constraint antiga que não inclui 'short'
ALTER TABLE public.segments DROP CONSTRAINT IF EXISTS segments_model_tag_check;

-- Criar nova constraint incluindo 'short' na lista de valores permitidos
ALTER TABLE public.segments ADD CONSTRAINT segments_model_tag_check 
CHECK (model_tag = ANY (ARRAY[
  'manga_longa'::text, 
  'ziper'::text, 
  'manga_curta'::text, 
  'regata'::text, 
  'kit'::text,
  'short'::text
]));
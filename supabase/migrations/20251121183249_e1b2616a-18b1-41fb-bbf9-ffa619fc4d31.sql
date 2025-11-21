-- Adicionar coluna model_tag na tabela campaigns
ALTER TABLE public.campaigns 
ADD COLUMN model_tag text NULL;

-- Adicionar comentário para documentar
COMMENT ON COLUMN public.campaigns.model_tag IS 'Tag do modelo de uniforme (ex: ziper, manga_longa, manga_curta, regata)';
-- Adicionar campo para descrição da logo que o cliente imagina
ALTER TABLE public.leads 
ADD COLUMN logo_description text;

COMMENT ON COLUMN public.leads.logo_description IS 'Descrição do que o cliente imagina para a logo quando logo_action = designer_create';
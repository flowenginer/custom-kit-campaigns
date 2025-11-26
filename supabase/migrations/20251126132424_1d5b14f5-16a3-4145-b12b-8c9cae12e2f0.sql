-- Adicionar coluna logo_action na tabela leads
ALTER TABLE leads ADD COLUMN logo_action text CHECK (logo_action IN ('designer_create', 'waiting_client'));
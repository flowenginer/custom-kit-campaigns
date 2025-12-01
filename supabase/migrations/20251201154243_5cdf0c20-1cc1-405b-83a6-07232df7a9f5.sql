-- Adicionar coluna layout_id na tabela change_requests para vincular alterações a mockups específicos
ALTER TABLE change_requests 
ADD COLUMN layout_id UUID REFERENCES design_task_layouts(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de queries por layout
CREATE INDEX idx_change_requests_layout_id ON change_requests(layout_id);
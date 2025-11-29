-- Adicionar colunas para integração com Bling e Melhor Envio
ALTER TABLE design_tasks ADD COLUMN IF NOT EXISTS bling_order_id bigint;
ALTER TABLE design_tasks ADD COLUMN IF NOT EXISTS bling_order_number text;
ALTER TABLE design_tasks ADD COLUMN IF NOT EXISTS shipping_option jsonb;
ALTER TABLE design_tasks ADD COLUMN IF NOT EXISTS shipping_value numeric;
ALTER TABLE design_tasks ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_design_tasks_customer_id ON design_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_bling_order_id ON design_tasks(bling_order_id);
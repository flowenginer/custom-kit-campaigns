-- ============================================================================
-- FASE 1: Dashboard Builder - Estrutura de Dados
-- ============================================================================

-- Tabela de fontes de dados disponíveis
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'sales', 'production', 'analytics', 'system'
  available_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de {name, type, label}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de dashboards salvos
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb, -- posições e tamanhos dos widgets
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de widgets individuais
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  widget_type TEXT NOT NULL, -- 'chart', 'table', 'metric', 'gauge'
  chart_type TEXT, -- 'bar', 'line', 'pie', 'area', 'scatter'
  data_source_id UUID REFERENCES public.data_sources(id),
  query_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- {select, where, groupBy, orderBy, limit}
  display_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- cores, labels, eixos, etc
  position JSONB NOT NULL DEFAULT '{}'::jsonb, -- {x, y, w, h}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- data_sources: todos autenticados podem ler fontes ativas
CREATE POLICY "Authenticated users can view active data sources"
  ON public.data_sources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage data sources"
  ON public.data_sources FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- dashboard_configs: usuários podem ver próprios dashboards e públicos
CREATE POLICY "Users can view own and public dashboards"
  ON public.dashboard_configs FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create own dashboards"
  ON public.dashboard_configs FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own dashboards"
  ON public.dashboard_configs FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own dashboards"
  ON public.dashboard_configs FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admins full access to dashboards"
  ON public.dashboard_configs FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- dashboard_widgets: acesso baseado no dashboard pai
CREATE POLICY "Users can view widgets of accessible dashboards"
  ON public.dashboard_widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_configs dc
      WHERE dc.id = dashboard_widgets.dashboard_id
        AND (dc.is_public = true OR dc.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage widgets of own dashboards"
  ON public.dashboard_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_configs dc
      WHERE dc.id = dashboard_widgets.dashboard_id
        AND dc.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dashboard_configs dc
      WHERE dc.id = dashboard_widgets.dashboard_id
        AND dc.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins full access to widgets"
  ON public.dashboard_widgets FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- Trigger para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

-- ============================================================================
-- Popular data_sources com tabelas existentes
-- ============================================================================

INSERT INTO public.data_sources (table_name, display_name, description, category, available_fields) VALUES
-- Vendas e Leads
('leads', 'Leads', 'Dados de leads capturados nas campanhas', 'sales', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "name", "type": "text", "label": "Nome"},
  {"name": "phone", "type": "text", "label": "Telefone"},
  {"name": "email", "type": "text", "label": "Email"},
  {"name": "quantity", "type": "text", "label": "Quantidade"},
  {"name": "completed", "type": "boolean", "label": "Completo"},
  {"name": "campaign_id", "type": "uuid", "label": "Campanha"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"},
  {"name": "utm_source", "type": "text", "label": "UTM Source"},
  {"name": "utm_campaign", "type": "text", "label": "UTM Campaign"}
]'),

('orders', 'Pedidos', 'Pedidos finalizados', 'sales', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "customer_name", "type": "text", "label": "Cliente"},
  {"name": "quantity", "type": "integer", "label": "Quantidade"},
  {"name": "campaign_id", "type": "uuid", "label": "Campanha"},
  {"name": "created_at", "type": "timestamptz", "label": "Data do Pedido"},
  {"name": "customization_data", "type": "jsonb", "label": "Dados de Customização"}
]'),

-- Produção
('design_tasks', 'Tarefas de Design', 'Tarefas de criação de layouts', 'production', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "order_id", "type": "uuid", "label": "Pedido"},
  {"name": "status", "type": "task_status", "label": "Status"},
  {"name": "priority", "type": "task_priority", "label": "Prioridade"},
  {"name": "assigned_to", "type": "uuid", "label": "Designer"},
  {"name": "created_by", "type": "uuid", "label": "Criado Por"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"},
  {"name": "completed_at", "type": "timestamptz", "label": "Data de Conclusão"},
  {"name": "deadline", "type": "timestamptz", "label": "Prazo"}
]'),

('design_task_history', 'Histórico de Tarefas', 'Histórico de mudanças em tarefas', 'production', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "task_id", "type": "uuid", "label": "Tarefa"},
  {"name": "action", "type": "text", "label": "Ação"},
  {"name": "old_status", "type": "task_status", "label": "Status Anterior"},
  {"name": "new_status", "type": "task_status", "label": "Novo Status"},
  {"name": "created_at", "type": "timestamptz", "label": "Data"}
]'),

-- Campanhas
('campaigns', 'Campanhas', 'Campanhas de venda', 'sales', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "name", "type": "text", "label": "Nome"},
  {"name": "unique_link", "type": "text", "label": "Link Único"},
  {"name": "segment_tag", "type": "text", "label": "Segmento"},
  {"name": "model_tag", "type": "text", "label": "Modelo"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"}
]'),

-- Analytics
('funnel_events', 'Eventos de Funil', 'Eventos de conversão', 'analytics', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "session_id", "type": "text", "label": "Sessão"},
  {"name": "event_type", "type": "text", "label": "Tipo de Evento"},
  {"name": "campaign_id", "type": "uuid", "label": "Campanha"},
  {"name": "created_at", "type": "timestamptz", "label": "Data"},
  {"name": "utm_source", "type": "text", "label": "UTM Source"}
]'),

('ab_tests', 'Testes A/B', 'Testes A/B de campanhas', 'analytics', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "name", "type": "text", "label": "Nome"},
  {"name": "status", "type": "text", "label": "Status"},
  {"name": "total_visits", "type": "integer", "label": "Total de Visitas"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"}
]'),

-- Sistema
('profiles', 'Perfis de Usuários', 'Perfis de usuários do sistema', 'system', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "full_name", "type": "text", "label": "Nome Completo"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"}
]'),

('user_roles', 'Papéis de Usuários', 'Papéis e permissões', 'system', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "user_id", "type": "uuid", "label": "Usuário"},
  {"name": "role", "type": "app_role", "label": "Papel"},
  {"name": "created_at", "type": "timestamptz", "label": "Data de Criação"}
]'),

('segments', 'Segmentos', 'Segmentos de produtos', 'system', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "name", "type": "text", "label": "Nome"},
  {"name": "segment_tag", "type": "text", "label": "Tag do Segmento"},
  {"name": "model_tag", "type": "text", "label": "Tag do Modelo"}
]'),

('shirt_models', 'Modelos de Uniformes', 'Catálogo de modelos', 'system', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "name", "type": "text", "label": "Nome"},
  {"name": "model_tag", "type": "text", "label": "Tag do Modelo"},
  {"name": "segment_tag", "type": "text", "label": "Segmento"}
]'),

('notifications', 'Notificações', 'Notificações do sistema', 'system', '[
  {"name": "id", "type": "uuid", "label": "ID"},
  {"name": "user_id", "type": "uuid", "label": "Usuário"},
  {"name": "title", "type": "text", "label": "Título"},
  {"name": "type", "type": "text", "label": "Tipo"},
  {"name": "read", "type": "boolean", "label": "Lido"},
  {"name": "created_at", "type": "timestamptz", "label": "Data"}
]')
ON CONFLICT (table_name) DO NOTHING;
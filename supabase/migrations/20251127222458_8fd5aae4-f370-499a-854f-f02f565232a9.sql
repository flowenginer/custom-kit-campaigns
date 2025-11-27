-- Create dashboard_templates table
CREATE TABLE IF NOT EXISTS public.dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  thumbnail TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_dashboard_templates_category ON public.dashboard_templates(category);
CREATE INDEX idx_dashboard_templates_created_by ON public.dashboard_templates(created_by);

-- Enable RLS
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view system templates"
  ON public.dashboard_templates
  FOR SELECT
  USING (is_system = true);

CREATE POLICY "Users can view own templates"
  ON public.dashboard_templates
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create templates"
  ON public.dashboard_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.dashboard_templates
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.dashboard_templates
  FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admins full access to templates"
  ON public.dashboard_templates
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_templates_updated_at
  BEFORE UPDATE ON public.dashboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system templates
INSERT INTO public.dashboard_templates (name, description, category, is_system, layout) VALUES
(
  'Dashboard de Vendas',
  'Acompanhe métricas de leads, conversões e UTMs',
  'comercial',
  true,
  '[
    {
      "id": "leads-total",
      "type": "metric",
      "position": {"x": 0, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "leads",
        "field": "id",
        "aggregation": "count"
      },
      "display_config": {
        "title": "Total de Leads",
        "format": "number",
        "color": "#4F9CF9"
      }
    },
    {
      "id": "leads-timeline",
      "type": "chart",
      "position": {"x": 1, "y": 0, "w": 2, "h": 1},
      "query_config": {
        "table": "leads",
        "field": "id",
        "aggregation": "count",
        "groupBy": "created_at::date"
      },
      "display_config": {
        "title": "Leads por Dia",
        "chartType": "line",
        "showLegend": true
      }
    },
    {
      "id": "leads-utm",
      "type": "chart",
      "position": {"x": 0, "y": 1, "w": 1, "h": 1},
      "query_config": {
        "table": "leads",
        "field": "id",
        "aggregation": "count",
        "groupBy": "utm_source"
      },
      "display_config": {
        "title": "Leads por Origem",
        "chartType": "pie"
      }
    }
  ]'::jsonb
),
(
  'Dashboard de Produção',
  'Monitore tasks, status e produtividade',
  'operacional',
  true,
  '[
    {
      "id": "tasks-pending",
      "type": "metric",
      "position": {"x": 0, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "design_tasks",
        "field": "id",
        "aggregation": "count",
        "filters": [{"field": "status", "operator": "=", "value": "pending"}]
      },
      "display_config": {
        "title": "Tasks Pendentes",
        "format": "number",
        "color": "#FFA500"
      }
    },
    {
      "id": "tasks-progress",
      "type": "metric",
      "position": {"x": 1, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "design_tasks",
        "field": "id",
        "aggregation": "count",
        "filters": [{"field": "status", "operator": "=", "value": "in_progress"}]
      },
      "display_config": {
        "title": "Em Progresso",
        "format": "number",
        "color": "#4F9CF9"
      }
    },
    {
      "id": "tasks-completed",
      "type": "metric",
      "position": {"x": 2, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "design_tasks",
        "field": "id",
        "aggregation": "count",
        "filters": [{"field": "status", "operator": "=", "value": "completed"}]
      },
      "display_config": {
        "title": "Concluídas",
        "format": "number",
        "color": "#34A853"
      }
    },
    {
      "id": "tasks-status-chart",
      "type": "chart",
      "position": {"x": 0, "y": 1, "w": 2, "h": 1},
      "query_config": {
        "table": "design_tasks",
        "field": "id",
        "aggregation": "count",
        "groupBy": "status"
      },
      "display_config": {
        "title": "Tasks por Status",
        "chartType": "bar"
      }
    }
  ]'::jsonb
),
(
  'Dashboard de Marketing',
  'Analise funil de conversão e campanhas',
  'marketing',
  true,
  '[
    {
      "id": "funnel-visits",
      "type": "metric",
      "position": {"x": 0, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "funnel_events",
        "field": "id",
        "aggregation": "count",
        "filters": [{"field": "event_type", "operator": "=", "value": "visit"}]
      },
      "display_config": {
        "title": "Visitas",
        "format": "number"
      }
    },
    {
      "id": "funnel-completed",
      "type": "metric",
      "position": {"x": 1, "y": 0, "w": 1, "h": 1},
      "query_config": {
        "table": "funnel_events",
        "field": "id",
        "aggregation": "count",
        "filters": [{"field": "event_type", "operator": "=", "value": "completed"}]
      },
      "display_config": {
        "title": "Conversões",
        "format": "number",
        "color": "#34A853"
      }
    },
    {
      "id": "funnel-timeline",
      "type": "chart",
      "position": {"x": 0, "y": 1, "w": 3, "h": 1},
      "query_config": {
        "table": "funnel_events",
        "field": "id",
        "aggregation": "count",
        "groupBy": "event_type"
      },
      "display_config": {
        "title": "Funil de Conversão",
        "chartType": "area"
      }
    }
  ]'::jsonb
);
-- Criar tabela menu_items para estrutura de menus e submenus dinâmicos
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'Circle',
  route TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler menus ativos
CREATE POLICY "Anyone can read active menu items"
ON public.menu_items
FOR SELECT
USING (is_active = true OR auth.role() = 'authenticated');

-- Policy: Admins podem gerenciar menus
CREATE POLICY "Admins can manage menu items"
ON public.menu_items
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir menus existentes como menus principais (parent_id = NULL)
INSERT INTO public.menu_items (label, slug, icon, route, description, display_order, is_active) VALUES
('Dashboard', 'dashboard', 'LayoutDashboard', '/admin/dashboard', 'Painel principal com métricas', 1, true),
('Dashboard Avançado', 'data_cross', 'LineChart', '/admin/data-cross', 'Análise cruzada de dados', 2, true),
('Ranking de Produção', 'ranking', 'Trophy', '/admin/ranking', 'Rankings de desempenho', 3, true),
('Segmentos', 'segments', 'Tags', '/admin/segments', 'Gerenciar segmentos', 4, true),
('Modelos', 'models', 'Shirt', '/admin/models', 'Gerenciar modelos de uniformes', 5, true),
('Campanhas', 'campaigns', 'Megaphone', '/admin/campaigns', 'Gerenciar campanhas', 6, true),
('Leads', 'leads', 'Users', '/admin/leads', 'Gerenciar leads', 7, true),
('Workflows', 'workflows', 'Workflow', '/admin/workflows', 'Gerenciar workflows', 8, true),
('Testes A/B', 'ab_tests', 'FlaskConical', '/admin/ab-tests', 'Gerenciar testes A/B', 9, true),
('Criação', 'creation', 'Palette', '/admin/creation', 'Área de criação e design', 10, true),
('Pedidos', 'orders', 'ShoppingCart', '/admin/orders', 'Gerenciar pedidos', 11, true),
('Aprovações', 'approvals', 'CheckCircle', '/admin/approvals', 'Gerenciar aprovações', 12, true),
('API', 'api', 'Code', '/admin/api', 'Configurações de API', 13, true),
('Configurações', 'settings', 'Settings', '/admin/settings', 'Configurações do sistema', 14, true),
('Temas', 'themes', 'Palette', '/admin/themes', 'Gerenciar temas visuais', 15, true)
ON CONFLICT (slug) DO NOTHING;
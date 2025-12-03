-- ============================================================================
-- SCRIPT DE MIGRAÇÃO COMPLETO - SISTEMA SS UNIFORMES
-- Gerado em: 2025-12-03
-- Compatível com: Supabase (PostgreSQL 15+)
-- ============================================================================
-- INSTRUÇÕES:
-- 1. Crie um novo projeto no Supabase
-- 2. Acesse o SQL Editor do projeto
-- 3. Execute este script em partes (seção por seção) para evitar timeouts
-- 4. Verifique se não há erros após cada seção
-- ============================================================================

-- ============================================================================
-- PARTE 1: EXTENSÕES E TIPOS (ENUMS)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos ENUM
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'designer', 'salesperson', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('normal', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'awaiting_approval', 'approved', 'changes_requested', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PARTE 2: TABELAS PRINCIPAIS
-- ============================================================================

-- 2.1 Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  initials text,
  allowed_menu_items text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.2 Tabela de Roles de Usuário
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 2.3 Segmentos
CREATE TABLE IF NOT EXISTS public.segments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  model_tag text,
  segment_tag text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.4 Templates de Workflow
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  workflow_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.5 Campanhas
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  unique_link text NOT NULL UNIQUE,
  segment_id uuid REFERENCES public.segments(id),
  segment_tag text,
  model_tag text,
  workflow_template_id uuid NOT NULL REFERENCES public.workflow_templates(id),
  workflow_config jsonb,
  custom_head_scripts text,
  custom_body_scripts text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.6 Temas de Campanha
CREATE TABLE IF NOT EXISTS public.campaign_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  theme_primary_color text,
  theme_primary_opacity numeric,
  theme_background_color text,
  theme_background_opacity numeric,
  theme_text_color text,
  theme_text_opacity numeric,
  theme_accent_color text,
  theme_accent_opacity numeric,
  theme_button_color text,
  theme_button_opacity numeric,
  theme_button_style text,
  theme_heading_font text,
  theme_body_font text,
  theme_font_size_base text,
  theme_border_radius text,
  theme_spacing_unit text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.7 Overrides Visuais de Campanha
CREATE TABLE IF NOT EXISTS public.campaign_visual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(campaign_id, step_id)
);

-- 2.8 Modelos de Camisa
CREATE TABLE IF NOT EXISTS public.shirt_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  photo_main text NOT NULL,
  image_front text NOT NULL,
  image_back text NOT NULL,
  image_right text NOT NULL,
  image_left text NOT NULL,
  image_front_small_logo text,
  image_front_large_logo text,
  image_front_clean text,
  features text[] DEFAULT '{}'::text[],
  segment_id uuid REFERENCES public.segments(id),
  segment_tag text,
  model_tag text,
  sku text,
  base_price numeric,
  peso numeric,
  altura numeric,
  largura numeric,
  profundidade numeric,
  volumes integer DEFAULT 1,
  unidade text DEFAULT 'UN',
  bling_product_id bigint,
  bling_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.9 Variações de Modelo
CREATE TABLE IF NOT EXISTS public.shirt_model_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.shirt_models(id) ON DELETE CASCADE,
  size text NOT NULL,
  gender text NOT NULL DEFAULT 'unissex',
  sku_suffix text,
  price_adjustment numeric DEFAULT 0,
  promotional_price numeric,
  stock_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.10 Segmentos de Negócio
CREATE TABLE IF NOT EXISTS public.business_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.11 Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  quantity text NOT NULL,
  custom_quantity integer,
  campaign_id uuid REFERENCES public.campaigns(id),
  current_step integer DEFAULT 0,
  completed boolean DEFAULT false,
  order_id uuid,
  customization_summary jsonb,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  attempt_number integer DEFAULT 1,
  lead_group_identifier text,
  uploaded_logo_url text,
  needs_logo boolean DEFAULT false,
  logo_action text,
  logo_description text,
  salesperson_status text,
  created_by_salesperson boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  business_segment_id uuid REFERENCES public.business_segments(id),
  business_segment_other text,
  ab_test_id uuid,
  ab_variant uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  device_type text,
  device_os text,
  device_browser text,
  user_agent text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(session_id, campaign_id)
);

-- 2.12 Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  quantity integer NOT NULL,
  customization_data jsonb NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id),
  model_id uuid REFERENCES public.shirt_models(id),
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Atualizar referência de leads.order_id
ALTER TABLE public.leads 
ADD CONSTRAINT leads_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id);

-- 2.13 Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  person_type text NOT NULL,
  cpf text,
  cnpj text,
  company_name text,
  state_registration text,
  birth_date date,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  contact_notes text,
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  first_order_date timestamp with time zone,
  last_order_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.14 Tarefas de Design
CREATE TABLE IF NOT EXISTS public.design_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  lead_id uuid REFERENCES public.leads(id),
  campaign_id uuid REFERENCES public.campaigns(id),
  customer_id uuid REFERENCES public.customers(id),
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority DEFAULT 'normal',
  assigned_to uuid REFERENCES public.profiles(id),
  assigned_at timestamp with time zone,
  current_version integer DEFAULT 1,
  design_files jsonb DEFAULT '[]'::jsonb,
  client_feedback text,
  client_approved_at timestamp with time zone,
  changes_notes text,
  deadline timestamp with time zone,
  completed_at timestamp with time zone,
  status_changed_at timestamp with time zone DEFAULT now(),
  order_number text,
  order_value numeric,
  bling_order_id bigint,
  bling_order_number text,
  shipping_option jsonb,
  shipping_value numeric,
  registration_token text,
  registration_sent_at timestamp with time zone,
  registration_completed_at timestamp with time zone,
  created_by uuid REFERENCES public.profiles(id),
  created_by_salesperson boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.15 Layouts de Tarefa
CREATE TABLE IF NOT EXISTS public.design_task_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  layout_number integer NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id),
  campaign_name text,
  model_id uuid REFERENCES public.shirt_models(id),
  model_name text,
  uniform_type text,
  quantity integer,
  customization_data jsonb DEFAULT '{}'::jsonb,
  design_files jsonb DEFAULT '[]'::jsonb,
  current_version integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  client_approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.16 Histórico de Tarefas
CREATE TABLE IF NOT EXISTS public.design_task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  old_status task_status,
  new_status task_status,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.17 Comentários de Tarefas
CREATE TABLE IF NOT EXISTS public.design_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.18 Solicitações de Alteração
CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  layout_id uuid REFERENCES public.design_task_layouts(id),
  description text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 2.19 Rejeições de Tarefas
CREATE TABLE IF NOT EXISTS public.task_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  reason_type text NOT NULL,
  reason_text text,
  rejected_by uuid REFERENCES public.profiles(id),
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 2.20 Orçamentos
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_before_discount numeric DEFAULT 0,
  discount_type text,
  discount_value numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  valid_until timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  sent_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  approved_by_name text,
  correction_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.21 Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  task_id uuid REFERENCES public.design_tasks(id),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  task_status text,
  customer_name text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.22 Eventos de Funil
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.23 Testes A/B
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unique_link text NOT NULL UNIQUE,
  campaigns jsonb NOT NULL,
  completion_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  total_visits integer DEFAULT 0,
  actual_distribution jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  paused_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Atualizar referências de leads
ALTER TABLE public.leads 
ADD CONSTRAINT leads_ab_test_id_fkey 
FOREIGN KEY (ab_test_id) REFERENCES public.ab_tests(id);

-- 2.24 Eventos de Teste A/B
CREATE TABLE IF NOT EXISTS public.ab_test_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id uuid NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id),
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.25 Solicitações de Urgência Pendentes
CREATE TABLE IF NOT EXISTS public.pending_urgent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_data jsonb NOT NULL,
  requested_priority task_priority NOT NULL DEFAULT 'urgent',
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  urgent_reason_id uuid,
  urgent_reason_text text,
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  final_priority task_priority,
  created_order_id uuid REFERENCES public.orders(id),
  created_task_id uuid REFERENCES public.design_tasks(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.26 Motivos de Urgência
CREATE TABLE IF NOT EXISTS public.urgent_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Atualizar referência
ALTER TABLE public.pending_urgent_requests 
ADD CONSTRAINT pending_urgent_requests_urgent_reason_id_fkey 
FOREIGN KEY (urgent_reason_id) REFERENCES public.urgent_reasons(id);

-- 2.27 Solicitações de Exclusão Pendentes
CREATE TABLE IF NOT EXISTS public.pending_delete_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.28 Solicitações de Exclusão de Cliente
CREATE TABLE IF NOT EXISTS public.pending_customer_delete_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.29 Solicitações de Modificação
CREATE TABLE IF NOT EXISTS public.pending_modification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.design_tasks(id),
  description text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.30 Links de Cadastro de Cliente
CREATE TABLE IF NOT EXISTS public.customer_registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  task_id uuid REFERENCES public.design_tasks(id),
  lead_id uuid REFERENCES public.leads(id),
  customer_id uuid REFERENCES public.customers(id),
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 2.31 Conversas de Chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.32 Participantes de Chat
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 2.33 Mensagens de Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  content text,
  message_type text NOT NULL DEFAULT 'text',
  file_url text,
  file_name text,
  audio_duration integer,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.34 Configurações da Empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL,
  inscricao_estadual text,
  email text,
  phone text,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  custom_domain text,
  bling_enabled boolean DEFAULT false,
  bling_api_key text,
  bling_client_id text,
  bling_client_secret text,
  bling_environment text,
  melhor_envio_token text,
  melhor_envio_environment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.35 Tokens OAuth do Bling
CREATE TABLE IF NOT EXISTS public.bling_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  token_type text,
  scope text,
  bling_user_info jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.36 Integrações ERP
CREATE TABLE IF NOT EXISTS public.erp_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text NOT NULL,
  webhook_url text NOT NULL,
  api_token text,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.37 Exportações ERP
CREATE TABLE IF NOT EXISTS public.erp_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  export_type text NOT NULL,
  integration_type text NOT NULL,
  external_id text,
  external_number text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  payload jsonb,
  response jsonb,
  exported_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 2.38 Configurações Globais
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_head_scripts text,
  global_body_scripts text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.39 Itens de Menu
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  route text NOT NULL,
  icon text,
  description text,
  parent_id uuid REFERENCES public.menu_items(id),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.40 Defaults de Menu por Role
CREATE TABLE IF NOT EXISTS public.role_menu_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  allowed_menu_items text[] NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.41 Defaults de Kanban por Role
CREATE TABLE IF NOT EXISTS public.role_kanban_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  allowed_columns text[] NOT NULL DEFAULT ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed'],
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.42 Preferências de Som
CREATE TABLE IF NOT EXISTS public.user_sound_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  volume integer DEFAULT 70,
  new_card_sound text DEFAULT 'notification',
  status_change_sound text DEFAULT 'swoosh',
  new_approval_sound text DEFAULT 'alert',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.43 Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type text NOT NULL,
  tag_value text NOT NULL,
  display_label text,
  icon text DEFAULT '👕',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(tag_type, tag_value)
);

-- 2.44 Presets de Dimensão
CREATE TABLE IF NOT EXISTS public.dimension_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_tag text NOT NULL,
  name text NOT NULL,
  peso numeric,
  altura numeric,
  largura numeric,
  profundidade numeric,
  volumes integer,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.45 Regras de Preço
CREATE TABLE IF NOT EXISTS public.price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL,
  apply_to text NOT NULL,
  segment_tag text,
  segment_tags text[],
  model_tag text,
  model_tags text[],
  sizes text[],
  genders text[],
  price_value numeric NOT NULL,
  is_percentage boolean DEFAULT false,
  affects_base_price boolean DEFAULT true,
  affects_promotional_price boolean DEFAULT false,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.46 Atributos de Variação
CREATE TABLE IF NOT EXISTS public.variation_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_type text NOT NULL,
  attribute_value text NOT NULL,
  display_label text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(attribute_type, attribute_value)
);

-- 2.47 Configurações de Dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.48 Fontes de Dados
CREATE TABLE IF NOT EXISTS public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text,
  available_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.49 Widgets de Dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
  data_source_id uuid REFERENCES public.data_sources(id),
  title text NOT NULL,
  widget_type text NOT NULL,
  chart_type text,
  query_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.50 Templates de Dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  thumbnail text,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.51 Tipos de Uniforme
CREATE TABLE IF NOT EXISTS public.uniform_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  icon text DEFAULT '👕',
  default_image text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- PARTE 3: ÍNDICES
-- ============================================================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_session_id ON public.leads(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_is_online ON public.leads(is_online);
CREATE INDEX IF NOT EXISTS idx_leads_needs_logo ON public.leads(needs_logo);

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON public.orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON public.design_tasks(status);
CREATE INDEX IF NOT EXISTS idx_design_tasks_priority ON public.design_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_design_tasks_assigned_to ON public.design_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_by ON public.design_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_at ON public.design_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id ON public.funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_campaign_id ON public.funnel_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_type ON public.funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON public.funnel_events(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_unique_link ON public.campaigns(unique_link);
CREATE INDEX IF NOT EXISTS idx_campaigns_segment_tag ON public.campaigns(segment_tag);

CREATE INDEX IF NOT EXISTS idx_shirt_models_segment_tag ON public.shirt_models(segment_tag);
CREATE INDEX IF NOT EXISTS idx_shirt_models_model_tag ON public.shirt_models(model_tag);

CREATE INDEX IF NOT EXISTS idx_customers_cpf ON public.customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_cnpj ON public.customers(cnpj);

-- ============================================================================
-- PARTE 4: FUNÇÕES DO BANCO DE DADOS
-- ============================================================================

-- 4.1 Função genérica para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Verificar se usuário tem role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4.3 Verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('super_admin', 'admin')
  )
$$;

-- 4.4 Obter roles do usuário
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

-- 4.5 Verificar se usuário é participante de conversa
CREATE OR REPLACE FUNCTION public.user_is_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE conversation_id = conv_id 
    AND user_id = auth.uid()
  );
$$;

-- 4.6 Verificar se usuário criou conversa
CREATE OR REPLACE FUNCTION public.user_created_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conv_id 
    AND created_by = auth.uid()
  );
$$;

-- 4.7 Atualizar status_changed_at
CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4.8 Handler para novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Se for o primeiro usuário, torná-lo super_admin
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4.9 Log de mudança de status
CREATE OR REPLACE FUNCTION public.log_design_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.design_task_history (
      task_id,
      action,
      old_status,
      new_status,
      user_id,
      notes
    )
    VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'in_progress' THEN 'Tarefa iniciada'
        WHEN NEW.status = 'awaiting_approval' THEN 'Enviado para aprovação'
        WHEN NEW.status = 'approved' THEN 'Aprovado pelo cliente'
        WHEN NEW.status = 'changes_requested' THEN 'Alterações solicitadas'
        WHEN NEW.status = 'completed' THEN 'Enviado para produção'
        ELSE 'Status alterado'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4.10 Notificar atribuição de tarefa
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    SELECT o.customer_name INTO v_customer_name
    FROM orders o
    WHERE o.id = NEW.order_id;

    INSERT INTO public.notifications (
      user_id,
      task_id,
      title,
      message,
      type,
      task_status,
      customer_name
    ) VALUES (
      NEW.assigned_to,
      NEW.id,
      'Nova Tarefa Atribuída',
      'Você foi atribuído à tarefa de ' || v_customer_name,
      'assignment',
      NEW.status,
      v_customer_name
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4.11 Notificar mudança de status
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  SELECT o.customer_name INTO v_customer_name
  FROM orders o
  WHERE o.id = NEW.order_id;

  -- Notificar DESIGNER (assigned_to)
  IF NEW.assigned_to IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_title := 'Status da Tarefa Atualizado';
    v_message := CASE 
      WHEN NEW.status = 'in_progress' THEN 'A tarefa de ' || v_customer_name || ' foi iniciada'
      WHEN NEW.status = 'awaiting_approval' THEN 'A tarefa de ' || v_customer_name || ' foi enviada para aprovação'
      WHEN NEW.status = 'approved' THEN 'A tarefa de ' || v_customer_name || ' foi aprovada pelo cliente'
      WHEN NEW.status = 'changes_requested' THEN 'Alterações solicitadas na tarefa de ' || v_customer_name
      WHEN NEW.status = 'completed' THEN 'A tarefa de ' || v_customer_name || ' foi enviada para produção'
      ELSE 'Status da tarefa de ' || v_customer_name || ' foi alterado'
    END;

    INSERT INTO public.notifications (
      user_id,
      task_id,
      title,
      message,
      type,
      task_status,
      customer_name
    ) VALUES (
      NEW.assigned_to,
      NEW.id,
      v_title,
      v_message,
      'status_change',
      NEW.status,
      v_customer_name
    );
  END IF;

  -- Notificar VENDEDOR quando mockup estiver pronto
  IF NEW.created_by IS NOT NULL 
     AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('awaiting_approval', 'approved', 'completed') THEN
    
    v_title := CASE
      WHEN NEW.status = 'awaiting_approval' THEN '✅ Mockup Pronto para Aprovação'
      WHEN NEW.status = 'approved' THEN '🎉 Mockup Aprovado'
      WHEN NEW.status = 'completed' THEN '📦 Pedido Enviado para Produção'
    END;
    
    v_message := CASE
      WHEN NEW.status = 'awaiting_approval' THEN 'O mockup de ' || v_customer_name || ' está pronto!'
      WHEN NEW.status = 'approved' THEN 'O mockup de ' || v_customer_name || ' foi aprovado.'
      WHEN NEW.status = 'completed' THEN 'O pedido de ' || v_customer_name || ' foi enviado para produção.'
    END;

    INSERT INTO public.notifications (
      user_id,
      task_id,
      title,
      message,
      type,
      task_status,
      customer_name
    ) VALUES (
      NEW.created_by,
      NEW.id,
      v_title,
      v_message,
      'approval',
      NEW.status,
      v_customer_name
    );
  END IF;

  -- Atualizar salesperson_status da lead
  IF NEW.status = 'awaiting_approval' THEN
    UPDATE public.leads
    SET salesperson_status = 'awaiting_final_confirmation'
    WHERE order_id = NEW.order_id;
  ELSIF NEW.status = 'changes_requested' THEN
    UPDATE public.leads
    SET salesperson_status = 'sent_to_designer'
    WHERE order_id = NEW.order_id;
  ELSIF NEW.status = 'approved' OR NEW.status = 'completed' THEN
    UPDATE public.leads
    SET salesperson_status = 'approved'
    WHERE order_id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.12 Criar tarefa ao criar pedido
CREATE OR REPLACE FUNCTION public.create_design_task_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_created_by uuid;
  v_needs_logo boolean;
  v_random_salesperson uuid;
  v_created_by_salesperson boolean;
BEGIN
  SELECT id, created_by, needs_logo, created_by_salesperson
  INTO v_lead_id, v_created_by, v_needs_logo, v_created_by_salesperson
  FROM public.leads
  WHERE order_id = NEW.id
  LIMIT 1;
  
  IF v_lead_id IS NULL THEN
    SELECT id, created_by, needs_logo, created_by_salesperson
    INTO v_lead_id, v_created_by, v_needs_logo, v_created_by_salesperson
    FROM public.leads
    WHERE session_id = NEW.session_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_needs_logo = true AND v_created_by IS NULL THEN
    SELECT user_id INTO v_random_salesperson
    FROM public.user_roles
    WHERE role = 'salesperson'
    ORDER BY RANDOM()
    LIMIT 1;
    
    v_created_by := v_random_salesperson;
    
    UPDATE public.leads
    SET created_by = v_created_by,
        salesperson_status = 'awaiting_logo'
    WHERE id = v_lead_id;
  END IF;

  INSERT INTO public.design_tasks (
    order_id,
    lead_id,
    campaign_id,
    status,
    priority,
    created_by,
    created_by_salesperson
  )
  VALUES (
    NEW.id,
    v_lead_id,
    NEW.campaign_id,
    'pending',
    'normal',
    v_created_by,
    COALESCE(v_created_by_salesperson, false)
  );
  
  INSERT INTO public.design_task_history (
    task_id,
    action,
    new_status,
    notes
  )
  VALUES (
    (SELECT id FROM public.design_tasks WHERE order_id = NEW.id),
    'created',
    'pending',
    CASE 
      WHEN v_created_by_salesperson THEN 'Tarefa criada por vendedor'
      ELSE 'Tarefa criada automaticamente'
    END
  );
  
  RETURN NEW;
END;
$$;

-- 4.13 Copiar config de workflow para campanha
CREATE OR REPLACE FUNCTION public.copy_workflow_config_to_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workflow_template_id IS NOT NULL THEN
    SELECT workflow_config INTO NEW.workflow_config
    FROM public.workflow_templates
    WHERE id = NEW.workflow_template_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4.14 Verificar se cliente existe
CREATE OR REPLACE FUNCTION public.check_customer_exists(p_cpf text DEFAULT NULL, p_cnpj text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
BEGIN
  IF p_cpf IS NOT NULL THEN
    SELECT id, name, company_name, phone, cpf, cnpj
    INTO v_customer
    FROM customers
    WHERE cpf = p_cpf
    LIMIT 1;
  ELSIF p_cnpj IS NOT NULL THEN
    SELECT id, name, company_name, phone, cpf, cnpj
    INTO v_customer
    FROM customers
    WHERE cnpj = p_cnpj
    LIMIT 1;
  ELSE
    RETURN NULL;
  END IF;
  
  IF v_customer IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN json_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'company_name', v_customer.company_name,
    'phone', v_customer.phone,
    'cpf', v_customer.cpf,
    'cnpj', v_customer.cnpj
  );
END;
$$;

-- 4.15 Formatar tag para nome
CREATE OR REPLACE FUNCTION public.format_tag_to_name(tag text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tag IS NULL OR tag = '' THEN
    RETURN '';
  END IF;
  
  RETURN initcap(
    regexp_replace(
      regexp_replace(tag, '_+$', ''),
      '_', ' ', 'g'
    )
  );
END;
$$;

-- 4.16 Incrementar visita de teste A/B
CREATE OR REPLACE FUNCTION public.increment_ab_test_visit(test_id uuid, variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ab_tests
  SET 
    total_visits = total_visits + 1,
    actual_distribution = jsonb_set(
      COALESCE(actual_distribution, '{}'::jsonb),
      ARRAY[variant_id::text],
      to_jsonb(COALESCE((actual_distribution->variant_id::text)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE id = test_id;
END;
$$;

-- 4.17 Marcar lead rejeitada pelo designer
CREATE OR REPLACE FUNCTION public.mark_lead_rejected_by_designer(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET 
    needs_logo = true,
    logo_action = 'waiting_client',
    salesperson_status = 'rejected_by_designer',
    updated_at = now()
  WHERE id = p_lead_id;
END;
$$;

-- 4.18 Atualizar customer_id da tarefa
CREATE OR REPLACE FUNCTION public.update_task_customer_id(p_task_id uuid, p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE design_tasks 
  SET customer_id = p_customer_id,
      registration_completed_at = now()
  WHERE id = p_task_id;
END;
$$;

-- 4.19 Completar registro de cliente
CREATE OR REPLACE FUNCTION public.complete_customer_registration(p_token text, p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
  v_task_id uuid;
  v_created_by uuid;
BEGIN
  SELECT id, task_id, created_by
  INTO v_link_id, v_task_id, v_created_by
  FROM customer_registration_links
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF v_link_id IS NULL THEN
    RAISE EXCEPTION 'Link inválido ou expirado';
  END IF;
  
  UPDATE customer_registration_links
  SET used_at = now(),
      customer_id = p_customer_id
  WHERE id = v_link_id;
  
  IF v_task_id IS NOT NULL THEN
    UPDATE design_tasks
    SET customer_id = p_customer_id,
        registration_completed_at = now()
    WHERE id = v_task_id;
  END IF;
END;
$$;

-- 4.20 Notificar cliente registrado
CREATE OR REPLACE FUNCTION public.notify_customer_registered(p_user_id uuid, p_task_id uuid, p_customer_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, task_id, title, message, type, customer_name)
  VALUES (
    p_user_id,
    p_task_id,
    '📋 Cliente Cadastrado',
    'O cliente ' || p_customer_name || ' completou o cadastro via link!',
    'customer_registered',
    p_customer_name
  );
END;
$$;

-- 4.21 Notificar registro de cliente (trigger)
CREATE OR REPLACE FUNCTION public.notify_customer_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name TEXT;
  v_salesperson_id UUID;
BEGIN
  IF OLD.customer_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    v_salesperson_id := NEW.created_by;

    IF v_salesperson_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        task_id,
        title,
        message,
        type,
        task_status,
        customer_name
      ) VALUES (
        v_salesperson_id,
        NEW.id,
        '📋 Cadastro Concluído',
        'O cliente ' || COALESCE(v_customer_name, 'N/A') || ' completou o cadastro via link.',
        'customer_registered',
        NEW.status,
        v_customer_name
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.22 Gerar SKU de produto
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_segment TEXT;
  v_type TEXT;
  v_seq INTEGER;
  v_sku TEXT;
BEGIN
  IF NEW.sku IS NOT NULL AND NEW.sku != '' THEN
    RETURN NEW;
  END IF;
  
  v_segment := UPPER(COALESCE(
    LEFT(REGEXP_REPLACE(NEW.segment_tag, '[^a-zA-Z]', '', 'g'), 4),
    'PROD'
  ));
  
  v_type := CASE 
    WHEN NEW.model_tag ILIKE '%manga_longa%' OR NEW.model_tag ILIKE '%manga-longa%' THEN 'ML'
    WHEN NEW.model_tag ILIKE '%manga_curta%' OR NEW.model_tag ILIKE '%manga-curta%' THEN 'MC'
    WHEN NEW.model_tag ILIKE '%regata%' THEN 'RG'
    WHEN NEW.model_tag ILIKE '%ziper%' OR NEW.model_tag ILIKE '%zipper%' THEN 'ZP'
    WHEN NEW.model_tag ILIKE '%polo%' THEN 'PL'
    ELSE UPPER(COALESCE(LEFT(REGEXP_REPLACE(NEW.model_tag, '[^a-zA-Z]', '', 'g'), 2), 'XX'))
  END;
  
  SELECT COUNT(*) + 1 INTO v_seq
  FROM shirt_models
  WHERE sku LIKE v_segment || '-' || v_type || '-%';
  
  v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
  
  WHILE EXISTS (SELECT 1 FROM shirt_models WHERE sku = v_sku) LOOP
    v_seq := v_seq + 1;
    v_sku := v_segment || '-' || v_type || '-' || LPAD(v_seq::TEXT, 3, '0');
  END LOOP;
  
  NEW.sku := v_sku;
  RETURN NEW;
END;
$$;

-- 4.23 Notificar mudança de status de orçamento
CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_customer_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT dt.*, o.customer_name INTO v_task
    FROM design_tasks dt
    JOIN orders o ON o.id = dt.order_id
    WHERE dt.id = NEW.task_id;
    
    v_customer_name := v_task.customer_name;
    
    IF NEW.status = 'correction_requested' THEN
      v_title := '🔄 Correção de Orçamento Solicitada';
      v_message := 'O cliente ' || v_customer_name || ' solicitou ajustes no orçamento.';
    ELSIF NEW.status = 'approved' THEN
      v_title := '✅ Orçamento Aprovado!';
      v_message := 'O cliente ' || v_customer_name || ' aprovou o orçamento de R$ ' || NEW.total_amount::TEXT;
    ELSE
      RETURN NEW;
    END IF;
    
    IF v_task.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        task_id,
        title,
        message,
        type,
        customer_name
      ) VALUES (
        v_task.created_by,
        NEW.task_id,
        v_title,
        v_message,
        CASE WHEN NEW.status = 'approved' THEN 'approval' ELSE 'status_change' END,
        v_customer_name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PARTE 5: TRIGGERS
-- ============================================================================

-- Trigger para criar perfil ao criar usuário
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_shirt_models_updated_at
  BEFORE UPDATE ON public.shirt_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_design_tasks_updated_at
  BEFORE UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers de design_tasks
CREATE OR REPLACE TRIGGER update_design_tasks_status_changed_at
  BEFORE UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_status_changed_at();

CREATE OR REPLACE TRIGGER log_design_task_status
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_design_task_status_change();

CREATE OR REPLACE TRIGGER notify_task_assignment_trigger
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

CREATE OR REPLACE TRIGGER notify_task_status_trigger
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();

CREATE OR REPLACE TRIGGER notify_customer_registration_trigger
  AFTER UPDATE ON public.design_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_registration();

-- Trigger para criar tarefa ao criar pedido
CREATE OR REPLACE TRIGGER create_task_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_design_task_on_order();

-- Trigger para copiar workflow config
CREATE OR REPLACE TRIGGER copy_workflow_on_campaign
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.copy_workflow_config_to_campaign();

-- Trigger para gerar SKU
CREATE OR REPLACE TRIGGER generate_sku_on_insert
  BEFORE INSERT ON public.shirt_models
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_sku();

-- Trigger para notificar mudança de orçamento
CREATE OR REPLACE TRIGGER notify_quote_status
  AFTER UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_quote_status_change();

-- ============================================================================
-- PARTE 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_visual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_model_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_task_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_urgent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_customer_delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_registration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_menu_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_kanban_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sound_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variation_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniform_types ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR ALL USING (is_admin(auth.uid()));

-- Políticas para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admins full access to user_roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Políticas para segments
CREATE POLICY "Public can view segments" ON public.segments FOR SELECT USING (true);
CREATE POLICY "Admin full access to segments" ON public.segments FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para workflow_templates
CREATE POLICY "Public can view workflow templates" ON public.workflow_templates FOR SELECT USING (true);
CREATE POLICY "Admin full access to workflow_templates" ON public.workflow_templates FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para campaigns
CREATE POLICY "Public can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Admin full access to campaigns" ON public.campaigns FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para campaign_themes
CREATE POLICY "Public can view campaign themes" ON public.campaign_themes FOR SELECT USING (true);
CREATE POLICY "Admin full access to campaign_themes" ON public.campaign_themes FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para campaign_visual_overrides
CREATE POLICY "Public can view visual overrides" ON public.campaign_visual_overrides FOR SELECT USING (true);
CREATE POLICY "Admin full access to visual_overrides" ON public.campaign_visual_overrides FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para shirt_models
CREATE POLICY "Public can view shirt models" ON public.shirt_models FOR SELECT USING (true);
CREATE POLICY "Admin full access to shirt_models" ON public.shirt_models FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para shirt_model_variations
CREATE POLICY "Public can view variations" ON public.shirt_model_variations FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can view all variations" ON public.shirt_model_variations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage variations" ON public.shirt_model_variations FOR ALL USING (is_admin(auth.uid()));

-- Políticas para business_segments
CREATE POLICY "Public can view active segments" ON public.business_segments FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access to business_segments" ON public.business_segments FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para leads
CREATE POLICY "Public can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public can update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Admin full access to leads" ON public.leads FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Salespersons can view leads needing logos" ON public.leads FOR SELECT 
  USING (has_role(auth.uid(), 'salesperson') AND (needs_logo = true OR created_by_salesperson = true));

-- Políticas para orders
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admin full access to orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para customers
CREATE POLICY "Public can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para design_tasks
CREATE POLICY "Authenticated can view design_tasks" ON public.design_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update design_tasks" ON public.design_tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access to design_tasks" ON public.design_tasks FOR ALL USING (is_admin(auth.uid()));

-- Políticas para design_task_layouts
CREATE POLICY "Authenticated can view layouts" ON public.design_task_layouts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert layouts" ON public.design_task_layouts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update layouts" ON public.design_task_layouts FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para design_task_history
CREATE POLICY "Authenticated can view history" ON public.design_task_history FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert history" ON public.design_task_history FOR INSERT WITH CHECK (true);

-- Políticas para design_task_comments
CREATE POLICY "Authenticated can view comments" ON public.design_task_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can create comments" ON public.design_task_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own comments" ON public.design_task_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.design_task_comments FOR DELETE USING (auth.uid() = user_id);

-- Políticas para change_requests
CREATE POLICY "Authenticated can view change_requests" ON public.change_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert change_requests" ON public.change_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Authenticated can update change_requests" ON public.change_requests FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para task_rejections
CREATE POLICY "Authenticated can view rejections" ON public.task_rejections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Designers can insert rejections" ON public.task_rejections FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND rejected_by = auth.uid());
CREATE POLICY "Authenticated can update rejections" ON public.task_rejections FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para quotes
CREATE POLICY "Public can view quotes by token" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Authenticated can view quotes" ON public.quotes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert quotes" ON public.quotes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update quotes" ON public.quotes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Public can update quote status" ON public.quotes FOR UPDATE USING (true);

-- Políticas para notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Políticas para funnel_events
CREATE POLICY "Public can insert funnel_events" ON public.funnel_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access to funnel_events" ON public.funnel_events FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para ab_tests
CREATE POLICY "Authenticated can view ab_tests" ON public.ab_tests FOR SELECT USING (true);
CREATE POLICY "Users can create own ab_tests" ON public.ab_tests FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own ab_tests" ON public.ab_tests FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own ab_tests" ON public.ab_tests FOR DELETE USING (auth.uid() = created_by);

-- Políticas para ab_test_events
CREATE POLICY "Anyone can insert ab_test_events" ON public.ab_test_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view ab_test_events" ON public.ab_test_events FOR SELECT USING (true);

-- Políticas para pending_urgent_requests
CREATE POLICY "Admins can view all pending_requests" ON public.pending_urgent_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update pending_requests" ON public.pending_urgent_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Salespersons can insert pending_requests" ON public.pending_urgent_requests FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());
CREATE POLICY "Salespersons can view own pending_requests" ON public.pending_urgent_requests FOR SELECT 
  USING (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());

-- Políticas para urgent_reasons
CREATE POLICY "Public can view active reasons" ON public.urgent_reasons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage reasons" ON public.urgent_reasons FOR ALL USING (is_admin(auth.uid()));

-- Políticas para pending_delete_requests
CREATE POLICY "Admins can view all delete_requests" ON public.pending_delete_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update delete_requests" ON public.pending_delete_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Salespersons can insert delete_requests" ON public.pending_delete_requests FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());
CREATE POLICY "Salespersons can view own delete_requests" ON public.pending_delete_requests FOR SELECT 
  USING (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());

-- Políticas para pending_customer_delete_requests
CREATE POLICY "Admins can view customer_delete_requests" ON public.pending_customer_delete_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update customer_delete_requests" ON public.pending_customer_delete_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Salespersons can insert customer_delete_requests" ON public.pending_customer_delete_requests FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());
CREATE POLICY "Salespersons can view own customer_delete_requests" ON public.pending_customer_delete_requests FOR SELECT 
  USING (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());

-- Políticas para pending_modification_requests
CREATE POLICY "Admins can view modification_requests" ON public.pending_modification_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update modification_requests" ON public.pending_modification_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Salespersons can insert modification_requests" ON public.pending_modification_requests FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());
CREATE POLICY "Salespersons can view own modification_requests" ON public.pending_modification_requests FOR SELECT 
  USING (has_role(auth.uid(), 'salesperson') AND requested_by = auth.uid());

-- Políticas para customer_registration_links
CREATE POLICY "Public can view links by token" ON public.customer_registration_links FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert links" ON public.customer_registration_links FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update links" ON public.customer_registration_links FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para chat
CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "Authenticated can create conversations" ON public.chat_conversations FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view conversation participants" ON public.chat_participants FOR SELECT 
  USING (user_is_participant(conversation_id));
CREATE POLICY "Users can view own participations" ON public.chat_participants FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "Conversation creators can add participants" ON public.chat_participants FOR INSERT 
  WITH CHECK (user_created_conversation(conversation_id));
CREATE POLICY "Users can update own read status" ON public.chat_participants FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can view messages in conversations" ON public.chat_messages FOR SELECT 
  USING (user_is_participant(conversation_id));
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid() AND user_is_participant(conversation_id));

-- Políticas para company_settings
CREATE POLICY "Authenticated can view company_settings" ON public.company_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage company_settings" ON public.company_settings FOR ALL USING (is_admin(auth.uid()));

-- Políticas para bling_oauth_tokens
CREATE POLICY "Admins can manage bling_tokens" ON public.bling_oauth_tokens FOR ALL USING (is_admin(auth.uid()));

-- Políticas para erp_integrations
CREATE POLICY "Authenticated can view erp_integrations" ON public.erp_integrations FOR SELECT USING (true);
CREATE POLICY "Admins can manage erp_integrations" ON public.erp_integrations FOR ALL USING (is_admin(auth.uid()));

-- Políticas para erp_exports
CREATE POLICY "Authenticated can view erp_exports" ON public.erp_exports FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert erp_exports" ON public.erp_exports FOR INSERT WITH CHECK (true);

-- Políticas para global_settings
CREATE POLICY "Anyone can read global_settings" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert global_settings" ON public.global_settings FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update global_settings" ON public.global_settings FOR UPDATE USING (is_admin(auth.uid()));

-- Políticas para menu_items
CREATE POLICY "Public can view menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu_items" ON public.menu_items FOR ALL USING (is_admin(auth.uid()));

-- Políticas para role_menu_defaults
CREATE POLICY "Authenticated can read menu_defaults" ON public.role_menu_defaults FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu_defaults" ON public.role_menu_defaults FOR ALL USING (is_admin(auth.uid()));

-- Políticas para role_kanban_defaults
CREATE POLICY "Authenticated can read kanban_defaults" ON public.role_kanban_defaults FOR SELECT USING (true);
CREATE POLICY "Admins can manage kanban_defaults" ON public.role_kanban_defaults FOR ALL USING (is_admin(auth.uid()));

-- Políticas para user_sound_preferences
CREATE POLICY "Users can view own preferences" ON public.user_sound_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_sound_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_sound_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para tags
CREATE POLICY "Public can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para dimension_presets
CREATE POLICY "Authenticated can view presets" ON public.dimension_presets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage presets" ON public.dimension_presets FOR ALL USING (is_admin(auth.uid()));

-- Políticas para price_rules
CREATE POLICY "Authenticated can view price_rules" ON public.price_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage price_rules" ON public.price_rules FOR ALL USING (is_admin(auth.uid()));

-- Políticas para variation_attributes
CREATE POLICY "Public can view variation_attributes" ON public.variation_attributes FOR SELECT USING (true);
CREATE POLICY "Admins can manage variation_attributes" ON public.variation_attributes FOR ALL USING (is_admin(auth.uid()));

-- Políticas para dashboard_configs
CREATE POLICY "Users can view own and public dashboards" ON public.dashboard_configs FOR SELECT 
  USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can create own dashboards" ON public.dashboard_configs FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own dashboards" ON public.dashboard_configs FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own dashboards" ON public.dashboard_configs FOR DELETE USING (created_by = auth.uid());
CREATE POLICY "Admins full access to dashboards" ON public.dashboard_configs FOR ALL USING (is_admin(auth.uid()));

-- Políticas para data_sources
CREATE POLICY "Authenticated can view active data_sources" ON public.data_sources FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage data_sources" ON public.data_sources FOR ALL USING (is_admin(auth.uid()));

-- Políticas para dashboard_widgets
CREATE POLICY "Users can view widgets of accessible dashboards" ON public.dashboard_widgets FOR SELECT 
  USING (EXISTS (SELECT 1 FROM dashboard_configs dc WHERE dc.id = dashboard_id AND (dc.is_public = true OR dc.created_by = auth.uid())));
CREATE POLICY "Users can manage widgets of own dashboards" ON public.dashboard_widgets FOR ALL 
  USING (EXISTS (SELECT 1 FROM dashboard_configs dc WHERE dc.id = dashboard_id AND dc.created_by = auth.uid()));
CREATE POLICY "Admins full access to widgets" ON public.dashboard_widgets FOR ALL USING (is_admin(auth.uid()));

-- Políticas para dashboard_templates
CREATE POLICY "Authenticated can view templates" ON public.dashboard_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage templates" ON public.dashboard_templates FOR ALL USING (is_admin(auth.uid()));

-- Políticas para uniform_types
CREATE POLICY "Public can view uniform_types" ON public.uniform_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage uniform_types" ON public.uniform_types FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- PARTE 7: STORAGE BUCKETS
-- ============================================================================

-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('shirt-models-images', 'shirt-models-images', true),
  ('customer-logos', 'customer-logos', true),
  ('campaign-assets', 'campaign-assets', true),
  ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para shirt-models-images
CREATE POLICY "Public can view shirt-models-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'shirt-models-images');

CREATE POLICY "Authenticated can upload shirt-models-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'shirt-models-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update shirt-models-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'shirt-models-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete shirt-models-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'shirt-models-images' AND auth.role() = 'authenticated');

-- Políticas de storage para customer-logos
CREATE POLICY "Public can view customer-logos" ON storage.objects 
FOR SELECT USING (bucket_id = 'customer-logos');

CREATE POLICY "Public can upload customer-logos" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'customer-logos');

-- Políticas de storage para campaign-assets
CREATE POLICY "Public can view campaign-assets" ON storage.objects 
FOR SELECT USING (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated can upload campaign-assets" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'campaign-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update campaign-assets" ON storage.objects 
FOR UPDATE USING (bucket_id = 'campaign-assets' AND auth.role() = 'authenticated');

-- Políticas de storage para chat-files
CREATE POLICY "Authenticated can view chat-files" ON storage.objects 
FOR SELECT USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can upload chat-files" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

-- ============================================================================
-- PARTE 8: DADOS INICIAIS
-- ============================================================================

-- Workflow template padrão
INSERT INTO public.workflow_templates (id, name, description, workflow_config) VALUES 
('00000000-0000-0000-0000-000000000001', 'Workflow Padrão', 'Fluxo padrão de campanha', '[
  {"id": "welcome", "label": "Boas-vindas", "order": 0, "enabled": true},
  {"id": "enter_name", "label": "Nome", "order": 1, "enabled": true},
  {"id": "enter_phone", "label": "Telefone", "order": 2, "enabled": true},
  {"id": "select_quantity", "label": "Quantidade", "order": 3, "enabled": true},
  {"id": "select_type", "label": "Tipo de Uniforme", "order": 4, "enabled": true},
  {"id": "customize_shirt", "label": "Personalização", "order": 5, "enabled": true},
  {"id": "logo_option", "label": "Opção de Logo", "order": 6, "enabled": true},
  {"id": "review", "label": "Revisão", "order": 7, "enabled": true},
  {"id": "thank_you", "label": "Agradecimento", "order": 8, "enabled": true}
]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Tags de segmento
INSERT INTO public.tags (tag_type, tag_value, display_label, icon) VALUES 
('segment', 'adventure_', 'Adventure', '🏔️'),
('segment', 'ciclismo_', 'Ciclismo', '🚴'),
('segment', 'corrida_', 'Corrida', '🏃'),
('segment', 'futebol_', 'Futebol', '⚽'),
('segment', 'fitness_', 'Fitness', '💪'),
('segment', 'corporativo_', 'Corporativo', '👔')
ON CONFLICT (tag_type, tag_value) DO NOTHING;

-- Tags de modelo
INSERT INTO public.tags (tag_type, tag_value, display_label, icon) VALUES 
('model', 'manga_curta_', 'Manga Curta', '👕'),
('model', 'manga_longa_', 'Manga Longa', '🧥'),
('model', 'regata_', 'Regata', '🎽'),
('model', 'ziper_manga_longa_', 'Zíper Manga Longa', '🧥')
ON CONFLICT (tag_type, tag_value) DO NOTHING;

-- Tipos de uniforme
INSERT INTO public.uniform_types (tag, label, description, icon, display_order) VALUES 
('manga-curta', 'Manga Curta', 'Camiseta manga curta', '👕', 1),
('manga-longa', 'Manga Longa', 'Camiseta manga longa', '🧥', 2),
('regata', 'Regata', 'Camiseta regata', '🎽', 3),
('ziper-manga-longa', 'Zíper Manga Longa', 'Jaqueta com zíper', '🧥', 4)
ON CONFLICT (tag) DO NOTHING;

-- Motivos de urgência
INSERT INTO public.urgent_reasons (label, description, display_order) VALUES 
('Evento próximo', 'Cliente precisa do uniforme para evento em breve', 1),
('Cliente VIP', 'Cliente importante ou de alto valor', 2),
('Retrabalho', 'Erro anterior que precisa ser corrigido urgentemente', 3),
('Prazo contratual', 'Prazo definido em contrato', 4)
ON CONFLICT DO NOTHING;

-- Segmentos de negócio (para Adventure)
INSERT INTO public.business_segments (name, description, icon, display_order) VALUES 
('Trilha', 'Atividades de trilha e trekking', '🥾', 1),
('Montanhismo', 'Escalada e montanhismo', '🏔️', 2),
('Camping', 'Acampamento e vida ao ar livre', '⛺', 3),
('Off-road', 'Veículos off-road e 4x4', '🚙', 4),
('Pesca', 'Pesca esportiva', '🎣', 5),
('Náutica', 'Atividades náuticas', '⛵', 6)
ON CONFLICT DO NOTHING;

-- Atributos de variação
INSERT INTO public.variation_attributes (attribute_type, attribute_value, display_label, display_order) VALUES 
('size', 'PP', 'PP', 1),
('size', 'P', 'P', 2),
('size', 'M', 'M', 3),
('size', 'G', 'G', 4),
('size', 'GG', 'GG', 5),
('size', 'XGG', 'XGG', 6),
('gender', 'masculino', 'Masculino', 1),
('gender', 'feminino', 'Feminino', 2),
('gender', 'unissex', 'Unissex', 3)
ON CONFLICT (attribute_type, attribute_value) DO NOTHING;

-- Role menu defaults
INSERT INTO public.role_menu_defaults (role, allowed_menu_items) VALUES 
('super_admin', ARRAY['dashboard', 'leads', 'orders', 'creation', 'customers', 'products', 'campaigns', 'segments', 'models', 'chat', 'approvals', 'settings', 'api', 'ab-tests', 'traffic', 'ranking', 'advanced-dashboard']),
('admin', ARRAY['dashboard', 'leads', 'orders', 'creation', 'customers', 'products', 'campaigns', 'segments', 'models', 'chat', 'approvals', 'settings']),
('designer', ARRAY['creation', 'chat']),
('salesperson', ARRAY['dashboard', 'leads', 'orders', 'creation', 'customers', 'chat']),
('viewer', ARRAY['dashboard'])
ON CONFLICT (role) DO UPDATE SET allowed_menu_items = EXCLUDED.allowed_menu_items;

-- Role kanban defaults
INSERT INTO public.role_kanban_defaults (role, allowed_columns) VALUES 
('super_admin', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']),
('admin', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']),
('designer', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested']),
('salesperson', ARRAY['pending', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed']),
('viewer', ARRAY['pending', 'in_progress', 'awaiting_approval', 'approved', 'completed'])
ON CONFLICT (role) DO UPDATE SET allowed_columns = EXCLUDED.allowed_columns;

-- ============================================================================
-- PARTE 9: HABILITAR REALTIME (OPCIONAL)
-- ============================================================================

-- Habilitar realtime para tabelas que precisam
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- ============================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ============================================================================

-- Para verificar se tudo foi criado corretamente, execute:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';

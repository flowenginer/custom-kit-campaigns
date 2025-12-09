export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_test_events: {
        Row: {
          ab_test_id: string
          campaign_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
        }
        Insert: {
          ab_test_id: string
          campaign_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
        }
        Update: {
          ab_test_id?: string
          campaign_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_events_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          actual_distribution: Json | null
          campaigns: Json
          completed_at: string | null
          completion_criteria: Json
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          paused_at: string | null
          started_at: string | null
          status: string
          total_visits: number | null
          unique_link: string
          updated_at: string | null
        }
        Insert: {
          actual_distribution?: Json | null
          campaigns: Json
          completed_at?: string | null
          completion_criteria?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          paused_at?: string | null
          started_at?: string | null
          status?: string
          total_visits?: number | null
          unique_link: string
          updated_at?: string | null
        }
        Update: {
          actual_distribution?: Json | null
          campaigns?: Json
          completed_at?: string | null
          completion_criteria?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          paused_at?: string | null
          started_at?: string | null
          status?: string
          total_visits?: number | null
          unique_link?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bling_oauth_tokens: {
        Row: {
          access_token: string
          bling_user_info: Json | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          bling_user_info?: Json | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          bling_user_info?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_segments: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_themes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          theme_accent_color: string | null
          theme_accent_opacity: number | null
          theme_background_color: string | null
          theme_background_opacity: number | null
          theme_body_font: string | null
          theme_border_radius: string | null
          theme_button_color: string | null
          theme_button_opacity: number | null
          theme_button_style: string | null
          theme_font_size_base: string | null
          theme_heading_font: string | null
          theme_primary_color: string | null
          theme_primary_opacity: number | null
          theme_spacing_unit: string | null
          theme_text_color: string | null
          theme_text_opacity: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          theme_accent_color?: string | null
          theme_accent_opacity?: number | null
          theme_background_color?: string | null
          theme_background_opacity?: number | null
          theme_body_font?: string | null
          theme_border_radius?: string | null
          theme_button_color?: string | null
          theme_button_opacity?: number | null
          theme_button_style?: string | null
          theme_font_size_base?: string | null
          theme_heading_font?: string | null
          theme_primary_color?: string | null
          theme_primary_opacity?: number | null
          theme_spacing_unit?: string | null
          theme_text_color?: string | null
          theme_text_opacity?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          theme_accent_color?: string | null
          theme_accent_opacity?: number | null
          theme_background_color?: string | null
          theme_background_opacity?: number | null
          theme_body_font?: string | null
          theme_border_radius?: string | null
          theme_button_color?: string | null
          theme_button_opacity?: number | null
          theme_button_style?: string | null
          theme_font_size_base?: string | null
          theme_heading_font?: string | null
          theme_primary_color?: string | null
          theme_primary_opacity?: number | null
          theme_spacing_unit?: string | null
          theme_text_color?: string | null
          theme_text_opacity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_themes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_visual_overrides: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          overrides: Json
          step_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          overrides?: Json
          step_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          overrides?: Json
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_visual_overrides_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          custom_body_scripts: string | null
          custom_head_scripts: string | null
          deleted_at: string | null
          id: string
          model_tag: string | null
          name: string
          segment_id: string | null
          segment_tag: string | null
          unique_link: string
          updated_at: string | null
          workflow_config: Json | null
          workflow_template_id: string
        }
        Insert: {
          created_at?: string | null
          custom_body_scripts?: string | null
          custom_head_scripts?: string | null
          deleted_at?: string | null
          id?: string
          model_tag?: string | null
          name: string
          segment_id?: string | null
          segment_tag?: string | null
          unique_link: string
          updated_at?: string | null
          workflow_config?: Json | null
          workflow_template_id: string
        }
        Update: {
          created_at?: string | null
          custom_body_scripts?: string | null
          custom_head_scripts?: string | null
          deleted_at?: string | null
          id?: string
          model_tag?: string | null
          name?: string
          segment_id?: string | null
          segment_tag?: string | null
          unique_link?: string
          updated_at?: string | null
          workflow_config?: Json | null
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          layout_id: string | null
          mockup_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          task_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          layout_id?: string | null
          mockup_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          task_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          layout_id?: string | null
          mockup_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "design_task_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          created_by: string
          group_description: string | null
          group_icon: string | null
          group_name: string | null
          id: string
          is_group: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          group_description?: string | null
          group_icon?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          group_description?: string | null
          group_icon?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          audio_duration: number | null
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string
          sender_id: string
        }
        Insert: {
          audio_duration?: number | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id: string
        }
        Update: {
          audio_duration?: number | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          bling_api_key: string | null
          bling_client_id: string | null
          bling_client_secret: string | null
          bling_enabled: boolean | null
          bling_environment: string | null
          cep: string
          city: string
          cnpj: string
          complement: string | null
          created_at: string | null
          custom_domain: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          melhor_envio_environment: string | null
          melhor_envio_token: string | null
          neighborhood: string
          nome_fantasia: string | null
          number: string
          phone: string | null
          razao_social: string
          shipping_markup_type: string | null
          shipping_markup_value: number | null
          state: string
          street: string
          updated_at: string | null
        }
        Insert: {
          bling_api_key?: string | null
          bling_client_id?: string | null
          bling_client_secret?: string | null
          bling_enabled?: boolean | null
          bling_environment?: string | null
          cep: string
          city: string
          cnpj: string
          complement?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          melhor_envio_environment?: string | null
          melhor_envio_token?: string | null
          neighborhood: string
          nome_fantasia?: string | null
          number: string
          phone?: string | null
          razao_social: string
          shipping_markup_type?: string | null
          shipping_markup_value?: number | null
          state: string
          street: string
          updated_at?: string | null
        }
        Update: {
          bling_api_key?: string | null
          bling_client_id?: string | null
          bling_client_secret?: string | null
          bling_enabled?: boolean | null
          bling_environment?: string | null
          cep?: string
          city?: string
          cnpj?: string
          complement?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          melhor_envio_environment?: string | null
          melhor_envio_token?: string | null
          neighborhood?: string
          nome_fantasia?: string | null
          number?: string
          phone?: string | null
          razao_social?: string
          shipping_markup_type?: string | null
          shipping_markup_value?: number | null
          state?: string
          street?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_registration_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          expires_at: string | null
          id: string
          lead_id: string | null
          task_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          task_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          task_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_registration_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_registration_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_registration_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          cep: string
          city: string
          cnpj: string | null
          company_name: string | null
          complement: string | null
          contact_notes: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          first_order_date: string | null
          id: string
          is_active: boolean | null
          last_order_date: string | null
          name: string
          neighborhood: string
          number: string
          person_type: string
          phone: string
          state: string
          state_registration: string | null
          street: string
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          cep: string
          city: string
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          contact_notes?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_order_date?: string | null
          id?: string
          is_active?: boolean | null
          last_order_date?: string | null
          name: string
          neighborhood: string
          number: string
          person_type: string
          phone: string
          state: string
          state_registration?: string | null
          street: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          cep?: string
          city?: string
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          contact_notes?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_order_date?: string | null
          id?: string
          is_active?: boolean | null
          last_order_date?: string | null
          name?: string
          neighborhood?: string
          number?: string
          person_type?: string
          phone?: string
          state?: string
          state_registration?: string | null
          street?: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          layout: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout?: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          layout: Json
          name: string
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          layout?: Json
          name: string
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          layout?: Json
          name?: string
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          chart_type: string | null
          created_at: string | null
          dashboard_id: string | null
          data_source_id: string | null
          display_config: Json
          id: string
          position: Json
          query_config: Json
          title: string
          updated_at: string | null
          widget_type: string
        }
        Insert: {
          chart_type?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data_source_id?: string | null
          display_config?: Json
          id?: string
          position?: Json
          query_config?: Json
          title: string
          updated_at?: string | null
          widget_type: string
        }
        Update: {
          chart_type?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data_source_id?: string | null
          display_config?: Json
          id?: string
          position?: Json
          query_config?: Json
          title?: string
          updated_at?: string | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboard_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_widgets_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          available_fields: Json
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          available_fields?: Json
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          available_fields?: Json
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      design_task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_task_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["task_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["task_status"] | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["task_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["task_status"] | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["task_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["task_status"] | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_task_layouts: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          client_approved_at: string | null
          created_at: string | null
          current_version: number | null
          customization_data: Json | null
          design_files: Json | null
          id: string
          layout_number: number
          model_id: string | null
          model_name: string | null
          quantity: number | null
          status: string
          task_id: string
          uniform_type: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          client_approved_at?: string | null
          created_at?: string | null
          current_version?: number | null
          customization_data?: Json | null
          design_files?: Json | null
          id?: string
          layout_number: number
          model_id?: string | null
          model_name?: string | null
          quantity?: number | null
          status?: string
          task_id: string
          uniform_type?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          client_approved_at?: string | null
          created_at?: string | null
          current_version?: number | null
          customization_data?: Json | null
          design_files?: Json | null
          id?: string
          layout_number?: number
          model_id?: string | null
          model_name?: string | null
          quantity?: number | null
          status?: string
          task_id?: string
          uniform_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_task_layouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_task_layouts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "shirt_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_task_layouts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_tasks: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          bling_order_id: number | null
          bling_order_number: string | null
          campaign_id: string | null
          changes_notes: string | null
          client_approved_at: string | null
          client_feedback: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_salesperson: boolean | null
          current_version: number | null
          customer_id: string | null
          deadline: string | null
          deleted_at: string | null
          design_files: Json | null
          id: string
          lead_id: string | null
          order_id: string
          order_number: string | null
          order_value: number | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          registration_completed_at: string | null
          registration_sent_at: string | null
          registration_token: string | null
          returned_from_rejection: boolean | null
          shipping_option: Json | null
          shipping_value: number | null
          status: Database["public"]["Enums"]["task_status"]
          status_changed_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          bling_order_id?: number | null
          bling_order_number?: string | null
          campaign_id?: string | null
          changes_notes?: string | null
          client_approved_at?: string | null
          client_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_version?: number | null
          customer_id?: string | null
          deadline?: string | null
          deleted_at?: string | null
          design_files?: Json | null
          id?: string
          lead_id?: string | null
          order_id: string
          order_number?: string | null
          order_value?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          registration_completed_at?: string | null
          registration_sent_at?: string | null
          registration_token?: string | null
          returned_from_rejection?: boolean | null
          shipping_option?: Json | null
          shipping_value?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          status_changed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          bling_order_id?: number | null
          bling_order_number?: string | null
          campaign_id?: string | null
          changes_notes?: string | null
          client_approved_at?: string | null
          client_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_version?: number | null
          customer_id?: string | null
          deadline?: string | null
          deleted_at?: string | null
          design_files?: Json | null
          id?: string
          lead_id?: string | null
          order_id?: string
          order_number?: string | null
          order_value?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          registration_completed_at?: string | null
          registration_sent_at?: string | null
          registration_token?: string | null
          returned_from_rejection?: boolean | null
          shipping_option?: Json | null
          shipping_value?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          status_changed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_presets: {
        Row: {
          altura: number | null
          created_at: string | null
          id: string
          is_default: boolean | null
          largura: number | null
          model_tag: string
          name: string
          peso: number | null
          profundidade: number | null
          volumes: number | null
        }
        Insert: {
          altura?: number | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          largura?: number | null
          model_tag: string
          name: string
          peso?: number | null
          profundidade?: number | null
          volumes?: number | null
        }
        Update: {
          altura?: number | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          largura?: number | null
          model_tag?: string
          name?: string
          peso?: number | null
          profundidade?: number | null
          volumes?: number | null
        }
        Relationships: []
      }
      erp_exports: {
        Row: {
          created_at: string | null
          entity_id: string
          error_message: string | null
          export_type: string
          exported_by: string | null
          external_id: string | null
          external_number: string | null
          id: string
          integration_type: string
          payload: Json | null
          response: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          error_message?: string | null
          export_type: string
          exported_by?: string | null
          external_id?: string | null
          external_number?: string | null
          id?: string
          integration_type: string
          payload?: Json | null
          response?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          error_message?: string | null
          export_type?: string
          exported_by?: string | null
          external_id?: string | null
          external_number?: string | null
          id?: string
          integration_type?: string
          payload?: Json | null
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
      erp_integrations: {
        Row: {
          api_token: string | null
          config: Json | null
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          api_token?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          api_token?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event_type: string
          id: string
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          global_body_scripts: string | null
          global_head_scripts: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          global_body_scripts?: string | null
          global_head_scripts?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          global_body_scripts?: string | null
          global_head_scripts?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      kanban_column_rules: {
        Row: {
          column_id: string
          created_at: string | null
          field_name: string
          id: string
          is_active: boolean
          operator: string
          rule_order: number
          value: string | null
        }
        Insert: {
          column_id: string
          created_at?: string | null
          field_name: string
          id?: string
          is_active?: boolean
          operator: string
          rule_order?: number
          value?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string | null
          field_name?: string
          id?: string
          is_active?: boolean
          operator?: string
          rule_order?: number
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_column_rules_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          background_color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_manual_only: boolean
          key: string
          sort_order: number
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_manual_only?: boolean
          key: string
          sort_order?: number
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_manual_only?: boolean
          key?: string
          sort_order?: number
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      layout_approval_links: {
        Row: {
          approved_at: string | null
          changes_requested_at: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          layout_id: string | null
          task_id: string
          token: string
        }
        Insert: {
          approved_at?: string | null
          changes_requested_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          layout_id?: string | null
          task_id: string
          token: string
        }
        Update: {
          approved_at?: string | null
          changes_requested_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          layout_id?: string | null
          task_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "layout_approval_links_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "design_task_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layout_approval_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ab_test_id: string | null
          ab_variant: string | null
          attempt_number: number | null
          business_segment_id: string | null
          business_segment_other: string | null
          campaign_id: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          created_by_salesperson: boolean | null
          current_step: number | null
          custom_quantity: number | null
          customization_summary: Json | null
          deleted_at: string | null
          device_browser: string | null
          device_os: string | null
          device_type: string | null
          email: string | null
          id: string
          is_online: boolean | null
          last_seen: string | null
          lead_group_identifier: string | null
          logo_action: string | null
          logo_description: string | null
          name: string
          needs_logo: boolean | null
          order_id: string | null
          phone: string
          quantity: string
          salesperson_status: string | null
          session_id: string
          updated_at: string | null
          uploaded_logo_url: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ab_test_id?: string | null
          ab_variant?: string | null
          attempt_number?: number | null
          business_segment_id?: string | null
          business_segment_other?: string | null
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_step?: number | null
          custom_quantity?: number | null
          customization_summary?: Json | null
          deleted_at?: string | null
          device_browser?: string | null
          device_os?: string | null
          device_type?: string | null
          email?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          lead_group_identifier?: string | null
          logo_action?: string | null
          logo_description?: string | null
          name: string
          needs_logo?: boolean | null
          order_id?: string | null
          phone: string
          quantity: string
          salesperson_status?: string | null
          session_id: string
          updated_at?: string | null
          uploaded_logo_url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ab_test_id?: string | null
          ab_variant?: string | null
          attempt_number?: number | null
          business_segment_id?: string | null
          business_segment_other?: string | null
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_step?: number | null
          custom_quantity?: number | null
          customization_summary?: Json | null
          deleted_at?: string | null
          device_browser?: string | null
          device_os?: string | null
          device_type?: string | null
          email?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          lead_group_identifier?: string | null
          logo_action?: string | null
          logo_description?: string | null
          name?: string
          needs_logo?: boolean | null
          order_id?: string | null
          phone?: string
          quantity?: string
          salesperson_status?: string | null
          session_id?: string
          updated_at?: string | null
          uploaded_logo_url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_segment_id_fkey"
            columns: ["business_segment_id"]
            isOneToOne: false
            referencedRelation: "business_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          parent_id: string | null
          route: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          parent_id?: string | null
          route: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          parent_id?: string | null
          route?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          customer_name: string | null
          id: string
          message: string
          read: boolean | null
          task_id: string | null
          task_status: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          id?: string
          message: string
          read?: boolean | null
          task_id?: string | null
          task_status?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          id?: string
          message?: string
          read?: boolean | null
          task_id?: string | null
          task_status?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customization_data: Json
          deleted_at: string | null
          id: string
          model_id: string | null
          quantity: number
          session_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customization_data: Json
          deleted_at?: string | null
          id?: string
          model_id?: string | null
          quantity: number
          session_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customization_data?: Json
          deleted_at?: string | null
          id?: string
          model_id?: string | null
          quantity?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "shirt_models"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_customer_delete_requests: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          reason: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_customer_delete_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_customer_delete_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_customer_delete_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_delete_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_delete_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_delete_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_delete_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_modification_requests: {
        Row: {
          attachments: Json | null
          created_at: string | null
          description: string
          id: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          description: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_modification_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_modification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_modification_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_priority_change_requests: {
        Row: {
          created_at: string | null
          current_priority: Database["public"]["Enums"]["task_priority"]
          id: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          requested_priority: Database["public"]["Enums"]["task_priority"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
          updated_at: string | null
          urgent_reason_id: string | null
          urgent_reason_text: string | null
        }
        Insert: {
          created_at?: string | null
          current_priority: Database["public"]["Enums"]["task_priority"]
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          requested_priority: Database["public"]["Enums"]["task_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
          updated_at?: string | null
          urgent_reason_id?: string | null
          urgent_reason_text?: string | null
        }
        Update: {
          created_at?: string | null
          current_priority?: Database["public"]["Enums"]["task_priority"]
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          requested_priority?: Database["public"]["Enums"]["task_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
          updated_at?: string | null
          urgent_reason_id?: string | null
          urgent_reason_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_priority_change_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_priority_change_requests_urgent_reason_id_fkey"
            columns: ["urgent_reason_id"]
            isOneToOne: false
            referencedRelation: "urgent_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_urgent_requests: {
        Row: {
          created_at: string | null
          created_order_id: string | null
          created_task_id: string | null
          final_priority: Database["public"]["Enums"]["task_priority"] | null
          id: string
          rejection_reason: string | null
          request_data: Json
          requested_at: string | null
          requested_by: string | null
          requested_priority: Database["public"]["Enums"]["task_priority"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          urgent_reason_id: string | null
          urgent_reason_text: string | null
        }
        Insert: {
          created_at?: string | null
          created_order_id?: string | null
          created_task_id?: string | null
          final_priority?: Database["public"]["Enums"]["task_priority"] | null
          id?: string
          rejection_reason?: string | null
          request_data: Json
          requested_at?: string | null
          requested_by?: string | null
          requested_priority?: Database["public"]["Enums"]["task_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          urgent_reason_id?: string | null
          urgent_reason_text?: string | null
        }
        Update: {
          created_at?: string | null
          created_order_id?: string | null
          created_task_id?: string | null
          final_priority?: Database["public"]["Enums"]["task_priority"] | null
          id?: string
          rejection_reason?: string | null
          request_data?: Json
          requested_at?: string | null
          requested_by?: string | null
          requested_priority?: Database["public"]["Enums"]["task_priority"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          urgent_reason_id?: string | null
          urgent_reason_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_urgent_requests_created_order_id_fkey"
            columns: ["created_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_urgent_requests_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_urgent_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_urgent_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_urgent_requests_urgent_reason_id_fkey"
            columns: ["urgent_reason_id"]
            isOneToOne: false
            referencedRelation: "urgent_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          affects_base_price: boolean | null
          affects_promotional_price: boolean | null
          apply_to: string
          created_at: string | null
          genders: string[] | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          model_tag: string | null
          model_tags: string[] | null
          name: string
          price_value: number
          priority: number | null
          rule_type: string
          segment_tag: string | null
          segment_tags: string[] | null
          sizes: string[] | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          affects_base_price?: boolean | null
          affects_promotional_price?: boolean | null
          apply_to: string
          created_at?: string | null
          genders?: string[] | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          model_tag?: string | null
          model_tags?: string[] | null
          name: string
          price_value: number
          priority?: number | null
          rule_type: string
          segment_tag?: string | null
          segment_tags?: string[] | null
          sizes?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          affects_base_price?: boolean | null
          affects_promotional_price?: boolean | null
          apply_to?: string
          created_at?: string | null
          genders?: string[] | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          model_tag?: string | null
          model_tags?: string[] | null
          name?: string
          price_value?: number
          priority?: number | null
          rule_type?: string
          segment_tag?: string | null
          segment_tags?: string[] | null
          sizes?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          base_price: number
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          model_tag: string
          sku_prefix: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          model_tag: string
          sku_prefix: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          model_tag?: string
          sku_prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allowed_kanban_columns: Json | null
          allowed_menu_items: string[] | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          allowed_kanban_columns?: Json | null
          allowed_menu_items?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          allowed_kanban_columns?: Json | null
          allowed_menu_items?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_size_selections: {
        Row: {
          created_at: string | null
          id: string
          item_index: number
          layout_id: string | null
          quote_id: string
          size_grid: Json
          total_quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_index: number
          layout_id?: string | null
          quote_id: string
          size_grid?: Json
          total_quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_index?: number
          layout_id?: string | null
          quote_id?: string
          size_grid?: Json
          total_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_size_selections_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "design_task_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_size_selections_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          correction_notes: string | null
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          items: Json
          quote_number: number | null
          selected_shipping: Json | null
          sent_at: string | null
          sent_by: string | null
          shipping_options: Json | null
          shipping_value: number | null
          status: string
          subtotal_before_discount: number | null
          task_id: string
          token: string
          total_amount: number
          updated_at: string | null
          valid_until: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          correction_notes?: string | null
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          items?: Json
          quote_number?: number | null
          selected_shipping?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          shipping_options?: Json | null
          shipping_value?: number | null
          status?: string
          subtotal_before_discount?: number | null
          task_id: string
          token: string
          total_amount?: number
          updated_at?: string | null
          valid_until: string
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          correction_notes?: string | null
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          items?: Json
          quote_number?: number | null
          selected_shipping?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          shipping_options?: Json | null
          shipping_value?: number | null
          status?: string
          subtotal_before_discount?: number | null
          task_id?: string
          token?: string
          total_amount?: number
          updated_at?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      role_kanban_defaults: {
        Row: {
          allowed_columns: string[]
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_columns?: string[]
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_columns?: string[]
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      role_menu_defaults: {
        Row: {
          allowed_menu_items: string[] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_menu_items?: string[] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_menu_items?: string[] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      segments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          model_tag: string | null
          name: string
          segment_tag: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_tag?: string | null
          name: string
          segment_tag?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_tag?: string | null
          name?: string
          segment_tag?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipment_history: {
        Row: {
          cancelled_at: string | null
          carrier_name: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          id: string
          label_url: string | null
          melhor_envio_id: string
          posted_at: string | null
          price: number
          service_name: string
          status: string
          status_history: Json | null
          task_id: string | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          carrier_name: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          label_url?: string | null
          melhor_envio_id: string
          posted_at?: string | null
          price: number
          service_name: string
          status?: string
          status_history?: Json | null
          task_id?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          carrier_name?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          label_url?: string | null
          melhor_envio_id?: string
          posted_at?: string | null
          price?: number
          service_name?: string
          status?: string
          status_history?: Json | null
          task_id?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_carriers: {
        Row: {
          code: string
          created_at: string | null
          display_order: number
          enabled: boolean
          id: string
          logo_url: string | null
          name: string
          services: Json
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          logo_url?: string | null
          name: string
          services?: Json
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          services?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_selection_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          dimension_info: Json | null
          expires_at: string
          id: string
          selected_at: string | null
          selected_option: Json | null
          shipping_options: Json
          task_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dimension_info?: Json | null
          expires_at: string
          id?: string
          selected_at?: string | null
          selected_option?: Json | null
          shipping_options?: Json
          task_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dimension_info?: Json | null
          expires_at?: string
          id?: string
          selected_at?: string | null
          selected_option?: Json | null
          shipping_options?: Json
          task_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_selection_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_selection_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shirt_model_variations: {
        Row: {
          created_at: string | null
          gender: string
          id: string
          is_active: boolean | null
          model_id: string
          price_adjustment: number | null
          promotional_price: number | null
          size: string
          sku_suffix: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: string
          id?: string
          is_active?: boolean | null
          model_id: string
          price_adjustment?: number | null
          promotional_price?: number | null
          size: string
          sku_suffix?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string
          id?: string
          is_active?: boolean | null
          model_id?: string
          price_adjustment?: number | null
          promotional_price?: number | null
          size?: string
          sku_suffix?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shirt_model_variations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "shirt_models"
            referencedColumns: ["id"]
          },
        ]
      }
      shirt_models: {
        Row: {
          altura: number | null
          base_price: number | null
          bling_product_id: number | null
          bling_synced_at: string | null
          created_at: string | null
          features: string[] | null
          id: string
          image_back: string
          image_front: string
          image_front_clean: string | null
          image_front_large_logo: string | null
          image_front_small_logo: string | null
          image_left: string
          image_right: string
          largura: number | null
          model_tag: string | null
          name: string
          peso: number | null
          photo_main: string
          profundidade: number | null
          segment_id: string | null
          segment_tag: string | null
          sku: string | null
          unidade: string | null
          updated_at: string | null
          volumes: number | null
        }
        Insert: {
          altura?: number | null
          base_price?: number | null
          bling_product_id?: number | null
          bling_synced_at?: string | null
          created_at?: string | null
          features?: string[] | null
          id?: string
          image_back: string
          image_front: string
          image_front_clean?: string | null
          image_front_large_logo?: string | null
          image_front_small_logo?: string | null
          image_left: string
          image_right: string
          largura?: number | null
          model_tag?: string | null
          name: string
          peso?: number | null
          photo_main: string
          profundidade?: number | null
          segment_id?: string | null
          segment_tag?: string | null
          sku?: string | null
          unidade?: string | null
          updated_at?: string | null
          volumes?: number | null
        }
        Update: {
          altura?: number | null
          base_price?: number | null
          bling_product_id?: number | null
          bling_synced_at?: string | null
          created_at?: string | null
          features?: string[] | null
          id?: string
          image_back?: string
          image_front?: string
          image_front_clean?: string | null
          image_front_large_logo?: string | null
          image_front_small_logo?: string | null
          image_left?: string
          image_right?: string
          largura?: number | null
          model_tag?: string | null
          name?: string
          peso?: number | null
          photo_main?: string
          profundidade?: number | null
          segment_id?: string | null
          segment_tag?: string | null
          sku?: string | null
          unidade?: string | null
          updated_at?: string | null
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shirt_models_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          display_label: string | null
          icon: string | null
          id: string
          tag_type: string
          tag_value: string
        }
        Insert: {
          created_at?: string | null
          display_label?: string | null
          icon?: string | null
          id?: string
          tag_type: string
          tag_value: string
        }
        Update: {
          created_at?: string | null
          display_label?: string | null
          icon?: string | null
          id?: string
          tag_type?: string
          tag_value?: string
        }
        Relationships: []
      }
      task_rejections: {
        Row: {
          created_at: string | null
          id: string
          reason_text: string | null
          reason_type: string
          rejected_by: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason_text?: string | null
          reason_type: string
          rejected_by?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason_text?: string | null
          reason_type?: string
          rejected_by?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_rejections_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      urgent_reasons: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sound_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          new_approval_sound: string | null
          new_card_sound: string | null
          status_change_sound: string | null
          updated_at: string | null
          user_id: string
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          new_approval_sound?: string | null
          new_card_sound?: string | null
          status_change_sound?: string | null
          updated_at?: string | null
          user_id: string
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          new_approval_sound?: string | null
          new_card_sound?: string | null
          status_change_sound?: string | null
          updated_at?: string | null
          user_id?: string
          volume?: number | null
        }
        Relationships: []
      }
      variation_attributes: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_system: boolean | null
          name: string
          options: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_system?: boolean | null
          name: string
          options?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_system?: boolean | null
          name?: string
          options?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          include_customization: boolean | null
          is_active: boolean | null
          name: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          include_customization?: boolean | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          include_customization?: boolean | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean | null
          task_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          task_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          task_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workflow_config: Json
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workflow_config: Json
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workflow_config?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_customer_exists: {
        Args: { p_cnpj?: string; p_cpf?: string }
        Returns: Json
      }
      complete_customer_registration: {
        Args: { p_customer_id: string; p_token: string }
        Returns: undefined
      }
      format_tag_to_name: { Args: { tag: string }; Returns: string }
      get_all_users_with_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          full_name: string
          last_message_content: string
          last_message_created_at: string
          last_message_type: string
          role: string
          unread_count: number
          updated_at: string
          user_id: string
        }[]
      }
      get_total_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          group_icon: string
          group_name: string
          is_group: boolean
          last_message_content: string
          last_message_created_at: string
          last_message_sender_name: string
          last_message_type: string
          other_user_id: string
          other_user_name: string
          other_user_role: string
          unread_count: number
          updated_at: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ab_test_visit: {
        Args: { test_id: string; variant_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_lead_rejected_by_designer: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      notify_customer_registered: {
        Args: { p_customer_name: string; p_task_id: string; p_user_id: string }
        Returns: undefined
      }
      update_task_customer_id: {
        Args: { p_customer_id: string; p_task_id: string }
        Returns: undefined
      }
      user_created_conversation: { Args: { conv_id: string }; Returns: boolean }
      user_is_participant: { Args: { conv_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "designer" | "viewer" | "salesperson"
      task_priority: "normal" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "awaiting_approval"
        | "approved"
        | "changes_requested"
        | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "designer", "viewer", "salesperson"],
      task_priority: ["normal", "urgent"],
      task_status: [
        "pending",
        "in_progress",
        "awaiting_approval",
        "approved",
        "changes_requested",
        "completed",
      ],
    },
  },
} as const

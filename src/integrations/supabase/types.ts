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
          resolved_at: string | null
          resolved_by: string | null
          task_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          task_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      design_tasks: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          campaign_id: string | null
          changes_notes: string | null
          client_approved_at: string | null
          client_feedback: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_salesperson: boolean | null
          current_version: number | null
          deadline: string | null
          deleted_at: string | null
          design_files: Json | null
          id: string
          lead_id: string | null
          order_id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"]
          status_changed_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          changes_notes?: string | null
          client_approved_at?: string | null
          client_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_version?: number | null
          deadline?: string | null
          deleted_at?: string | null
          design_files?: Json | null
          id?: string
          lead_id?: string | null
          order_id: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"]
          status_changed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          changes_notes?: string | null
          client_approved_at?: string | null
          client_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_salesperson?: boolean | null
          current_version?: number | null
          deadline?: string | null
          deleted_at?: string | null
          design_files?: Json | null
          id?: string
          lead_id?: string | null
          order_id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
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
      leads: {
        Row: {
          ab_test_id: string | null
          ab_variant: string | null
          attempt_number: number | null
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
      shirt_models: {
        Row: {
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
          model_tag: string | null
          name: string
          photo_main: string
          segment_id: string | null
          segment_tag: string | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
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
          model_tag?: string | null
          name: string
          photo_main: string
          segment_id?: string | null
          segment_tag?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
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
          model_tag?: string | null
          name?: string
          photo_main?: string
          segment_id?: string | null
          segment_tag?: string | null
          sku?: string | null
          updated_at?: string | null
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
          id: string
          tag_type: string
          tag_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_type: string
          tag_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_type?: string
          tag_value?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "super_admin" | "admin" | "designer" | "viewer" | "salesperson"
      task_priority: "low" | "normal" | "high" | "urgent"
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
      task_priority: ["low", "normal", "high", "urgent"],
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

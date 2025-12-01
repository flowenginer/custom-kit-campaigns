// Status do banco de dados (valores reais persistidos)
export type DbTaskStatus = 
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'approved'
  | 'changes_requested'
  | 'completed';

// Status da UI (inclui filtros virtuais)
export type TaskStatus = DbTaskStatus | 'logo_needed';

export type TaskPriority = 'normal' | 'urgent';

export interface DesignTaskLayout {
  id: string;
  task_id: string;
  layout_number: number;
  campaign_id: string | null;
  campaign_name: string | null;
  uniform_type: string | null;
  model_id: string | null;
  model_name: string | null;
  status: string;
  quantity: number | null;
  customization_data: any;
  design_files: any[] | null;
  current_version: number | null;
  client_approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DesignFile {
  version: number;
  url: string;
  uploaded_at: string;
  notes?: string;
  is_revision?: boolean;
  client_approved?: boolean;
}

export interface DesignTask {
  id: string;
  order_id: string;
  lead_id: string | null;
  campaign_id: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  current_version: number;
  design_files: DesignFile[];
  client_feedback: string | null;
  client_approved_at: string | null;
  changes_notes: string | null;
  priority: TaskPriority;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  status_changed_at: string;
  deleted_at?: string | null;
  created_by_salesperson?: boolean;
  created_by?: string | null;
  order_number?: string | null;
  customer_id?: string | null;
  bling_order_id?: number | null;
  bling_order_number?: string | null;
  shipping_option?: any;
  shipping_value?: number | null;
  // Joined data
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  campaign_name?: string;
  segment_tag?: string;
  quantity?: number;
  customization_data?: any;
  designer_name?: string;
  designer_initials?: string;
  model_name?: string;
  model_code?: string;
  model_image_front?: string | null;
  needs_logo?: boolean;
  uploaded_logo_url?: string | null;
  creator_name?: string | null;
  logo_action?: 'designer_create' | 'waiting_client' | null;
  logo_description?: string | null;
  task_layouts?: DesignTaskLayout[];
}

export interface DesignTaskHistory {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus | null;
  notes: string | null;
  created_at: string;
  user_name?: string;
  user_initials?: string;
}

export interface DesignTaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user_name?: string;
}

export interface ChangeRequest {
  id: string;
  task_id: string;
  description: string;
  attachments: Array<{ name: string; url: string }>;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  creator_name?: string;
  resolver_name?: string;
}

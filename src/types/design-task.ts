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

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DesignFile {
  version: number;
  url: string;
  uploaded_at: string;
  notes?: string;
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
  deleted_at?: string | null;
  created_by_salesperson?: boolean;
  created_by?: string | null;
  // Joined data
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  campaign_name?: string;
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

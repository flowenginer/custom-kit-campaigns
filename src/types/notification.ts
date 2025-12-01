export interface Notification {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  message: string;
  type: 'status_change' | 'assignment' | 'approval' | 'comment' | 'customer_registered' | 'task_rejected';
  read: boolean;
  created_at: string;
  task_status?: string;
  customer_name?: string;
}

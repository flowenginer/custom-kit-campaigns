export interface Notification {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  message: string;
  type: 'status_change' | 'assignment' | 'approval' | 'comment';
  read: boolean;
  created_at: string;
  task_status?: string;
  customer_name?: string;
}

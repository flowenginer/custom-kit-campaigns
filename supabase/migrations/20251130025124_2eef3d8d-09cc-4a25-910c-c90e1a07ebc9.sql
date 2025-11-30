-- Remover a constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Criar nova constraint com todos os tipos necessários
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'status_change',
  'assignment',
  'approval',
  'comment',
  'customer_registered',
  'ab_test_completed'
));
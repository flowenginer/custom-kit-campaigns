-- Criar tabela de solicitações de exclusão de clientes
CREATE TABLE pending_customer_delete_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE pending_customer_delete_requests ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e atualizar
CREATE POLICY "Admins can view all customer delete requests" 
ON pending_customer_delete_requests
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update customer delete requests" 
ON pending_customer_delete_requests
FOR UPDATE USING (is_admin(auth.uid()));

-- Vendedores podem inserir próprios e ver próprios
CREATE POLICY "Salespersons can insert own customer delete requests" 
ON pending_customer_delete_requests
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'salesperson'::app_role) AND requested_by = auth.uid());

CREATE POLICY "Salespersons can view own customer delete requests" 
ON pending_customer_delete_requests
FOR SELECT 
USING (has_role(auth.uid(), 'salesperson'::app_role) AND requested_by = auth.uid());

-- Super admin acesso total
CREATE POLICY "Super admins full access to customer delete requests" 
ON pending_customer_delete_requests
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
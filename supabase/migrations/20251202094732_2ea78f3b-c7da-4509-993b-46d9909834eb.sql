-- Criar função para marcar lead como rejeitada pelo designer
-- Usa SECURITY DEFINER para bypassar RLS
CREATE OR REPLACE FUNCTION public.mark_lead_rejected_by_designer(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Dar permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.mark_lead_rejected_by_designer(uuid) TO authenticated;
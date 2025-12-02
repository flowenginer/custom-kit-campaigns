-- Criar tabela para armazenar tokens OAuth do Bling
CREATE TABLE public.bling_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  bling_user_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Apenas um registro por empresa (singleton)
CREATE UNIQUE INDEX bling_oauth_tokens_singleton ON public.bling_oauth_tokens ((true));

-- Enable RLS
ALTER TABLE public.bling_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins podem visualizar tokens Bling"
  ON public.bling_oauth_tokens
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir tokens Bling"
  ON public.bling_oauth_tokens
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar tokens Bling"
  ON public.bling_oauth_tokens
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar tokens Bling"
  ON public.bling_oauth_tokens
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_bling_oauth_tokens_updated_at
  BEFORE UPDATE ON public.bling_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- 1. Criar tabela de preferências de som
CREATE TABLE IF NOT EXISTS public.user_sound_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  new_card_sound TEXT DEFAULT 'notification',
  status_change_sound TEXT DEFAULT 'swoosh',
  new_approval_sound TEXT DEFAULT 'alert',
  volume INTEGER DEFAULT 70 CHECK (volume >= 0 AND volume <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sound_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver apenas suas próprias preferências
CREATE POLICY "Users can view own sound preferences"
ON public.user_sound_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: usuários podem inserir suas próprias preferências
CREATE POLICY "Users can insert own sound preferences"
ON public.user_sound_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: usuários podem atualizar suas próprias preferências
CREATE POLICY "Users can update own sound preferences"
ON public.user_sound_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_sound_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_sound_preferences_timestamp
BEFORE UPDATE ON public.user_sound_preferences
FOR EACH ROW
EXECUTE FUNCTION update_sound_preferences_updated_at();

-- 2. Atualizar trigger de histórico para capturar user_id corretamente
CREATE OR REPLACE FUNCTION public.log_design_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.design_task_history (
      task_id,
      action,
      old_status,
      new_status,
      user_id,
      notes
    )
    VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      auth.uid(), -- ✅ Captura user_id do contexto de auth
      CASE 
        WHEN NEW.status = 'in_progress' THEN 'Tarefa iniciada'
        WHEN NEW.status = 'awaiting_approval' THEN 'Enviado para aprovação'
        WHEN NEW.status = 'approved' THEN 'Aprovado pelo cliente'
        WHEN NEW.status = 'changes_requested' THEN 'Alterações solicitadas'
        WHEN NEW.status = 'completed' THEN 'Enviado para produção'
        ELSE 'Status alterado'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;
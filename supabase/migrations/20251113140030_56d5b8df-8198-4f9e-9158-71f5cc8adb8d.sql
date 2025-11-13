-- 1. Criar Enum de Roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'designer', 'viewer');

-- 2. Criar Tabela de Perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver todos os perfis
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Criar Tabela de Roles (SEPARADA - CRÍTICO PARA SEGURANÇA)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem ver roles
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Apenas super_admins podem inserir/atualizar/deletar roles
CREATE POLICY "Super admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Criar Função de Verificação de Role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Criar Função para Verificar se Usuário é Admin (qualquer tipo)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('super_admin', 'admin')
  )
$$;

-- 6. Trigger para Criar Perfil Automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Se for o primeiro usuário, torná-lo super_admin
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Atribuir Super Admin ao Usuário Existente
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'chel.94.santos@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar perfil se não existir
INSERT INTO public.profiles (id, full_name)
SELECT id, email
FROM auth.users
WHERE email = 'chel.94.santos@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 8. Atualizar trigger de updated_at para profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
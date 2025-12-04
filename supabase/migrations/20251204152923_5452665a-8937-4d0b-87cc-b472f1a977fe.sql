-- Criar tabela de transportadoras para configuração de envios
CREATE TABLE public.shipping_carriers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem gerenciar transportadoras"
ON public.shipping_carriers
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users podem visualizar transportadoras"
ON public.shipping_carriers
FOR SELECT
USING (auth.role() = 'authenticated');

-- Popular com transportadoras do Melhor Envio
INSERT INTO public.shipping_carriers (code, name, services, enabled, display_order) VALUES
('correios', 'Correios', '[{"code": "sedex", "name": "SEDEX", "enabled": true}, {"code": "pac", "name": "PAC", "enabled": true}, {"code": "mini", "name": "Mini Envios", "enabled": false}]'::jsonb, true, 1),
('jadlog', 'JadLog', '[{"code": "package", "name": ".Package", "enabled": false}, {"code": "com", "name": ".Com", "enabled": false}]'::jsonb, false, 2),
('jet', 'JeT', '[{"code": "standard", "name": "Standard", "enabled": false}]'::jsonb, false, 3),
('loggi', 'Loggi', '[{"code": "express", "name": "Express", "enabled": false}]'::jsonb, false, 4),
('buslog', 'Buslog', '[{"code": "rodoviario", "name": "Rodoviário", "enabled": false}]'::jsonb, false, 5),
('azul', 'Azul Cargo', '[{"code": "express", "name": "Express", "enabled": false}, {"code": "amanha", "name": "Amanhã", "enabled": false}]'::jsonb, false, 6),
('latam', 'Latam Cargo', '[{"code": "cargo", "name": "Cargo", "enabled": false}]'::jsonb, false, 7);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_shipping_carriers_updated_at
  BEFORE UPDATE ON public.shipping_carriers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
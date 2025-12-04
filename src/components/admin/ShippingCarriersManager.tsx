import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Service {
  code: string;
  name: string;
  enabled: boolean;
}

interface ShippingCarrier {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  services: Service[];
  enabled: boolean;
  display_order: number;
}

export function ShippingCarriersManager() {
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_carriers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Parse services from JSON
      const parsed = (data || []).map(carrier => ({
        ...carrier,
        services: (carrier.services as unknown) as Service[]
      }));
      
      setCarriers(parsed);
    } catch (error: any) {
      toast.error('Erro ao carregar transportadoras');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCarrier = async (carrier: ShippingCarrier) => {
    setSaving(carrier.id);
    try {
      const newEnabled = !carrier.enabled;
      
      // Se estiver desativando a transportadora, desativar todos os serviços também
      const updatedServices = newEnabled 
        ? carrier.services 
        : carrier.services.map(s => ({ ...s, enabled: false }));

      const { error } = await supabase
        .from('shipping_carriers')
        .update({ 
          enabled: newEnabled,
          services: updatedServices as unknown as Json
        })
        .eq('id', carrier.id);

      if (error) throw error;

      setCarriers(prev => prev.map(c => 
        c.id === carrier.id 
          ? { ...c, enabled: newEnabled, services: updatedServices }
          : c
      ));
      
      toast.success(`${carrier.name} ${newEnabled ? 'ativada' : 'desativada'}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar transportadora');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleService = async (carrier: ShippingCarrier, serviceCode: string) => {
    setSaving(`${carrier.id}-${serviceCode}`);
    try {
      const updatedServices = carrier.services.map(s => 
        s.code === serviceCode ? { ...s, enabled: !s.enabled } : s
      );

      // Verificar se ainda há serviços ativos
      const hasActiveServices = updatedServices.some(s => s.enabled);
      
      const { error } = await supabase
        .from('shipping_carriers')
        .update({ 
          services: updatedServices as unknown as Json,
          // Se não há mais serviços ativos, desativar a transportadora
          enabled: hasActiveServices ? carrier.enabled : false
        })
        .eq('id', carrier.id);

      if (error) throw error;

      setCarriers(prev => prev.map(c => 
        c.id === carrier.id 
          ? { 
              ...c, 
              services: updatedServices,
              enabled: hasActiveServices ? c.enabled : false
            }
          : c
      ));
      
      const service = updatedServices.find(s => s.code === serviceCode);
      toast.success(`${service?.name} ${service?.enabled ? 'ativado' : 'desativado'}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar serviço');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = carriers.filter(c => c.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          <div>
            <CardTitle>Transportadoras</CardTitle>
            <CardDescription>
              Configure quais transportadoras e serviços aparecem na cotação de frete
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={enabledCount > 0 ? "default" : "secondary"}>
            {enabledCount} ativa{enabledCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {carriers.map(carrier => (
          <div 
            key={carrier.id} 
            className={`border rounded-lg p-4 transition-colors ${
              carrier.enabled ? 'border-primary/50 bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${carrier.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Package className={`h-5 w-5 ${carrier.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <Label className="text-base font-medium">{carrier.name}</Label>
                  <p className="text-xs text-muted-foreground">
                    {carrier.services.filter(s => s.enabled).length} serviço(s) ativo(s)
                  </p>
                </div>
              </div>
              <Switch
                checked={carrier.enabled}
                onCheckedChange={() => handleToggleCarrier(carrier)}
                disabled={saving === carrier.id}
              />
            </div>
            
            {carrier.enabled && (
              <div className="ml-12 space-y-2 pt-2 border-t">
                {carrier.services.map(service => (
                  <div 
                    key={service.code} 
                    className="flex items-center justify-between py-1"
                  >
                    <Label className="text-sm font-normal cursor-pointer">
                      {service.name}
                    </Label>
                    <Switch
                      checked={service.enabled}
                      onCheckedChange={() => handleToggleService(carrier, service.code)}
                      disabled={saving === `${carrier.id}-${service.code}`}
                      className="scale-90"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Apenas os serviços ativos serão exibidos ao calcular frete. 
            Ative apenas as opções que você realmente oferece aos seus clientes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

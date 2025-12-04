import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Truck, CheckCircle2, Clock, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  discount: number;
  final_price: number;
  delivery_time: number;
  delivery_range?: {
    min: number;
    max: number;
  };
}

interface ShippingLink {
  id: string;
  task_id: string;
  token: string;
  shipping_options: ShippingOption[];
  dimension_info: any;
  expires_at: string;
  selected_at: string | null;
  selected_option: ShippingOption | null;
}

export default function ShippingSelect() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkData, setLinkData] = useState<ShippingLink | null>(null);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      if (!token) {
        setError("Link inválido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('shipping_selection_links')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Link não encontrado ou expirado");
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setError("Este link expirou. Solicite um novo link ao vendedor.");
          setLoading(false);
          return;
        }

        const linkData = data as unknown as ShippingLink;

        // Check if already selected
        if (data.selected_at) {
          setLinkData(linkData);
          setSuccess(true);
          setLoading(false);
          return;
        }

        setLinkData(linkData);
      } catch (err: any) {
        console.error('Erro ao buscar link:', err);
        setError("Erro ao carregar opções de frete");
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [token]);

  const handleSelect = async () => {
    if (!selectedOption || !linkData) return;

    setSaving(true);
    try {
      // Update shipping_selection_links
      const { error: linkError } = await supabase
        .from('shipping_selection_links')
        .update({
          selected_at: new Date().toISOString(),
          selected_option: selectedOption as any
        })
        .eq('id', linkData.id);

      if (linkError) throw linkError;

      // Update design_tasks with selected shipping
      const { error: taskError } = await supabase
        .from('design_tasks')
        .update({
          shipping_option: {
            id: selectedOption.id,
            name: selectedOption.name,
            company: selectedOption.company,
            price: selectedOption.final_price,
            delivery_time: selectedOption.delivery_time,
            selected_by_customer: true
          } as any,
          shipping_value: selectedOption.final_price
        })
        .eq('id', linkData.task_id);

      if (taskError) throw taskError;

      setSuccess(true);
      toast.success("Frete selecionado com sucesso!");
    } catch (err: any) {
      console.error('Erro ao selecionar frete:', err);
      toast.error("Erro ao confirmar seleção. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const getCarrierIcon = (company: string) => {
    if (company?.toLowerCase().includes('correios')) return '📦';
    if (company?.toLowerCase().includes('jadlog')) return '🚚';
    if (company?.toLowerCase().includes('azul')) return '✈️';
    if (company?.toLowerCase().includes('latam')) return '✈️';
    return '📬';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando opções de frete...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    const selected = linkData?.selected_option || selectedOption;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Frete Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Sua escolha de frete foi registrada com sucesso.
            </p>
            {selected && (
              <div className="bg-muted rounded-lg p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCarrierIcon(selected.company)}</span>
                  <div>
                    <p className="font-semibold">{selected.company}</p>
                    <p className="text-sm text-muted-foreground">{selected.name}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-primary">
                    R$ {selected.final_price.toFixed(2)}
                  </span>
                  <Badge variant="secondary">
                    {selected.delivery_range 
                      ? `${selected.delivery_range.min}-${selected.delivery_range.max} dias` 
                      : `${selected.delivery_time} dia(s)`
                    }
                  </Badge>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-6">
              Você pode fechar esta página. O vendedor será notificado da sua escolha.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Truck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Escolha seu Frete</CardTitle>
            <CardDescription>
              Selecione a opção de entrega de sua preferência
            </CardDescription>
            {linkData && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                <span>
                  Válido até {format(new Date(linkData.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {linkData?.shipping_options.map((option) => (
              <div
                key={option.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOption?.id === option.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">
                      {getCarrierIcon(option.company)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{option.company}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {option.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {option.discount > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        R$ {option.price.toFixed(2)}
                      </p>
                    )}
                    <p className="font-bold text-lg text-primary">
                      R$ {option.final_price.toFixed(2)}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {option.delivery_range 
                        ? `${option.delivery_range.min}-${option.delivery_range.max} dias` 
                        : `${option.delivery_time} dia(s)`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSelect}
                disabled={!selectedOption || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar Frete Selecionado
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
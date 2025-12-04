import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Percent, Calculator, Save } from "lucide-react";

export function ShippingPricingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markupType, setMarkupType] = useState<'fixed' | 'percentage'>('fixed');
  const [markupValue, setMarkupValue] = useState<number>(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('shipping_markup_type, shipping_markup_value')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setMarkupType((data.shipping_markup_type as 'fixed' | 'percentage') || 'fixed');
        setMarkupValue(data.shipping_markup_value || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({
            shipping_markup_type: markupType,
            shipping_markup_value: markupValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      }

      toast.success('Configuração de preço salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  // Calculate example
  const exampleFreight = 20;
  const calculatedValue = markupType === 'fixed' 
    ? exampleFreight + markupValue 
    : exampleFreight * (1 + markupValue / 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuração de Markup no Frete
          </CardTitle>
          <CardDescription>
            Configure um valor adicional que será aplicado automaticamente em todas as cotações de frete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="markupType">Tipo de Acréscimo</Label>
              <Select 
                value={markupType} 
                onValueChange={(value: 'fixed' | 'percentage') => setMarkupType(value)}
              >
                <SelectTrigger id="markupType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Fixo (R$)
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentual (%)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="markupValue">
                {markupType === 'fixed' ? 'Valor (R$)' : 'Percentual (%)'}
              </Label>
              <div className="relative">
                <Input
                  id="markupValue"
                  type="number"
                  min="0"
                  step={markupType === 'fixed' ? '0.01' : '1'}
                  value={markupValue}
                  onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {markupType === 'fixed' ? 'R$' : '%'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Exemplo de Cálculo</span>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete original:</span>
                  <span>R$ {exampleFreight.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Acréscimo ({markupType === 'fixed' ? `R$ ${markupValue.toFixed(2)}` : `${markupValue}%`}):
                  </span>
                  <span className="text-primary">
                    + R$ {(calculatedValue - exampleFreight).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Valor apresentado ao cliente:</span>
                  <span className="text-lg text-primary">R$ {calculatedValue.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

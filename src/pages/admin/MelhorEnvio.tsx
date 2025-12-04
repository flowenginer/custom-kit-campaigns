import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Truck, Package, Save, Loader2, CheckCircle2, XCircle, Link2, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShippingPanel } from "@/components/admin/ShippingPanel";
import { ShippingCarriersManager } from "@/components/admin/ShippingCarriersManager";
import { ShippingPricingPanel } from "@/components/admin/ShippingPricingPanel";

export default function MelhorEnvio() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Melhor Envio
  const [melhorEnvioToken, setMelhorEnvioToken] = useState("");
  const [melhorEnvioEnvironment, setMelhorEnvioEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [melhorEnvioTesting, setMelhorEnvioTesting] = useState(false);
  const [melhorEnvioTestResult, setMelhorEnvioTestResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("melhor_envio_token, melhor_envio_environment")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setMelhorEnvioToken(data.melhor_envio_token || "");
        setMelhorEnvioEnvironment((data.melhor_envio_environment as "sandbox" | "production") || "sandbox");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleTestMelhorEnvio = async () => {
    if (!melhorEnvioToken) {
      toast.error("Configure o token do Melhor Envio primeiro");
      return;
    }

    await handleSave();

    setMelhorEnvioTesting(true);
    setMelhorEnvioTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { 
          action: 'test_connection',
          data: {}
        }
      });

      if (error) {
        throw new Error(error.message || "Erro ao conectar com a função");
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      setMelhorEnvioTestResult({
        success: true,
        data: data.data
      });
      toast.success("Conexão com Melhor Envio OK!");
    } catch (error: any) {
      console.error("Error testing Melhor Envio:", error);
      setMelhorEnvioTestResult({
        success: false,
        error: error.message || "Erro ao conectar"
      });
      toast.error(error.message || "Erro ao testar conexão");
    } finally {
      setMelhorEnvioTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update({
            melhor_envio_token: melhorEnvioToken || null,
            melhor_envio_environment: melhorEnvioEnvironment,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        toast.error("Configure os dados da empresa primeiro em Configurações > Empresa");
        return;
      }

      setMelhorEnvioTestResult(null);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Truck className="h-8 w-8" />
          Melhor Envio
        </h1>
        <p className="text-muted-foreground">Configuração e gerenciamento de envios</p>
      </div>

      <Tabs defaultValue="panel">
        <TabsList>
          <TabsTrigger value="panel">
            <Package className="w-4 h-4 mr-2" />
            Painel de Envios
          </TabsTrigger>
          <TabsTrigger value="carriers">
            <Truck className="w-4 h-4 mr-2" />
            Transportadoras
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="w-4 h-4 mr-2" />
            Preço
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚚 Integração Melhor Envio
                {melhorEnvioTestResult && (
                  melhorEnvioTestResult.success ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )
                )}
              </CardTitle>
              <CardDescription>Configure o token para cotação de frete em tempo real</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="melhorEnvioEnvironment">Ambiente</Label>
                <Select value={melhorEnvioEnvironment} onValueChange={(v: any) => setMelhorEnvioEnvironment(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="melhorEnvioToken">Token do Melhor Envio</Label>
                <Textarea
                  id="melhorEnvioToken"
                  value={melhorEnvioToken}
                  onChange={(e) => {
                    setMelhorEnvioToken(e.target.value);
                    setMelhorEnvioTestResult(null);
                  }}
                  placeholder="Cole aqui o token da API do Melhor Envio"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obtenha seu token em: https://melhorenvio.com.br/painel/gerenciar/tokens
                </p>
              </div>

              <div className="space-y-3 p-4 border rounded-lg">
                <h4 className="font-medium">Testar Conexão</h4>
                <p className="text-sm text-muted-foreground">
                  Salve as configurações e teste se o token está funcionando corretamente.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestMelhorEnvio}
                    disabled={melhorEnvioTesting || !melhorEnvioToken}
                  >
                    {melhorEnvioTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                </div>
                
                {melhorEnvioTestResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    melhorEnvioTestResult.success 
                      ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                  }`}>
                    {melhorEnvioTestResult.success ? (
                      <div className="text-green-700 dark:text-green-300">
                        <p className="font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Conexão bem-sucedida!
                        </p>
                        <p className="text-sm mt-1">Conta: {melhorEnvioTestResult.data?.email}</p>
                        <p className="text-sm">Nome: {melhorEnvioTestResult.data?.name}</p>
                      </div>
                    ) : (
                      <div className="text-red-700 dark:text-red-300">
                        <p className="font-medium flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Erro na conexão
                        </p>
                        <p className="text-sm mt-1">{melhorEnvioTestResult.error}</p>
                      </div>
                    )}
                  </div>
                )}

                {!melhorEnvioToken && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Configure o token primeiro
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panel" className="mt-6">
          <ShippingPanel />
        </TabsContent>

        <TabsContent value="carriers" className="mt-6">
          <ShippingCarriersManager />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <ShippingPricingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

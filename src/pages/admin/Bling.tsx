import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Boxes, Save, Loader2, CheckCircle2, XCircle, Link2, Unlink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Bling() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bling OAuth
  const [blingClientId, setBlingClientId] = useState("");
  const [blingClientSecret, setBlingClientSecret] = useState("");
  const [blingConnected, setBlingConnected] = useState(false);
  const [blingExpiresAt, setBlingExpiresAt] = useState<string | null>(null);
  const [blingConnecting, setBlingConnecting] = useState(false);
  const [blingCheckingStatus, setBlingCheckingStatus] = useState(true);

  // Custom Domain for callback
  const [customDomain, setCustomDomain] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  // Verificar callback OAuth do Bling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const blingState = urlParams.get('state');
    
    if (code && blingState) {
      handleBlingCallback(code);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("bling_client_id, bling_client_secret, custom_domain")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setBlingClientId((data as any).bling_client_id || "");
        setBlingClientSecret((data as any).bling_client_secret || "");
        setCustomDomain((data as any).custom_domain || "");
      }

      await checkBlingStatus();
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const checkBlingStatus = async () => {
    setBlingCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('bling-oauth', {
        body: { action: 'get_status' }
      });

      if (error) {
        console.error("Error checking Bling status:", error);
        setBlingConnected(false);
      } else {
        setBlingConnected(data.connected || false);
        setBlingExpiresAt(data.expires_at || null);
      }
    } catch (error) {
      console.error("Error checking Bling status:", error);
      setBlingConnected(false);
    } finally {
      setBlingCheckingStatus(false);
    }
  };

  const getBaseUrl = () => {
    if (customDomain) {
      const cleanDomain = customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${cleanDomain}`;
    }
    return window.location.origin;
  };

  const getBlingCallbackUrl = () => `${getBaseUrl()}/admin/bling`;

  const handleCopyCallbackUrl = () => {
    navigator.clipboard.writeText(getBlingCallbackUrl());
    toast.success("URL copiada!");
  };

  const handleBlingConnect = async () => {
    if (!blingClientId || !blingClientSecret) {
      toast.error("Configure o Client ID e Client Secret primeiro");
      return;
    }

    await handleSave();

    setBlingConnecting(true);
    try {
      const redirectUri = getBlingCallbackUrl();
      
      const { data, error } = await supabase.functions.invoke('bling-oauth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const authWindow = window.open(data.auth_url, '_blank');
      if (!authWindow) {
        toast.error("Popup bloqueado. Permita popups para este site.");
        setBlingConnecting(false);
        return;
      }
      
      setBlingConnecting(false);
      toast.info("Autorize no Bling e depois clique em 'Verificar Conexão'.", { duration: 10000 });
    } catch (error: any) {
      console.error("Error connecting to Bling:", error);
      toast.error(error.message || "Erro ao conectar ao Bling");
      setBlingConnecting(false);
    }
  };

  const handleBlingCallback = async (code: string) => {
    setBlingConnecting(true);
    try {
      const redirectUri = getBlingCallbackUrl();
      
      const { data, error } = await supabase.functions.invoke('bling-oauth', {
        body: { 
          action: 'exchange_code',
          code,
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("🎉 Conectado ao Bling com sucesso!");
      setBlingConnected(true);
      setBlingExpiresAt(data.expires_at);
    } catch (error: any) {
      console.error("Error in Bling callback:", error);
      toast.error(error.message || "Erro ao processar autorização do Bling");
    } finally {
      setBlingConnecting(false);
    }
  };

  const handleBlingDisconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('bling-oauth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast.success("Desconectado do Bling");
      setBlingConnected(false);
      setBlingExpiresAt(null);
    } catch (error: any) {
      console.error("Error disconnecting from Bling:", error);
      toast.error("Erro ao desconectar do Bling");
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
            bling_client_id: blingClientId || null,
            bling_client_secret: blingClientSecret || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        toast.error("Configure os dados da empresa primeiro em Configurações > Empresa");
        return;
      }

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
          <Boxes className="h-8 w-8" />
          Bling ERP
        </h1>
        <p className="text-muted-foreground">Integração com Bling para sincronizar produtos e pedidos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔌 Integração Bling ERP
            {blingCheckingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : blingConnected ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Desconectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Conecte sua conta do Bling para sincronizar produtos e exportar pedidos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL de Callback */}
          <div className="space-y-3 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              ⚠️ URL de Callback para cadastrar no Bling
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Copie esta URL e cadastre como "URL de Callback" no painel de desenvolvedores do Bling:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background border rounded px-3 py-2 text-sm font-mono break-all">
                {getBlingCallbackUrl()}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyCallbackUrl}
                title="Copiar URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {!customDomain && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                💡 Dica: Configure o "Domínio Personalizado" em Configurações &gt; Empresa para usar seu próprio domínio
              </p>
            )}
          </div>

          {/* Credenciais OAuth */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium">1. Configure as credenciais do aplicativo</h4>
            <p className="text-sm text-muted-foreground">
              Obtenha o Client ID e Client Secret no painel de desenvolvedores do Bling:
              <a 
                href="https://developer.bling.com.br/aplicativos" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline ml-1"
              >
                developer.bling.com.br/aplicativos
              </a>
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blingClientId">Client ID</Label>
                <Input
                  id="blingClientId"
                  value={blingClientId}
                  onChange={(e) => setBlingClientId(e.target.value)}
                  placeholder="Cole o Client ID aqui"
                />
              </div>
              <div>
                <Label htmlFor="blingClientSecret">Client Secret</Label>
                <Input
                  id="blingClientSecret"
                  type="password"
                  value={blingClientSecret}
                  onChange={(e) => setBlingClientSecret(e.target.value)}
                  placeholder="Cole o Client Secret aqui"
                />
              </div>
            </div>
          </div>

          {/* Botão de Conexão OAuth */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">2. Autorize o acesso à sua conta Bling</h4>
            
            {blingConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Conectado ao Bling!</span>
                </div>
                {blingExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Token válido até: {new Date(blingExpiresAt).toLocaleString('pt-BR')}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleBlingDisconnect}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar do Bling
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para autorizar o acesso ao seu Bling. 
                  Uma nova aba será aberta para você fazer login e autorizar.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleBlingConnect}
                    disabled={blingConnecting || !blingClientId || !blingClientSecret}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {blingConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Conectar ao Bling
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={checkBlingStatus}
                    disabled={blingCheckingStatus}
                    variant="outline"
                  >
                    {blingCheckingStatus ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Verificar Conexão
                      </>
                    )}
                  </Button>
                </div>
                {(!blingClientId || !blingClientSecret) && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Configure o Client ID e Client Secret primeiro
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info sobre funcionalidades */}
          {blingConnected && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                ✅ Integração Ativa
              </h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Produtos podem ser sincronizados para o Bling</li>
                <li>• Pedidos podem ser exportados automaticamente</li>
                <li>• Clientes são cadastrados junto com os pedidos</li>
                <li>• Tokens são renovados automaticamente</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Credenciais"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

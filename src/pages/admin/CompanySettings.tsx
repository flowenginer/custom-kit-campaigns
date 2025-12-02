import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Package, Save, Boxes, Loader2, CheckCircle2, XCircle, Link2, Unlink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function CompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados da empresa
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Melhor Envio
  const [melhorEnvioToken, setMelhorEnvioToken] = useState("");
  const [melhorEnvioEnvironment, setMelhorEnvioEnvironment] = useState<"sandbox" | "production">("sandbox");

  // Bling OAuth
  const [blingClientId, setBlingClientId] = useState("");
  const [blingClientSecret, setBlingClientSecret] = useState("");
  const [blingConnected, setBlingConnected] = useState(false);
  const [blingExpiresAt, setBlingExpiresAt] = useState<string | null>(null);
  const [blingConnecting, setBlingConnecting] = useState(false);
  const [blingCheckingStatus, setBlingCheckingStatus] = useState(true);

  // Custom Domain
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
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setRazaoSocial(data.razao_social || "");
        setNomeFantasia(data.nome_fantasia || "");
        setCnpj(data.cnpj || "");
        setInscricaoEstadual(data.inscricao_estadual || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setCep(data.cep || "");
        setStreet(data.street || "");
        setNumber(data.number || "");
        setComplement(data.complement || "");
        setNeighborhood(data.neighborhood || "");
        setCity(data.city || "");
        setState(data.state || "");
        setMelhorEnvioToken(data.melhor_envio_token || "");
        setMelhorEnvioEnvironment((data.melhor_envio_environment as "sandbox" | "production") || "sandbox");
        setBlingClientId((data as any).bling_client_id || "");
        setBlingClientSecret((data as any).bling_client_secret || "");
        setCustomDomain(data.custom_domain || "");
      }

      // Verificar status da conexão Bling
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

  const handleBlingConnect = async () => {
    if (!blingClientId || !blingClientSecret) {
      toast.error("Configure o Client ID e Client Secret primeiro");
      return;
    }

    // Salvar credenciais primeiro
    await handleSave();

    setBlingConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/admin/company-settings`;
      
      const { data, error } = await supabase.functions.invoke('bling-oauth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirecionar para Bling
      window.location.href = data.auth_url;
    } catch (error: any) {
      console.error("Error connecting to Bling:", error);
      toast.error(error.message || "Erro ao conectar ao Bling");
      setBlingConnecting(false);
    }
  };

  const handleBlingCallback = async (code: string) => {
    setBlingConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/admin/company-settings`;
      
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

  const fetchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!razaoSocial || !cnpj || !cep || !street || !number || !neighborhood || !city || !state) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const settingsData = {
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj,
        inscricao_estadual: inscricaoEstadual || null,
        email: email || null,
        phone: phone || null,
        cep,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        melhor_envio_token: melhorEnvioToken || null,
        melhor_envio_environment: melhorEnvioEnvironment,
        bling_client_id: blingClientId || null,
        bling_client_secret: blingClientSecret || null,
        custom_domain: customDomain || null,
      };

      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update(settingsData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert([settingsData]);

        if (error) throw error;
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
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">Dados usados como remetente padrão</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="shipping">
            <Package className="w-4 h-4 mr-2" />
            Melhor Envio
          </TabsTrigger>
          <TabsTrigger value="bling">
            <Boxes className="w-4 h-4 mr-2" />
            Bling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Informações usadas em pedidos e integrações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input
                    id="razaoSocial"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input
                    id="nomeFantasia"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricaoEstadual"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customDomain">Domínio Personalizado</Label>
                <Input
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="app.lojaspacesport.com.br"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este domínio será usado nos links enviados aos clientes (ex: links de cadastro)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>Endereço de origem dos envios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    if (e.target.value.replace(/\D/g, "").length === 8) {
                      fetchAddressByCep(e.target.value);
                    }
                  }}
                  placeholder="00000-000"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Rua *</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integração Melhor Envio</CardTitle>
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
                  onChange={(e) => setMelhorEnvioToken(e.target.value)}
                  placeholder="Cole aqui o token da API do Melhor Envio"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obtenha seu token em: https://melhorenvio.com.br/painel/gerenciar/tokens
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bling" className="space-y-6 mt-6">
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
                      Você será redirecionado para o site do Bling para fazer login e autorizar.
                    </p>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

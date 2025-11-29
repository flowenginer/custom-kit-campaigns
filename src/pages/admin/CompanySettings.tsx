import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Package, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  useEffect(() => {
    loadSettings();
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
        setMelhorEnvioEnvironment(data.melhor_envio_environment || "sandbox");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
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

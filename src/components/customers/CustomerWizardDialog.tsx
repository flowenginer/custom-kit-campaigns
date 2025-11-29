import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface CustomerWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialPhone?: string;
}

export const CustomerWizardDialog = ({
  open,
  onOpenChange,
  onSuccess,
  initialPhone,
}: CustomerWizardDialogProps) => {
  const [step, setStep] = useState(0); // 0 = busca, 1-4 = wizard
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Etapa 1: Tipo de pessoa
  const [personType, setPersonType] = useState<"fisica" | "juridica">("fisica");
  
  // Etapa 2: Dados pessoais/empresariais
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [birthDate, setBirthDate] = useState("");
  
  // Etapa 3: Contato
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(initialPhone || "");
  const [contactNotes, setContactNotes] = useState("");
  
  // Etapa 4: Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

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

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um termo para buscar");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);

      if (!data || data.length === 0) {
        toast.info("Nenhum cliente encontrado");
      }
    } catch (error: any) {
      console.error('Error searching customers:', error);
      toast.error("Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = (customer: any) => {
    toast.success(`Cliente selecionado: ${customer.name}`);
    onSuccess();
    onOpenChange(false);
  };

  const handleCreateNew = () => {
    setSearchMode(false);
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && !personType) {
      toast.error("Selecione o tipo de pessoa");
      return;
    }
    if (step === 2) {
      if (!name) {
        toast.error("Informe o nome");
        return;
      }
      if (personType === "fisica" && !cpf) {
        toast.error("Informe o CPF");
        return;
      }
      if (personType === "juridica" && (!cnpj || !companyName)) {
        toast.error("Informe o CNPJ e a Razão Social");
        return;
      }
    }
    if (step === 3 && !phone) {
      toast.error("Informe o telefone");
      return;
    }
    if (step === 4) {
      if (!cep || !street || !number || !neighborhood || !city || !state) {
        toast.error("Preencha todos os campos obrigatórios do endereço");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const customerData = {
        name,
        person_type: personType === "fisica" ? "pf" : "pj",
        cpf: personType === "fisica" ? cpf : null,
        cnpj: personType === "juridica" ? cnpj : null,
        company_name: personType === "juridica" ? companyName : null,
        state_registration: personType === "juridica" ? stateRegistration || null : null,
        birth_date: personType === "fisica" && birthDate ? birthDate : null,
        email: email || null,
        phone,
        contact_notes: contactNotes || null,
        cep,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        created_by: user?.id || null,
      };

      const { error } = await supabase.from("customers").insert([customerData]);

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setSearchMode(true);
    setSearchTerm("");
    setSearchResults([]);
    setPersonType("fisica");
    setName("");
    setCompanyName("");
    setCpf("");
    setCnpj("");
    setStateRegistration("");
    setBirthDate("");
    setEmail("");
    setPhone(initialPhone || "");
    setContactNotes("");
    setCep("");
    setStreet("");
    setNumber("");
    setComplement("");
    setNeighborhood("");
    setCity("");
    setState("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {searchMode ? "Buscar ou Criar Cliente" : `Novo Cliente - Etapa ${step} de 4`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tela de Busca */}
          {searchMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Cliente Existente</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome, telefone, CPF ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    {loading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectExisting(customer)}
                    >
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.phone} • {customer.cpf || customer.cnpj}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <Button onClick={handleCreateNew} variant="outline" className="w-full">
                  Criar Novo Cliente
                </Button>
              </div>
            </div>
          )}

          {/* Indicador de progresso */}
          {!searchMode && (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Etapa 1: Tipo de Pessoa */}
          {!searchMode && step === 1 && (
            <div className="space-y-4">
              <Label>Tipo de Cliente</Label>
              <RadioGroup value={personType} onValueChange={(v: any) => setPersonType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fisica" id="fisica" />
                  <Label htmlFor="fisica">Pessoa Física</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="juridica" id="juridica" />
                  <Label htmlFor="juridica">Pessoa Jurídica</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Etapa 2: Dados Pessoais/Empresariais */}
          {!searchMode && step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  {personType === "fisica" ? "Nome Completo" : "Nome Fantasia"} *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={personType === "fisica" ? "João da Silva" : "Empresa LTDA"}
                />
              </div>

              {personType === "fisica" ? (
                <>
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="companyName">Razão Social *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Empresa Comércio LTDA"
                    />
                  </div>
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
                    <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                    <Input
                      id="stateRegistration"
                      value={stateRegistration}
                      onChange={(e) => setStateRegistration(e.target.value)}
                      placeholder="000.000.000.000"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Etapa 3: Contato */}
          {!searchMode && step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <Label htmlFor="contactNotes">Observações de Contato</Label>
                <Input
                  id="contactNotes"
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Preferência de horário, etc."
                />
              </div>
            </div>
          )}

          {/* Etapa 4: Endereço */}
          {!searchMode && step === 4 && (
            <div className="space-y-4">
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
                  placeholder="Apto, Sala, etc."
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
            </div>
          )}

          {/* Botões de navegação */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            {step < 4 ? (
              <Button onClick={handleNext}>
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                <Check className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Finalizar"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

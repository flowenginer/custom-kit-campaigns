import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CustomerRegister() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cepLoading, setCepLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    person_type: "pf",
    cpf: "",
    cnpj: "",
    company_name: "",
    state_registration: "",
    birth_date: "",
    cep: "",
    state: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
    complement: "",
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        toast.error("Link inválido");
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("customer_registration_links")
        .select("*")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error("Link inválido ou expirado");
        navigate("/");
        return;
      }

      setLinkData(data);
      setLoading(false);
    };

    validateToken();
  }, [token, navigate]);

  // Máscara de telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  // Busca de CEP via ViaCEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, cep });

    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
          toast.error("CEP não encontrado");
          return;
        }

        setFormData(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
        toast.success("Endereço encontrado!");
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setCepLoading(false);
      }
    }
  };

  // Validação por etapa
  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.person_type !== "";
      case 2:
        if (formData.person_type === "pf") {
          return formData.name.trim() !== "" && formData.cpf.trim() !== "";
        } else {
          return formData.name.trim() !== "" && formData.cnpj.trim() !== "";
        }
      case 3:
        return formData.phone.replace(/\D/g, "").length >= 10;
      case 4:
        return (
          formData.cep.trim() !== "" &&
          formData.street.trim() !== "" &&
          formData.number.trim() !== "" &&
          formData.neighborhood.trim() !== "" &&
          formData.city.trim() !== "" &&
          formData.state.trim() !== ""
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);

    try {
      // Criar cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          phone: formData.phone.replace(/\D/g, ""),
          email: formData.email || null,
          person_type: formData.person_type,
          cpf: formData.person_type === "pf" ? formData.cpf : null,
          cnpj: formData.person_type === "pj" ? formData.cnpj : null,
          company_name: formData.person_type === "pj" ? formData.company_name : null,
          state_registration: formData.person_type === "pj" ? formData.state_registration : null,
          birth_date: formData.birth_date || null,
          cep: formData.cep,
          state: formData.state,
          city: formData.city,
          neighborhood: formData.neighborhood,
          street: formData.street,
          number: formData.number,
          complement: formData.complement || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Atualizar link como usado
      const { error: linkError } = await supabase
        .from("customer_registration_links")
        .update({
          used_at: new Date().toISOString(),
          customer_id: customer.id,
        })
        .eq("id", linkData.id);

      if (linkError) throw linkError;

      // Atualizar task com customer_id
      if (linkData.task_id) {
        await supabase
          .from("design_tasks")
          .update({ customer_id: customer.id })
          .eq("id", linkData.task_id);
      }

      setCompleted(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao realizar cadastro: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Cadastro Concluído!</CardTitle>
            <CardDescription>
              Seu cadastro foi realizado com sucesso. Em breve entraremos em contato.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen py-8 px-4 bg-muted/30">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Cadastro de Cliente</CardTitle>
          <CardDescription>
            Preencha seus dados para completar o cadastro
          </CardDescription>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {currentStep} de 4</span>
              <span>{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Etapa 1 - Tipo de Pessoa */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Tipo de Pessoa *</Label>
                  <RadioGroup
                    value={formData.person_type}
                    onValueChange={(value) => setFormData({ ...formData, person_type: value })}
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="pf" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer flex-1">
                        <div className="font-medium">Pessoa Física</div>
                        <div className="text-sm text-muted-foreground">
                          Para cadastro com CPF
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="pj" id="legal" />
                      <Label htmlFor="legal" className="cursor-pointer flex-1">
                        <div className="font-medium">Pessoa Jurídica</div>
                        <div className="text-sm text-muted-foreground">
                          Para cadastro com CNPJ
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Etapa 2 - Dados Pessoais/Empresariais */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    {formData.person_type === "pf" ? "Nome Completo" : "Razão Social"} *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.person_type === "pf" ? "Digite seu nome completo" : "Digite a razão social"}
                  />
                </div>

                {formData.person_type === "pf" ? (
                  <>
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_name">Nome Fantasia</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Digite o nome fantasia"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state_registration">Inscrição Estadual</Label>
                      <Input
                        id="state_registration"
                        value={formData.state_registration}
                        onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                        placeholder="Digite a inscrição estadual"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Etapa 3 - Contato */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(21) 99999-9999"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite apenas números, a formatação é automática
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            )}

            {/* Etapa 4 - Endereço */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cep">CEP *</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      maxLength={8}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite o CEP para buscar o endereço automaticamente
                  </p>
                </div>

                <div>
                  <Label htmlFor="street">Rua *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto, bloco, etc"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Nome do bairro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Navegação */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finalizar Cadastro
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

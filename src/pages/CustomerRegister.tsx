import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function CustomerRegister() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [completed, setCompleted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    person_type: "individual",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Criar cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          person_type: formData.person_type,
          cpf: formData.person_type === "individual" ? formData.cpf : null,
          cnpj: formData.person_type === "legal" ? formData.cnpj : null,
          company_name: formData.person_type === "legal" ? formData.company_name : null,
          state_registration: formData.person_type === "legal" ? formData.state_registration : null,
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

  return (
    <div className="min-h-screen py-8 px-4 bg-muted/30">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Cadastro de Cliente</CardTitle>
          <CardDescription>
            Preencha seus dados para completar o cadastro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados Pessoais</h3>
              
              <div>
                <Label htmlFor="person_type">Tipo de Pessoa</Label>
                <Select value={formData.person_type} onValueChange={(value) => setFormData({ ...formData, person_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="legal">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {formData.person_type === "individual" ? (
                <>
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      required
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
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_name">Nome Fantasia</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state_registration">Inscrição Estadual</Label>
                    <Input
                      id="state_registration"
                      value={formData.state_registration}
                      onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="phone">WhatsApp *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Endereço</h3>
              
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Cadastro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
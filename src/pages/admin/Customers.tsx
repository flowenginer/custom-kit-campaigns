import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Building2, Phone, Mail, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { CustomerWizardDialog } from "@/components/customers/CustomerWizardDialog";
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  person_type: 'fisica' | 'juridica';
  cpf: string | null;
  cnpj: string | null;
  company_name: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  is_active: boolean;
  created_by: string | null;
  salesperson_name?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setCustomers((data || []).map(c => ({
        ...c,
        person_type: c.person_type as 'fisica' | 'juridica',
        total_orders: c.total_orders || 0,
        total_revenue: c.total_revenue || 0,
        is_active: c.is_active ?? true,
        salesperson_name: Array.isArray(c.profiles) ? c.profiles[0]?.full_name : (c.profiles as any)?.full_name || null,
      })));
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.cpf?.includes(searchTerm) ||
      customer.cnpj?.includes(searchTerm)
  );

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""} cadastrado
            {customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por nome, telefone, email, CPF ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <User className="h-16 w-16 text-muted-foreground/50" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchTerm
                  ? "Tente ajustar os termos da busca"
                  : "Comece cadastrando seu primeiro cliente"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow ${
                !customer.is_active ? 'opacity-50 border-destructive' : ''
              }`}
              onClick={() => handleCustomerClick(customer)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {customer.person_type === "juridica" ? (
                      <Building2 className="w-5 h-5 text-primary" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant={customer.person_type === "juridica" ? "default" : "secondary"}>
                      {customer.person_type === "juridica" ? "PJ" : "PF"}
                    </Badge>
                    {!customer.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.company_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{customer.company_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {customer.city}, {customer.state}
                  </span>
                </div>
                {customer.salesperson_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Vendedor: <span className="font-medium text-foreground">{customer.salesperson_name}</span>
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedidos:</span>
                  <span className="font-semibold">{customer.total_orders || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Faturamento:</span>
                  <span className="font-semibold text-green-600">
                    R$ {(customer.total_revenue || 0).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerWizardDialog
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={loadCustomers}
      />

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={showDetails}
        onOpenChange={setShowDetails}
        onUpdate={loadCustomers}
      />
    </div>
  );
}

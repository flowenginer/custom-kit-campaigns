import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, Phone, Mail, MapPin, Calendar, DollarSign, Package, Users, UserX, UserCheck, Layers, FileText, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TransferCustomerDialog } from "./TransferCustomerDialog";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";

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
  is_active?: boolean;
  created_by?: string | null;
}

interface CustomerStats {
  totalLayouts: number;
  totalCards: number;
  closedOrders: number;
  openCards: number;
  totalRevenue: number;
}

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const CustomerDetailsDialog = ({
  customer,
  open,
  onOpenChange,
  onUpdate,
}: CustomerDetailsDialogProps) => {
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<CustomerStats>({
    totalLayouts: 0,
    totalCards: 0,
    closedOrders: 0,
    openCards: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (customer && open) {
      loadCustomerStats();
    }
  }, [customer, open]);

  const loadCustomerStats = async () => {
    if (!customer) return;
    
    setStatsLoading(true);
    try {
      // Buscar todos os cards do cliente
      const { data: tasks, error: tasksError } = await supabase
        .from("design_tasks")
        .select("id, status, order_value")
        .eq("customer_id", customer.id)
        .is("deleted_at", null);

      if (tasksError) throw tasksError;

      const taskIds = tasks?.map(t => t.id) || [];
      
      // Buscar layouts dos cards
      let totalLayouts = 0;
      if (taskIds.length > 0) {
        const { count, error: layoutsError } = await supabase
          .from("design_task_layouts")
          .select("*", { count: "exact", head: true })
          .in("task_id", taskIds);
        
        if (layoutsError) throw layoutsError;
        totalLayouts = count || 0;
      }

      // Calcular estatísticas
      const closedOrders = tasks?.filter(t => t.status === "completed").length || 0;
      const openCards = tasks?.filter(t => t.status !== "completed").length || 0;
      const totalRevenue = tasks
        ?.filter(t => t.status === "completed")
        .reduce((sum, t) => sum + (t.order_value || 0), 0) || 0;

      setStats({
        totalLayouts,
        totalCards: tasks?.length || 0,
        closedOrders,
        openCards,
        totalRevenue,
      });
    } catch (error) {
      console.error("Error loading customer stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (!customer) return null;

  const toggleCustomerStatus = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ is_active: !customer.is_active })
        .eq("id", customer.id);

      if (error) throw error;

      toast.success(
        customer.is_active
          ? "Cliente desativado com sucesso!"
          : "Cliente reativado com sucesso!"
      );
      onUpdate();
    } catch (error) {
      console.error("Error toggling customer status:", error);
      toast.error("Erro ao atualizar status do cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
            <Badge variant={customer.person_type === "juridica" ? "default" : "secondary"}>
              {customer.person_type === "juridica" ? "Pessoa Jurídica" : "Pessoa Física"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados Principais */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              {customer.person_type === "juridica" ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              Dados Principais
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {customer.company_name && (
                <div>
                  <span className="text-muted-foreground">Razão Social:</span>
                  <p className="font-medium">{customer.company_name}</p>
                </div>
              )}
              {customer.cpf && (
                <div>
                  <span className="text-muted-foreground">CPF:</span>
                  <p className="font-medium">{customer.cpf}</p>
                </div>
              )}
              {customer.cnpj && (
                <div>
                  <span className="text-muted-foreground">CNPJ:</span>
                  <p className="font-medium">{customer.cnpj}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h3>
            <div className="text-sm space-y-1">
              <p>
                {customer.street}, {customer.number}
                {customer.complement && ` - ${customer.complement}`}
              </p>
              <p>
                {customer.neighborhood} - {customer.city}/{customer.state}
              </p>
              <p className="text-muted-foreground">CEP: {customer.cep}</p>
            </div>
          </div>

          {/* Estatísticas Detalhadas */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Estatísticas
            </h3>
            
            {statsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Layouts Solicitados */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs">Layouts</span>
                  </div>
                  <p className="text-xl font-bold">{stats.totalLayouts}</p>
                </div>

                {/* Cards Solicitados */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Cards Totais</span>
                  </div>
                  <p className="text-xl font-bold">{stats.totalCards}</p>
                </div>

                {/* Cards Abertos */}
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Em Aberto</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">{stats.openCards}</p>
                </div>

                {/* Pedidos Fechados */}
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">Fechados</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{stats.closedOrders}</p>
                </div>

                {/* Faturamento */}
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 md:col-span-2">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Faturamento Total</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Cliente Desde */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Cliente desde</span>
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(customer.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Ações de Gerenciamento */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(true)}
              disabled={loading}
            >
              <Users className="mr-2 h-4 w-4" />
              Transferir para Vendedor
            </Button>

            <Button
              variant={customer.is_active ? "destructive" : "default"}
              onClick={toggleCustomerStatus}
              disabled={loading}
            >
              {customer.is_active ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desativar Cliente
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reativar Cliente
                </>
              )}
            </Button>

            <DeleteCustomerDialog
              customerId={customer.id}
              customerName={customer.name}
              onSuccess={() => {
                onOpenChange(false);
                onUpdate();
              }}
            />
          </div>
        </div>
      </DialogContent>

      <TransferCustomerDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        customerId={customer.id}
        currentSalespersonId={customer.created_by || null}
        onTransferSuccess={() => {
          onUpdate();
          setShowTransferDialog(false);
        }}
      />
    </Dialog>
  );
};

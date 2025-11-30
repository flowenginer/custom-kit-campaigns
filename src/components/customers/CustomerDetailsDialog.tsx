import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, Phone, Mail, MapPin, Calendar, DollarSign, Package, Users, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TransferCustomerDialog } from "./TransferCustomerDialog";

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
      <DialogContent className="max-w-2xl">
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

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs">Pedidos</span>
              </div>
              <p className="text-2xl font-bold">{customer.total_orders || 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Faturamento</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                R$ {(customer.total_revenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Cliente desde</span>
              </div>
              <p className="text-sm font-medium">
                {new Date(customer.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Ações de Gerenciamento */}
          <div className="flex gap-2 pt-4 border-t">
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

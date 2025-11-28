import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Hash, User } from "lucide-react";

interface DuplicateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  existingCustomerName: string;
}

export const DuplicateOrderDialog = ({
  open,
  onOpenChange,
  orderNumber,
  existingCustomerName,
}: DuplicateOrderDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <AlertDialogTitle>Número de Pedido Duplicado</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>
                Não é possível enviar para Produção porque já existe um pedido
                com este número na coluna de Produção.
              </p>

              <div className="bg-muted p-3 rounded-lg space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">Pedido:</span> #{orderNumber}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Cliente existente:</span>{" "}
                  {existingCustomerName}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Por favor, verifique o número do pedido antes de continuar.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

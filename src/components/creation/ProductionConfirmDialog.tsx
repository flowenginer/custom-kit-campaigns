import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Factory, User, Hash, CheckCircle } from "lucide-react";

interface ProductionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: { customer_name: string; order_number: string } | null;
  onConfirm: () => void;
}

export const ProductionConfirmDialog = ({
  open,
  onOpenChange,
  task,
  onConfirm,
}: ProductionConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Factory className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Enviar para Produção
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-base">
                Você está enviando este card para a coluna de Produção.
              </p>

              {task && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Cliente:</span>
                    <span className="text-foreground">{task.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Pedido:</span>
                    <span className="text-foreground">#{task.order_number}</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Esta ação indica que o pedido está pronto para fabricação.
                Deseja continuar?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Envio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

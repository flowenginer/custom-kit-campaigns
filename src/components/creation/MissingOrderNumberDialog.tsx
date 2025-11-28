import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, User } from "lucide-react";

interface MissingOrderNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
}

export const MissingOrderNumberDialog = ({
  open,
  onOpenChange,
  customerName,
}: MissingOrderNumberDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Número do Pedido Obrigatório
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-base">
                Não é possível enviar para Produção sem o número do pedido preenchido.
              </p>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Cliente:</span>
                  <span className="text-foreground">{customerName}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Por favor, edite a tarefa e preencha o número do pedido antes de continuar.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Ok
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

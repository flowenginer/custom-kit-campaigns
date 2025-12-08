import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DesignTask, DbTaskStatus } from "@/types/design-task";

interface RejectTaskDialogProps {
  task: DesignTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId: string;
}

const REJECTION_REASONS = [
  { id: 'low_quality_logo', label: '📷 Logo com baixa qualidade' },
  { id: 'missing_logo', label: '🖼️ Logo não enviada ou incompleta' },
  { id: 'missing_info', label: '📋 Falta informações no pedido' },
  { id: 'incomplete_specs', label: '🎨 Especificações incompletas' },
  { id: 'wrong_format', label: '📁 Formato de arquivo incorreto' },
  { id: 'other', label: '❓ Outro motivo' },
];

export const RejectTaskDialog = ({
  task,
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
}: RejectTaskDialogProps) => {
  const [reasonType, setReasonType] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reasonType) {
      toast.error("Selecione um motivo para a recusa");
      return;
    }

    if (reasonType === 'other' && !reasonText.trim()) {
      toast.error("Descreva o motivo da recusa");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Inserir na tabela task_rejections
      const { error: rejectionError } = await supabase
        .from('task_rejections')
        .insert({
          task_id: task.id,
          rejected_by: currentUserId,
          reason_type: reasonType,
          reason_text: reasonText.trim() || null,
        });

      if (rejectionError) throw rejectionError;

      // 2. Atualizar a lead para indicar que foi rejeitada (usa função SECURITY DEFINER)
      if (task.lead_id) {
        const { error: leadError } = await supabase
          .rpc('mark_lead_rejected_by_designer', { p_lead_id: task.lead_id });

        if (leadError) {
          console.error('Error updating lead:', leadError);
        }
      }

      // 3. Atualizar status da design_task para pending e marcar como retorno de recusa
      const { error: taskError } = await supabase
        .from('design_tasks')
        .update({
          status: 'pending',
          assigned_to: null,
          assigned_at: null,
          status_changed_at: new Date().toISOString(),
          returned_from_rejection: false,
        })
        .eq('id', task.id);

      if (taskError) {
        console.error('Error updating task:', taskError);
        throw taskError;
      }

      // 4. Registrar no histórico
      const reasonLabel = REJECTION_REASONS.find(r => r.id === reasonType)?.label || reasonType;
      const fullReason = reasonText.trim() 
        ? `${reasonLabel}. Observação: ${reasonText}` 
        : reasonLabel;

      await supabase.from('design_task_history').insert({
        task_id: task.id,
        user_id: currentUserId,
        action: 'task_rejected',
        old_status: task.status as DbTaskStatus,
        new_status: 'pending' as DbTaskStatus,
        notes: `Tarefa recusada pelo designer. Motivo: ${fullReason}`,
      });

      // 5. Criar notificação para o vendedor
      if (task.created_by) {
        await supabase.from('notifications').insert({
          user_id: task.created_by,
          task_id: task.id,
          title: '⚠️ Tarefa Recusada pelo Designer',
          message: `A tarefa de ${task.customer_name} foi devolvida. Motivo: ${reasonLabel}`,
          type: 'task_rejected',
          task_status: 'pending',
          customer_name: task.customer_name,
        });
      }

      toast.success("Tarefa recusada e devolvida ao vendedor");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setReasonType("");
      setReasonText("");
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast.error("Erro ao recusar tarefa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Recusar Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Motivo da recusa *</Label>
            <RadioGroup value={reasonType} onValueChange={setReasonType}>
              {REJECTION_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label 
                    htmlFor={reason.id} 
                    className="font-normal cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-text" className="text-sm font-medium">
              Observação {reasonType === 'other' ? '*' : '(opcional)'}
            </Label>
            <Textarea
              id="reason-text"
              placeholder="Descreva detalhes adicionais sobre o problema encontrado..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Atenção:</strong> Ao recusar, a tarefa será devolvida para a página de 
              Pedidos e o vendedor será notificado para corrigir o problema.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reasonType}
          >
            {submitting ? (
              <>Recusando...</>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Confirmar Recusa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
import { AlertTriangle, RotateCcw, X } from "lucide-react";
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

type ActionType = 'return_for_correction' | 'reject_definitively';

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
  const [actionType, setActionType] = useState<ActionType>('return_for_correction');
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

    // ✅ VALIDAÇÃO EXTRA: Impedir devolução se tarefa nunca foi trabalhada
    // Isso previne tarefas "órfãs" que aparecem em retorno de alteração sem designer
    const isReturnForCorrection = actionType === 'return_for_correction';
    
    if (isReturnForCorrection && task.status === 'pending' && !task.assigned_to) {
      console.warn('[RejectTaskDialog] Tentativa de devolver tarefa nunca assumida:', {
        taskId: task.id,
        status: task.status,
        assigned_to: task.assigned_to,
        currentUserId
      });
      // Em vez de bloquear, vamos permitir mas garantir a atribuição (fallback seguro)
    }

    setSubmitting(true);

    try {
      // ✅ CORREÇÃO: Garantir que o designer está atribuído ANTES de devolver
      // Se for "devolver para correção" e o designer não está atribuído, atribuir agora
      if (isReturnForCorrection && !task.assigned_to) {
        const { error: assignError } = await supabase
          .from('design_tasks')
          .update({
            assigned_to: currentUserId,
            assigned_at: new Date().toISOString()
          })
          .eq('id', task.id);

        if (assignError) {
          console.error('Error assigning designer before rejection:', assignError);
          throw assignError;
        }

        // Registrar atribuição no histórico
        await supabase.from('design_task_history').insert({
          task_id: task.id,
          user_id: currentUserId,
          action: 'task_assigned',
          notes: 'Designer atribuído automaticamente antes de devolver para correção',
        });
      }

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

      // 2. Atualizar a lead SOMENTE se for recusa definitiva
      // ✅ CORREÇÃO: "Devolver para correção" NÃO deve marcar como rejected_by_designer
      // pois isso impede o card de aparecer na coluna "Retorno de Alteração"
      if (task.lead_id && !isReturnForCorrection) {
        // Recusa definitiva: marca como rejeitado pelo designer
        const { error: leadError } = await supabase
          .rpc('mark_lead_rejected_by_designer', { p_lead_id: task.lead_id });

        if (leadError) {
          console.error('Error updating lead:', leadError);
        }
      } else if (task.lead_id && isReturnForCorrection) {
        // Devolução para correção: usar 'rejected_by_designer' para o card aparecer na aba "Devolvidas"
        const { error: leadError } = await supabase
          .from('leads')
          .update({ salesperson_status: 'rejected_by_designer' })
          .eq('id', task.lead_id);

        if (leadError) {
          console.error('Error updating lead salesperson_status:', leadError);
        }
      }

      // 3. Atualizar status da design_task
      // Se "devolver para correção" - MANTER atribuição do designer (já garantida acima)
      // Se "recusar definitivamente" - REMOVER atribuição
      const updateData: Record<string, unknown> = {
        status: 'pending',
        status_changed_at: new Date().toISOString(),
        returned_from_rejection: false, // Só vira true quando o vendedor corrigir e reenviar
      };

      // Somente remove atribuição se for recusa definitiva
      if (!isReturnForCorrection) {
        updateData.assigned_to = null;
        updateData.assigned_at = null;
      }

      const { error: taskError } = await supabase
        .from('design_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (taskError) {
        console.error('Error updating task:', taskError);
        throw taskError;
      }

      // 4. Registrar no histórico com ação diferenciada
      const reasonLabel = REJECTION_REASONS.find(r => r.id === reasonType)?.label || reasonType;
      const fullReason = reasonText.trim() 
        ? `${reasonLabel}. Observação: ${reasonText}` 
        : reasonLabel;

      const historyAction = isReturnForCorrection 
        ? 'task_returned_for_correction' 
        : 'task_rejected';
      
      const historyNote = isReturnForCorrection
        ? `Tarefa devolvida para correção pelo designer. Motivo: ${fullReason}. Designer mantém atribuição.`
        : `Tarefa recusada definitivamente pelo designer. Motivo: ${fullReason}. Atribuição removida.`;

      await supabase.from('design_task_history').insert({
        task_id: task.id,
        user_id: currentUserId,
        action: historyAction,
        old_status: task.status as DbTaskStatus,
        new_status: 'pending' as DbTaskStatus,
        notes: historyNote,
      });

      // 5. Criar notificação para o vendedor
      if (task.created_by) {
        const notificationTitle = isReturnForCorrection
          ? '🔄 Tarefa Devolvida para Correção'
          : '⚠️ Tarefa Recusada pelo Designer';
        
        const notificationMessage = isReturnForCorrection
          ? `A tarefa de ${task.customer_name} foi devolvida para correção. Motivo: ${reasonLabel}`
          : `A tarefa de ${task.customer_name} foi recusada. Motivo: ${reasonLabel}`;

        await supabase.from('notifications').insert({
          user_id: task.created_by,
          task_id: task.id,
          title: notificationTitle,
          message: notificationMessage,
          type: isReturnForCorrection ? 'task_returned' : 'task_rejected',
          task_status: 'pending',
          customer_name: task.customer_name,
        });
      }

      const successMessage = isReturnForCorrection
        ? "Tarefa devolvida para correção (você continua atribuído)"
        : "Tarefa recusada e removida da sua lista";
      
      toast.success(successMessage);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setActionType('return_for_correction');
      setReasonType("");
      setReasonText("");
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast.error("Erro ao processar tarefa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Devolver ou Recusar Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Tipo de Ação */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">O que deseja fazer? *</Label>
            <RadioGroup 
              value={actionType} 
              onValueChange={(v) => setActionType(v as ActionType)}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="return_for_correction" id="return_for_correction" className="mt-0.5" />
                <Label 
                  htmlFor="return_for_correction" 
                  className="font-normal cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    Devolver para Correção
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    A tarefa volta para o vendedor corrigir e retorna para você depois.
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="reject_definitively" id="reject_definitively" className="mt-0.5" />
                <Label 
                  htmlFor="reject_definitively" 
                  className="font-normal cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <X className="h-4 w-4" />
                    Recusar Definitivamente
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    A tarefa volta para a fila geral e outro designer poderá aceitar.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Motivo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Motivo *</Label>
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

          {/* Observação */}
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

          {/* Aviso contextual */}
          <div className={`rounded-lg p-3 ${
            actionType === 'return_for_correction' 
              ? 'bg-amber-500/10 border border-amber-500/20' 
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <p className={`text-sm ${
              actionType === 'return_for_correction' 
                ? 'text-amber-700 dark:text-amber-400' 
                : 'text-destructive'
            }`}>
              {actionType === 'return_for_correction' ? (
                <>
                  <strong>Devolver para Correção:</strong> Você continuará atribuído a esta tarefa. 
                  Após o vendedor corrigir e reenviar, ela aparecerá na sua aba "Retorno de Alteração".
                </>
              ) : (
                <>
                  <strong>Recusa Definitiva:</strong> Você será removido desta tarefa. 
                  Ela voltará para a página de Pedidos e poderá ser atribuída a outro designer.
                </>
              )}
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
            variant={actionType === 'return_for_correction' ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={submitting || !reasonType}
          >
            {submitting ? (
              <>Processando...</>
            ) : actionType === 'return_for_correction' ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Devolver para Correção
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Recusar Definitivamente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

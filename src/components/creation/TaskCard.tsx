import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Shirt, Clock, AlertCircle, Package, UserPlus } from "lucide-react";
import { DesignTask } from "@/types/design-task";
import { cn } from "@/lib/utils";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
}

export const TaskCard = ({ task, onClick, showAcceptButton, currentUserId, onTaskAccepted, selectable, selected, onSelect }: TaskCardProps) => {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'completed';
  const [unresolvedChangesCount, setUnresolvedChangesCount] = useState(0);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

  useEffect(() => {
    loadUnresolvedChangesCount();
  }, [task.id]);

  const loadUnresolvedChangesCount = async () => {
    const { data, error } = await supabase
      .from("change_requests")
      .select("id", { count: "exact" })
      .eq("task_id", task.id)
      .is("resolved_at", null);

    if (!error && data) {
      setUnresolvedChangesCount(data.length);
    }
  };

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const handleAcceptTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) {
      toast.error("Erro: usuário não autenticado");
      return;
    }

    try {
      const { error } = await supabase
        .from("design_tasks")
        .update({
          assigned_to: currentUserId,
          assigned_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Tarefa aceita com sucesso!");
      onTaskAccepted?.();
    } catch (error) {
      console.error("Error accepting task:", error);
      toast.error("Erro ao aceitar tarefa");
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(task.id);
  };

  const formatDeadline = (deadline: string) => {
    return format(new Date(deadline), "dd/MM", { locale: ptBR });
  };

  const getProductionTime = () => {
    if (task.status !== 'completed' || !task.completed_at) return null;
    return formatDistanceToNow(new Date(task.completed_at), { 
      locale: ptBR, 
      addSuffix: true 
    });
  };

  const priorityConfig = {
    urgent: { label: "🔴 Urgente", variant: "destructive" as const },
    high: { label: "🟠 Alta", variant: "default" as const },
    normal: { label: "🟡 Normal", variant: "secondary" as const },
    low: { label: "🟢 Baixa", variant: "outline" as const }
  };
  
  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
  };

  const productionTime = getProductionTime();
  const isSalespersonOrigin = task.created_by_salesperson === true;

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative",
        isDragging && "opacity-50",
        isOverdue && "border-destructive"
      )}
      onClick={onClick}
    >
      {unresolvedChangesCount > 0 && (
        <Badge 
          variant="warning" 
          className="absolute top-2 right-2 text-[10px] z-10"
        >
          🔄 {unresolvedChangesCount}
        </Badge>
      )}

      {selectable && (
        <div className="absolute top-2 left-2 z-10" onClick={handleCheckboxClick}>
          <Checkbox
            checked={selected}
            className="h-5 w-5 border-2"
          />
        </div>
      )}
      
      <CardContent className="p-4">
        {/* Badges de Vendedor no topo */}
        {isSalespersonOrigin && (
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
              Vendedor
            </Badge>
            {task.creator_name && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                {task.creator_name}
              </Badge>
            )}
          </div>
        )}

        {/* Cabeçalho: Cliente e Campanha */}
        <div className="mb-3">
          <p className="font-semibold text-sm truncate">{task.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{task.campaign_name}</p>
        </div>

        {/* Corpo: Duas Colunas */}
        <div className="flex gap-3">
          {/* Coluna Esquerda: Métricas verticais */}
          <div className="flex-1 space-y-2">
            {/* Quantidade */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shirt className="h-3.5 w-3.5" />
              <span>{task.quantity} un.</span>
            </div>

            {/* Modelo */}
            {task.model_name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>📄</span>
                <span className="truncate">{task.model_name}</span>
              </div>
            )}

            {/* Designer */}
            <div className="flex items-center gap-1.5">
              {task.assigned_to && task.designer_name ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-secondary">
                      {task.designer_initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    {task.designer_name}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Não atribuído</span>
              )}
            </div>

            {/* Prioridade */}
            <div>
              <Badge variant={getPriorityConfig(task.priority).variant} className="text-[10px]">
                {getPriorityConfig(task.priority).label}
              </Badge>
            </div>

            {/* Prazo */}
            {task.deadline && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
              )}>
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDeadline(task.deadline)}</span>
              </div>
            )}

            {/* Badge de Logo Pendente */}
            {task.needs_logo && task.logo_action === 'waiting_client' && (
              <Badge variant="destructive" className="text-[10px] w-fit">
                ⏳ Aguard. Logo
              </Badge>
            )}
          </div>

          {/* Coluna Direita: Imagem da camisa */}
          <div className="w-24 h-32 flex-shrink-0 bg-muted/20 rounded-lg overflow-hidden relative">
            {task.model_image_front ? (
              <>
                <img 
                  src={task.model_image_front} 
                  alt="Modelo" 
                  className="w-full h-full object-cover"
                />
                {/* Badge de versão dentro da imagem */}
                {task.current_version > 0 && (
                  <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px]">
                    v{task.current_version}
                  </Badge>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Sem imagem
              </div>
            )}
          </div>
        </div>

        {/* Botão de Aceitar Tarefa */}
        {showAcceptButton && !task.assigned_to && (
          <Button 
            size="sm" 
            variant="secondary"
            className="w-full mt-3"
            onClick={handleAcceptTask}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Aceitar Tarefa
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

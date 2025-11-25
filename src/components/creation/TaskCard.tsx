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

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
}

export const TaskCard = ({ task, onClick, showAcceptButton, currentUserId, onTaskAccepted }: TaskCardProps) => {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'completed';
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
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
        isSalespersonOrigin && "border-2 border-amber-500 bg-amber-50/50"
      )}
      onClick={onClick}
    >
      {task.priority === 'urgent' && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Urgente
          </Badge>
        </div>
      )}
      
      {isSalespersonOrigin && (
        <div className="absolute -top-2 -left-2 z-10">
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
            👤 Vendedor
          </Badge>
        </div>
      )}
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10">
              {task.customer_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{task.customer_name}</p>
            <p className="text-xs text-muted-foreground truncate">{task.campaign_name}</p>
            {isSalespersonOrigin && task.creator_name && (
              <p className="text-xs font-medium text-amber-600 truncate">
                Por: {task.creator_name}
              </p>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Shirt className="h-3 w-3" />
              {task.quantity} un.
            </span>
            {task.deadline && (
              <span className={cn(
                "flex items-center gap-1",
                isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                {formatDeadline(task.deadline)}
              </span>
            )}
          </div>
          
          {task.model_name && (
            <div className="text-xs text-muted-foreground truncate">
              🎽 {task.model_name}
            </div>
          )}
          
          {productionTime && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Package className="h-3 w-3" />
              {productionTime}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          {task.assigned_to && task.designer_name ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-secondary">
                  {task.designer_initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {task.designer_name}
              </span>
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Não atribuído
            </Badge>
          )}
          
          {task.current_version > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              v{task.current_version}
            </Badge>
          )}
        </div>
        
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

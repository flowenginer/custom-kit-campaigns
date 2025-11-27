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
        isDragging && "opacity-50"
      )}
      onClick={onClick}
    >
      {unresolvedChangesCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="gap-1 bg-red-500 hover:bg-red-600 text-white">
            🔄 {unresolvedChangesCount}
          </Badge>
        </div>
      )}

      {selectable && (
        <div className="absolute top-2 right-2 z-10" onClick={handleCheckboxClick}>
          <Checkbox
            checked={selected}
            className="h-5 w-5 border-2"
          />
        </div>
      )}
      
      <CardContent className="p-3 space-y-2">
        {/* Cabeçalho: Badge Vendedor + Nome do Criador */}
        {(isSalespersonOrigin || task.creator_name) && (
          <div className="flex items-center justify-between">
            {isSalespersonOrigin && (
              <Badge className="bg-amber-500 text-white rounded-full px-3 text-xs">
                Vendedor
              </Badge>
            )}
            {task.creator_name && (
              <span className="text-sm font-semibold text-amber-600 truncate">
                {task.creator_name}
              </span>
            )}
          </div>
        )}
        
        {/* Corpo: Duas colunas */}
        <div className="flex gap-3">
          {/* Coluna esquerda: Informações empilhadas */}
          <div className="flex-1 space-y-1.5">
            {/* Nome do Cliente - caixa com borda */}
            <div className="border rounded px-2 py-1 bg-white">
              <span className="text-sm font-medium truncate block">
                {task.customer_name}
              </span>
            </div>
            
            {/* Segmento - caixa cinza */}
            {task.segment_tag && (
              <div className="bg-gray-100 rounded px-2 py-1">
                <span className="text-xs text-gray-700">{task.segment_tag}</span>
              </div>
            )}
            
            {/* Quantidade - caixa cinza com ícone */}
            <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-1">
              <Shirt className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-700">{task.quantity} un.</span>
            </div>
            
            {/* Modelo - caixa cinza com ícone */}
            {task.model_name && (
              <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-1">
                <span className="text-xs">🎽</span>
                <span className="text-xs text-gray-700 truncate">{task.model_name}</span>
              </div>
            )}
            
            {/* Designer - caixa cinza com avatar */}
            {task.assigned_to && task.designer_name ? (
              <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-secondary">
                    {task.designer_initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-700 truncate">{task.designer_name}</span>
              </div>
            ) : (
              <div className="bg-gray-100 rounded px-2 py-1">
                <span className="text-xs text-gray-400">Não atribuído</span>
              </div>
            )}
            
            {/* Prioridade + Versão - lado a lado */}
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityConfig(task.priority).variant} className="text-[10px]">
                {getPriorityConfig(task.priority).label}
              </Badge>
              {task.current_version > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  v{task.current_version}
                </Badge>
              )}
            </div>

            {/* Deadline */}
            {task.deadline && (
              <div className={cn(
                "bg-gray-100 rounded px-2 py-1 flex items-center gap-1",
                isOverdue && "bg-red-100"
              )}>
                <Clock className="h-3 w-3 text-gray-500" />
                <span className={cn(
                  "text-xs",
                  isOverdue ? "text-red-600 font-semibold" : "text-gray-700"
                )}>
                  {formatDeadline(task.deadline)}
                </span>
              </div>
            )}

            {/* Badge para leads sem logo */}
            {task.needs_logo && task.logo_action === 'waiting_client' && (
              <Badge variant="destructive" className="text-[10px] w-fit">
                ⏳ Aguard. Logo
              </Badge>
            )}

            {/* Tempo de produção */}
            {productionTime && (
              <div className="bg-green-100 rounded px-2 py-1 flex items-center gap-1">
                <Package className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-700">{productionTime}</span>
              </div>
            )}
          </div>
          
          {/* Coluna direita: Imagem grande */}
          {task.model_image_front && (
            <div className="w-24 flex-shrink-0">
              <img 
                src={task.model_image_front} 
                alt="Modelo" 
                className="w-full h-auto object-contain rounded"
              />
            </div>
          )}
        </div>
        
        {/* Botão aceitar tarefa */}
        {showAcceptButton && !task.assigned_to && (
          <Button 
            size="sm" 
            variant="secondary"
            className="w-full"
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

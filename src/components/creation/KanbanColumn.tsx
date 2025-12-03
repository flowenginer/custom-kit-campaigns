import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./TaskCard";
import { DesignTask, TaskStatus } from "@/types/design-task";
import { LucideIcon, ChevronsUp, ChevronsDown } from "lucide-react";
import { useDroppable } from '@dnd-kit/core';
import { cn } from "@/lib/utils";
import { CardFontSizes } from "@/hooks/useCardFontSizes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  icon: LucideIcon;
  tasks: DesignTask[];
  onTaskClick: (task: DesignTask) => void;
  backgroundColor?: string;
  fontSizes?: CardFontSizes;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
  collapsedCards: Set<string>;
  onToggleCard: (cardId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onOrderNumberUpdate?: (taskId: string, orderNumber: string) => void;
  isCollapsed?: boolean;
  autoCollapseEmpty?: boolean;
  canEditCustomerName?: boolean;
  onCustomerNameUpdate?: (taskId: string, newName: string) => void;
  isDesigner?: boolean;
}
export const KanbanColumn = ({
  title,
  status,
  icon: Icon,
  tasks,
  onTaskClick,
  backgroundColor,
  fontSizes,
  showAcceptButton,
  currentUserId,
  onTaskAccepted,
  collapsedCards,
  onToggleCard,
  onCollapseAll,
  onExpandAll,
  onOrderNumberUpdate,
  isCollapsed = false,
  autoCollapseEmpty = false,
  canEditCustomerName = false,
  onCustomerNameUpdate,
  isDesigner = false
}: KanbanColumnProps) => {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: status,
    data: {
      status
    }
  });
  
  // Determinar se está usando cor customizada
  const hasCustomColor = !!backgroundColor;
  
  // Classes condicionais baseadas na presença de cor customizada
  const headerTextClass = hasCustomColor ? "text-white" : "text-foreground";
  const iconClass = hasCustomColor ? "text-white" : "text-muted-foreground";
  const badgeClass = hasCustomColor 
    ? "bg-white/20 text-white border-white/30" 
    : "";
  const borderClass = hasCustomColor ? "border-white/20" : "border-border";
  const emptyTextClass = hasCustomColor ? "text-white/70" : "text-muted-foreground";
  
  // Se deve mostrar versão colapsada
  const shouldCollapse = isCollapsed && tasks.length === 0 && autoCollapseEmpty;
  
  return <div className={cn(
    "flex-shrink-0 h-full flex flex-col transition-all duration-300",
    shouldCollapse ? "min-w-[60px] max-w-[60px]" : "min-w-[320px]"
  )}>
      <div 
        ref={setNodeRef} 
        className={cn(
          "rounded-lg border h-full flex flex-col", 
          isOver && "border-primary ring-2 ring-primary/20"
        )} 
        style={{
          backgroundColor: backgroundColor || 'hsl(var(--card))',
          transition: 'background-color 0.3s ease, border-color 0.2s ease'
        }}
      >
        {/* Cabeçalho fixo dentro do container */}
        <div className={cn("flex items-center justify-between p-4 pb-3 border-b flex-shrink-0", borderClass)}>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", iconClass)} />
            {!shouldCollapse && <h3 className={cn("font-semibold text-xl", headerTextClass)}>{title}</h3>}
          </div>
          {!shouldCollapse && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onCollapseAll}
                title="Recolher todos"
              >
                <ChevronsUp className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onExpandAll}
                title="Expandir todos"
              >
                <ChevronsDown className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className={badgeClass}>
                {tasks.length}
              </Badge>
            </div>
          )}
          {shouldCollapse && (
            <Badge variant="secondary" className={badgeClass}>
              0
            </Badge>
          )}
        </div>

        {/* Área de scroll vertical para os cards */}
        {!shouldCollapse && (
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 py-4">
              {tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onClick={() => onTaskClick(task)}
                  fontSizes={fontSizes}
                  showAcceptButton={showAcceptButton}
                  currentUserId={currentUserId}
                  onTaskAccepted={onTaskAccepted}
                  isCollapsed={collapsedCards.has(task.id)}
                  onToggleCollapse={() => onToggleCard(task.id)}
                  onOrderNumberUpdate={onOrderNumberUpdate}
                  canEditCustomerName={canEditCustomerName}
                  onCustomerNameUpdate={onCustomerNameUpdate}
                  isDesigner={isDesigner}
                />
              ))}
              
              {tasks.length === 0 && (
                <div className={cn("text-center py-8 text-sm", emptyTextClass)}>
                  Nenhuma tarefa
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>;
};
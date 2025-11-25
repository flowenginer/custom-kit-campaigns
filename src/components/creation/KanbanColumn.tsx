import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { DesignTask, TaskStatus } from "@/types/design-task";
import { LucideIcon } from "lucide-react";
import { useDroppable } from '@dnd-kit/core';
import { cn } from "@/lib/utils";
interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  icon: LucideIcon;
  tasks: DesignTask[];
  onTaskClick: (task: DesignTask) => void;
  backgroundColor?: string;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
}
export const KanbanColumn = ({
  title,
  status,
  icon: Icon,
  tasks,
  onTaskClick,
  backgroundColor,
  showAcceptButton,
  currentUserId,
  onTaskAccepted
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
  
  return <div className="min-w-[320px] flex-shrink-0">
      <div ref={setNodeRef} className={cn("rounded-lg border p-4 min-h-[560px]", isOver && "border-primary ring-2 ring-primary/20")} style={{
      backgroundColor: backgroundColor || 'hsl(var(--card))',
      transition: 'background-color 0.3s ease, border-color 0.2s ease'
    }}>
        {/* Cabeçalho dentro do container */}
        <div className={cn("flex items-center justify-between mb-4 pb-3 border-b", borderClass)}>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", iconClass)} />
            <h3 className={cn("font-semibold text-xl", headerTextClass)}>{title}</h3>
          </div>
          <Badge variant="secondary" className={badgeClass}>
            {tasks.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              showAcceptButton={showAcceptButton}
              currentUserId={currentUserId}
              onTaskAccepted={onTaskAccepted}
            />
          ))}
          
          {tasks.length === 0 && <div className={cn("text-center py-8 text-sm", emptyTextClass)}>
              Nenhuma tarefa
            </div>}
        </div>
      </div>
    </div>;
};
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
}
export const KanbanColumn = ({
  title,
  status,
  icon: Icon,
  tasks,
  onTaskClick,
  backgroundColor
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
  return <div className="min-w-[320px] flex-shrink-0 space-y-2">
      {/* Cabeçalho fixo acima do container */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-xl">{title}</h3>
        </div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>

      {/* Container colorido com os cards */}
      <div ref={setNodeRef} className={cn("rounded-lg border p-4 min-h-[560px]", isOver && "border-primary ring-2 ring-primary/20")} style={{
      backgroundColor: backgroundColor || 'hsl(var(--card))',
      transition: 'background-color 0.3s ease, border-color 0.2s ease'
    }}>
        <div className="space-y-3">
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
          
          {tasks.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma tarefa
            </div>}
        </div>
      </div>
    </div>;
};
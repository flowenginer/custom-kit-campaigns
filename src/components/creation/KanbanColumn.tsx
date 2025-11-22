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
  return <div className="min-w-[320px] flex-shrink-0">
      <div ref={setNodeRef} className={cn("rounded-lg border p-4 min-h-[560px]", isOver && "border-primary ring-2 ring-primary/20")} style={{
      backgroundColor: backgroundColor || 'hsl(var(--card))',
      transition: 'background-color 0.3s ease, border-color 0.2s ease'
    }}>
        {/* Cabeçalho dentro do container com texto branco */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-white" />
            <h3 className="font-semibold text-xl text-white">{title}</h3>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {tasks.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
          
          {tasks.length === 0 && <div className="text-center py-8 text-sm text-white/70">
              Nenhuma tarefa
            </div>}
        </div>
      </div>
    </div>;
};
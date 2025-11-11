import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { DesignTask, TaskStatus } from "@/types/design-task";
import { LucideIcon } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  icon: LucideIcon;
  tasks: DesignTask[];
  onTaskClick: (task: DesignTask) => void;
}

export const KanbanColumn = ({
  title,
  icon: Icon,
  tasks,
  onTaskClick,
}: KanbanColumnProps) => {
  return (
    <div className="bg-card rounded-lg border p-4 min-h-[600px] min-w-[320px] flex-shrink-0">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-card pb-2 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard 
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  );
};

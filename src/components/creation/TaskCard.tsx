import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shirt, Clock, AlertCircle } from "lucide-react";
import { DesignTask } from "@/types/design-task";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'completed';
  
  const formatDeadline = (deadline: string) => {
    return format(new Date(deadline), "dd/MM", { locale: ptBR });
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

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow relative"
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
          </div>
        </div>
        
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
      </CardContent>
    </Card>
  );
};

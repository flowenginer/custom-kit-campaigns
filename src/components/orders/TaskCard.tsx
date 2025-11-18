import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shirt, Clock } from "lucide-react";
import { DesignTask } from "@/types/design-task";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
  className?: string;
}

export const OrderTaskCard = ({ task, onClick, className }: TaskCardProps) => {
  const formatDeadline = (deadline: string) => {
    return format(new Date(deadline), "dd/MM", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      awaiting_approval: { label: "Aguardando Aprovação", variant: "default" as const },
      approved: { label: "Aprovado", variant: "default" as const },
      completed: { label: "Concluído", variant: "secondary" as const },
    };
    return badges[status as keyof typeof badges] || { label: status, variant: "secondary" as const };
  };

  const statusInfo = getStatusBadge(task.status);
  const latestFile = task.design_files && task.design_files.length > 0 
    ? task.design_files[task.design_files.length - 1] 
    : null;

  return (
    <Card 
      className={cn(
        "mb-3 cursor-pointer hover:border-primary transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary/10">
                {task.customer_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{task.customer_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {task.customer_phone}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Badge variant={statusInfo.variant}>
              v{task.current_version}
            </Badge>
            {task.needs_logo && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                📎 Aguardando Logo
              </Badge>
            )}
          </div>
        </div>
        
        {latestFile && (
          <div className="mb-3 rounded overflow-hidden">
            <img 
              src={latestFile.url}
              alt="Preview do mockup"
              className="w-full h-40 object-cover"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Shirt className="h-3 w-3" />
              {task.quantity} un.
            </span>
            {task.deadline && (
              <span className="flex items-center gap-1 text-muted-foreground">
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

          {task.designer_name && (
            <div className="flex items-center gap-1.5 pt-2 border-t">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-secondary">
                  {task.designer_initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                Designer: {task.designer_name}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

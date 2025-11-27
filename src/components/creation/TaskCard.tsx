import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DesignTask } from "@/types/design-task";
import { useDraggable } from '@dnd-kit/core';
import { Shirt, User, ChevronDown, ChevronUp } from "lucide-react";
import { ElapsedTimer } from "./ElapsedTimer";
import { CardFontSizes } from "@/hooks/useCardFontSizes";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
  fontSizes?: CardFontSizes;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getCreatorType = (task: DesignTask): string => {
  if (task.created_by_salesperson) return 'Vendedor';
  return 'Admin';
};

const getPriorityConfig = (priority: string) => {
  const configs = {
    urgent: { label: 'Urgente', variant: 'destructive' as const, color: 'bg-red-500' },
    high: { label: 'Alta', variant: 'default' as const, color: 'bg-orange-500' },
    normal: { label: 'Normal', variant: 'secondary' as const, color: 'bg-yellow-500' },
    low: { label: 'Baixa', variant: 'outline' as const, color: 'bg-green-500' },
  };
  return configs[priority as keyof typeof configs] || configs.normal;
};

export const TaskCard = ({ task, onClick, fontSizes, isCollapsed = false, onToggleCollapse }: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const priorityConfig = getPriorityConfig(task.priority);

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card 
        className="border-2 border-amber-400 rounded-xl hover:shadow-lg transition-shadow"
      >
        <Collapsible open={!isCollapsed}>
          {/* Badge flutuante do tipo de criador */}
          <CollapsibleContent>
            <div className="flex justify-center -mt-3 relative z-10">
              <Badge className="bg-amber-500 text-white rounded-full px-4 py-1 font-semibold shadow-md" style={{ fontSize: `${fontSizes?.badge || 12}px` }}>
                {getCreatorType(task)}
              </Badge>
            </div>
          </CollapsibleContent>

          <CardContent className="p-3 space-y-2.5">
            {/* Nome do Cliente - largura total com botão de toggle */}
            <div className="relative">
              <div 
                className="border-2 border-gray-200 rounded-lg px-3 py-2 bg-white text-center shadow-sm cursor-pointer"
                onClick={onClick}
              >
                <span className="font-bold text-gray-800" style={{ fontSize: `${fontSizes?.customerName || 14}px` }}>{task.customer_name}</span>
              </div>
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse();
                  }}
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {/* GRID 3 COLUNAS */}
            <CollapsibleContent className="animate-accordion-down">
              <div className="grid grid-cols-3 gap-2">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-1.5">
                  {/* Segmento/Campanha */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-medium text-gray-700 truncate" style={{ fontSize: `${fontSizes?.segment || 12}px` }}>
                      {task.campaign_name || task.segment_tag || 'N/A'}
                    </span>
                  </div>

                  {/* Quantidade */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white flex items-center justify-center gap-1 min-h-[36px]">
                    <Shirt className="h-3.5 w-3.5 text-gray-500" />
                    <span className="font-medium text-gray-700" style={{ fontSize: `${fontSizes?.quantity || 12}px` }}>{task.quantity} un.</span>
                  </div>

                  {/* Designer */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white flex items-center justify-center gap-1.5 min-h-[36px]">
                    {task.designer_name ? (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary text-white">
                            {task.designer_initials || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-700 truncate flex-1" style={{ fontSize: `${fontSizes?.designer || 12}px` }}>
                          {task.designer_name.split(' ')[0]}
                        </span>
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-400" style={{ fontSize: `${fontSizes?.designer || 12}px` }}>N/A</span>
                      </>
                    )}
                  </div>

                  {/* Status/Prioridade */}
                  <div className={`${priorityConfig.color} text-white rounded px-2 py-1.5 text-center min-h-[36px] flex items-center justify-center`}>
                    <span className="font-bold" style={{ fontSize: `${fontSizes?.priority || 12}px` }}>{priorityConfig.label}</span>
                  </div>
                </div>

                {/* COLUNA CENTRAL */}
                <div className="space-y-1.5 flex flex-col items-center">
                  {/* Modelo */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white flex items-center gap-1 w-full justify-center min-h-[32px]">
                    <span className="text-base">🎽</span>
                    <span className="font-medium text-gray-700 truncate" style={{ fontSize: `${fontSizes?.model || 10}px` }}>
                      {task.model_name || 'N/A'}
                    </span>
                  </div>

                  {/* Imagem - proporcional */}
                  {task.model_image_front ? (
                    <div className="flex-1 flex items-center justify-center">
                      <img 
                        src={task.model_image_front} 
                        alt="Modelo" 
                        className="w-full max-h-28 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-100 rounded w-full">
                      <Shirt className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-1.5">
                  {/* Nome do Vendedor */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-bold text-teal-600 truncate" style={{ fontSize: `${fontSizes?.salesperson || 12}px` }}>
                      {task.creator_name || 'Sistema'}
                    </span>
                  </div>

                  {/* Versão */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-gray-50 text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-bold text-gray-700" style={{ fontSize: `${fontSizes?.version || 12}px` }}>v{task.current_version || 1}</span>
                  </div>

                  {/* Timer 1 - Tempo total */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white text-center min-h-[36px] flex items-center justify-center">
                    <ElapsedTimer since={task.created_at} label="Timer 1" fontSize={fontSizes?.timer} />
                  </div>

                  {/* Timer 2 - Tempo no container */}
                  <div className="border border-gray-200 rounded px-2 py-1.5 bg-white text-center min-h-[36px] flex items-center justify-center">
                    <ElapsedTimer since={task.status_changed_at} label="Timer 2" fontSize={fontSizes?.timer} />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
    </div>
  );
};

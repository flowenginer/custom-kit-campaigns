import { Widget } from "@/types/dashboard";
import { MetricWidget } from "./widgets/MetricWidget";
import { ChartWidget } from "./widgets/ChartWidget";
import { TableWidget } from "./widgets/TableWidget";
import { ProgressWidget } from "./widgets/ProgressWidget";
import { DraggableWidget } from "./DraggableWidget";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Maximize2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

interface WidgetGridProps {
  widgets: Widget[];
  onEdit?: (widget: Widget) => void;
  onDelete?: (widgetId: string) => void;
  onReorder?: (widgets: Widget[]) => void;
  onResize?: (widgetId: string, size: { w: number; h: number }) => void;
  previewMode?: boolean;
}

export const WidgetGrid = ({ 
  widgets, 
  onEdit, 
  onDelete, 
  onReorder, 
  onResize,
  previewMode = false 
}: WidgetGridProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      
      if (onReorder) {
        onReorder(arrayMove(widgets, oldIndex, newIndex));
      }
    }
  };

  const handleResize = (widgetId: string, currentSize: { w: number; h: number }) => {
    const newW = currentSize.w === 1 ? 2 : 1;
    const newH = currentSize.h === 1 ? 2 : 1;
    
    if (onResize) {
      onResize(widgetId, { w: newW, h: newH });
    }
  };
  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case "metric":
        return <MetricWidget widget={widget} />;
      case "chart":
        return <ChartWidget widget={widget} />;
      case "table":
        return <TableWidget widget={widget} />;
      case "progress":
        return <ProgressWidget widget={widget} />;
      default:
        return null;
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={widgets.map(w => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((widget) => (
            <DraggableWidget key={widget.id} id={widget.id} disabled={previewMode}>
              <div
                className="relative"
                style={{
                  gridColumn: `span ${widget.position?.w || 1}`,
                  gridRow: `span ${widget.position?.h || 1}`,
                }}
              >
                {renderWidget(widget)}
                
                {!previewMode && (onEdit || onDelete || onResize) && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {onResize && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => handleResize(widget.id, widget.position)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => onEdit(widget)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={() => onDelete(widget.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </DraggableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

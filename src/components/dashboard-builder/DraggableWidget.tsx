import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface DraggableWidgetProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export const DraggableWidget = ({ id, children, disabled }: DraggableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded p-1 border shadow-sm"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
};

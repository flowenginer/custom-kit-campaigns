import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { EditableElement } from "./EditableElement";
import { ImageEditPopover } from "./EditPopover";
import { cn } from "@/lib/utils";

interface SortableUniformCardProps {
  type: string;
  imageUrl: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  onImageChange?: (url: string) => void;
  isDraggable?: boolean;
}

export function SortableUniformCard({
  type,
  imageUrl,
  label,
  isSelected,
  onClick,
  onImageChange,
  isDraggable = false,
}: SortableUniformCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          "themed-card cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary w-[calc(50%-8px)] md:w-[200px]",
          isSelected && "border-primary ring-4 ring-primary/20",
          isDraggable && "cursor-move"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {isDraggable && onImageChange ? (
            <>
              <div {...attributes} {...listeners} className="cursor-move mb-4">
                <div className="aspect-square flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={label}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>
              </div>
              <div className="mb-2">
                <ImageEditPopover
                  value={imageUrl}
                  onChange={onImageChange}
                  label={`Imagem ${label}`}
                >
                  <EditableElement>
                    <div className="text-xs text-center text-muted-foreground py-1 hover:text-primary">
                      Clique para editar imagem
                    </div>
                  </EditableElement>
                </ImageEditPopover>
              </div>
            </>
          ) : (
            <div className="aspect-square mb-4 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={label}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <h4 className="text-center font-semibold text-sm">{label}</h4>
        </CardContent>
      </Card>
    </div>
  );
}

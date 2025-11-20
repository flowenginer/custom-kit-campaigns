import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  id: string;
  index: number;
  isActive?: boolean;
}

export const DroppableZone = ({ id, index, isActive }: DroppableZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-zone-${id}-${index}`,
    data: { index }
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-2 transition-all ${
        isOver || isActive
          ? 'h-8 bg-primary/20 border-2 border-dashed border-primary'
          : 'hover:h-4 hover:bg-muted/30'
      }`}
    />
  );
};

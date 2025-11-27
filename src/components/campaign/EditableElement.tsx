import { Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EditableElementProps {
  children: React.ReactNode;
  className?: string;
}

export const EditableElement = ({ children, className }: EditableElementProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative transition-all cursor-pointer group",
        isHovered && "ring-2 ring-primary ring-dashed ring-offset-2",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
          <Pencil className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

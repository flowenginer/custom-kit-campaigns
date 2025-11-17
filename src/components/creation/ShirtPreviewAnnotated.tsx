import { Badge } from "@/components/ui/badge";

interface ShirtPreviewAnnotatedProps {
  imageUrl: string;
  annotations: Array<{
    label: string;
    position: { top: string; left: string };
    variant?: 'default' | 'secondary' | 'destructive';
  }>;
  alt: string;
  onImageClick?: () => void;
}

export const ShirtPreviewAnnotated = ({ 
  imageUrl, 
  annotations, 
  alt,
  onImageClick 
}: ShirtPreviewAnnotatedProps) => {
  return (
    <div 
      className="relative w-full cursor-pointer group"
      onClick={onImageClick}
    >
      <img 
        src={imageUrl} 
        alt={alt}
        className="w-full rounded-lg border-2 border-border group-hover:border-primary transition-colors"
      />
      
      {/* Overlay escuro no hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
      
      {/* Anotações */}
      {annotations.map((annotation, idx) => (
        <div
          key={idx}
          className="absolute pointer-events-none"
          style={{
            top: annotation.position.top,
            left: annotation.position.left,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            {/* Ponto de referência */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-lg animate-pulse" />
            
            {/* Badge com label */}
            <div className="mt-6">
              <Badge 
                variant={annotation.variant || 'default'}
                className="shadow-lg text-xs whitespace-nowrap"
              >
                {annotation.label}
              </Badge>
            </div>
          </div>
        </div>
      ))}
      
      {/* Hint de zoom */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        🔍 Clique para ampliar
      </div>
    </div>
  );
};

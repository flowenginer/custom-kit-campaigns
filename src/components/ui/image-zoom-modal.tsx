import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
}

export const ImageZoomModal = ({ isOpen, onClose, imageUrl, alt }: ImageZoomModalProps) => {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 1));
  };

  const handleClose = () => {
    setScale(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <div className="relative w-full h-[95vh] bg-background/95 flex items-center justify-center">
          {/* Controles */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="h-10 w-10"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="h-10 w-10"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleClose}
              className="h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Imagem com zoom */}
          <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-none transition-transform duration-300 touch-manipulation"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center'
              }}
            />
          </div>

          {/* Indicador de escala */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-secondary/90 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">
            {Math.round(scale * 100)}%
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

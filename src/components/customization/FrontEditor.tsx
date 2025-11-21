import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShirtModel {
  id: string;
  name: string;
  image_front: string;
  image_front_small_logo?: string | null;
  image_front_large_logo?: string | null;
  image_front_clean?: string | null;
}

interface FrontCustomization {
  logoType: 'none' | 'small_left' | 'large_center' | 'custom';
  textColor: string;
  text: string;
  logoUrl: string;
}

interface FrontEditorProps {
  model: ShirtModel;
  value: FrontCustomization;
  onChange: (data: FrontCustomization) => void;
  onNext: () => void;
}

export const FrontEditor = ({ model, value, onChange, onNext }: FrontEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
  const getImageUrl = () => {
    switch(value.logoType) {
      case 'small_left':
        return model.image_front_small_logo || model.image_front;
      case 'large_center':
        return model.image_front_large_logo || model.image_front;
      case 'custom':
        return model.image_front_clean || model.image_front;
      default:
        return model.image_front;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pb-4">
      <Card className="order-1 md:order-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base md:text-lg">Preview - Frente</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsZoomOpen(true)}
            className="md:hidden h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div 
            className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[180px] md:min-h-[600px] cursor-pointer"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={getImageUrl()} 
              alt="Preview da frente"
              className="w-full h-full object-contain md:transition-transform md:duration-300 md:hover:scale-150"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageUrl={getImageUrl()}
        alt="Preview da frente - Zoom"
      />

      <Card className="order-2 md:order-2">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Opções de Personalização</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 md:pb-6">
          <div className="space-y-4">
            <Label className="text-base">Tipo de Logo</Label>
            <p className="text-sm text-muted-foreground">
              Clique na opção desejada para continuar
            </p>
            <div className="space-y-3">
              <Button
                variant={value.logoType === 'small_left' ? 'default' : 'outline'}
                className="w-full h-14 text-base justify-start"
                onClick={() => {
                  onChange({ ...value, logoType: 'small_left' });
                  setTimeout(() => onNext(), 300);
                }}
              >
                Logo pequena no peito esquerdo
              </Button>
              
              <Button
                variant={value.logoType === 'large_center' ? 'default' : 'outline'}
                className="w-full h-14 text-base justify-start"
                onClick={() => {
                  onChange({ ...value, logoType: 'large_center' });
                  setTimeout(() => onNext(), 300);
                }}
              >
                Logo grande no centro
              </Button>
              
              <Button
                variant={value.logoType === 'custom' ? 'default' : 'outline'}
                className="w-full h-14 text-base justify-start"
                onClick={() => {
                  onChange({ ...value, logoType: 'custom' });
                  setTimeout(() => onNext(), 300);
                }}
              >
                Outras personalizações
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

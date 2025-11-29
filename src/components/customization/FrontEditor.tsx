import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState, useRef } from "react";
import { Maximize2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  customDescription?: string;
  customFile?: File | null;
}

interface FrontEditorProps {
  model: ShirtModel;
  value: FrontCustomization;
  onChange: (data: FrontCustomization) => void;
  onNext: () => void;
}

export const FrontEditor = ({ model, value, onChange, onNext }: FrontEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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
              variant={value.logoType === 'none' ? 'default' : 'outline'}
              className={`w-full h-14 text-base justify-start ${
                value.logoType !== 'none' 
                  ? 'border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              onClick={() => {
                onChange({ ...value, logoType: 'none' });
                setTimeout(() => onNext(), 300);
              }}
            >
              🚫 Sem personalização
            </Button>

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
                }}
              >
                Outras personalizações
              </Button>
            </div>
          </div>

          {/* Campos adicionais para "Outras personalizações" */}
          {value.logoType === 'custom' && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customDescription" className="text-base">
                  Descreva a personalização desejada
                </Label>
                <Textarea
                  id="customDescription"
                  placeholder="Descreva detalhadamente como você quer a personalização..."
                  value={value.customDescription || ""}
                  onChange={(e) => onChange({ ...value, customDescription: e.target.value })}
                  className="min-h-[100px] text-base"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Anexar arquivo (opcional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {value.customFile ? value.customFile.name : "Escolher arquivo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onChange({ ...value, customFile: file });
                    }}
                  />
                </div>
                {value.customFile && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo selecionado: {value.customFile.name}
                  </p>
                )}
              </div>

              <Button
                onClick={() => {
                  setTimeout(() => onNext(), 200);
                }}
                size="lg"
                className="w-full h-14 text-lg"
              >
                Confirmar e Continuar
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

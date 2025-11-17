import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShirtModel {
  id: string;
  name: string;
  image_left: string;
  image_right: string;
}

interface SleeveCustomization {
  flag: boolean;
  flagUrl: string;
  logoSmall: boolean;
  logoUrl: string;
  text: boolean;
  textContent: string;
}

interface SleeveEditorProps {
  model: ShirtModel;
  side: 'left' | 'right';
  value: SleeveCustomization;
  onChange: (data: SleeveCustomization) => void;
}

export const SleeveEditor = ({ model, side, value, onChange }: SleeveEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const imageUrl = side === 'left' ? model.image_left : model.image_right;
  const title = side === 'left' ? 'Manga Esquerda' : 'Manga Direita';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <Card className="order-1 md:order-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base md:text-lg">Preview - {title}</CardTitle>
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
            className="relative aspect-square bg-muted rounded-lg overflow-hidden min-h-[300px] md:min-h-auto cursor-pointer flex items-center justify-center"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`Preview ${title}`}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageUrl={imageUrl}
        alt={`Preview ${title} - Zoom`}
      />

      <Card className="order-2 md:order-2">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações - {title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bandeira */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar bandeira?</Label>
            <RadioGroup 
              value={value.flag ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, flag: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-flag-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-flag-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-flag-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-flag-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Logo Pequena */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar logo pequena?</Label>
            <RadioGroup 
              value={value.logoSmall ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, logoSmall: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-logo-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-logo-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-logo-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-logo-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Texto */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar texto?</Label>
            <RadioGroup 
              value={value.text ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, text: val === "sim", textContent: val === "nao" ? "" : value.textContent })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-text-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-text-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-text-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-text-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.text && (
              <div className="ml-6 md:ml-8">
                <Input 
                  placeholder="Digite o texto para a manga"
                  value={value.textContent}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      onChange({ ...value, textContent: e.target.value });
                    }
                  }}
                  className="min-h-[48px] text-base"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {value.textContent.length}/50 caracteres
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
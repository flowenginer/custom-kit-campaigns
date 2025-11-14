import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
            className="relative aspect-square bg-muted rounded-lg overflow-hidden min-h-[300px] md:min-h-auto cursor-pointer"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`Preview ${title}`}
              className="w-full h-full object-cover"
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id={`${side}-flag`}
                checked={value.flag}
                onCheckedChange={(checked) => onChange({ ...value, flag: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor={`${side}-flag`} className="font-normal cursor-pointer text-base flex-1 py-1">
                Bandeira
              </Label>
            </div>

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id={`${side}-logo`}
                checked={value.logoSmall}
                onCheckedChange={(checked) => onChange({ ...value, logoSmall: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor={`${side}-logo`} className="font-normal cursor-pointer text-base flex-1 py-1">
                Logo pequena
              </Label>
            </div>

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id={`${side}-text`}
                checked={value.text}
                onCheckedChange={(checked) => onChange({ ...value, text: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor={`${side}-text`} className="font-normal cursor-pointer text-base flex-1 py-1">
                Texto
              </Label>
            </div>
            
            {value.text && (
              <div className="ml-6 md:ml-8">
                <Input 
                  placeholder="Digite o texto"
                  value={value.textContent}
                  onChange={(e) => onChange({ ...value, textContent: e.target.value })}
                  maxLength={30}
                  className="min-h-[48px] text-base"
                />
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {value.textContent.length}/30 caracteres
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

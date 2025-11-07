import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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
  const imageUrl = side === 'left' ? model.image_left : model.image_right;
  const title = side === 'left' ? 'Manga Esquerda' : 'Manga Direita';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview - {title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={`Preview ${title}`}
              className="w-full h-full object-cover"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalizações - {title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${side}-flag`}
                checked={value.flag}
                onCheckedChange={(checked) => onChange({ ...value, flag: checked as boolean })}
              />
              <Label htmlFor={`${side}-flag`} className="font-normal cursor-pointer">
                Bandeira
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${side}-logo`}
                checked={value.logoSmall}
                onCheckedChange={(checked) => onChange({ ...value, logoSmall: checked as boolean })}
              />
              <Label htmlFor={`${side}-logo`} className="font-normal cursor-pointer">
                Logo pequena
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${side}-text`}
                checked={value.text}
                onCheckedChange={(checked) => onChange({ ...value, text: checked as boolean })}
              />
              <Label htmlFor={`${side}-text`} className="font-normal cursor-pointer">
                Texto
              </Label>
            </div>
            
            {value.text && (
              <div className="ml-6">
                <Input 
                  placeholder="Digite o texto"
                  value={value.textContent}
                  onChange={(e) => onChange({ ...value, textContent: e.target.value })}
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground mt-1">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
}

export const FrontEditor = ({ model, value, onChange }: FrontEditorProps) => {
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
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview - Frente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[500px]">
            <img 
              src={getImageUrl()} 
              alt="Preview da frente"
              className="w-full h-auto object-contain transition-transform duration-300 hover:scale-150 cursor-zoom-in"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opções de Personalização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Logo</Label>
            <RadioGroup 
              value={value.logoType} 
              onValueChange={(val) => onChange({ ...value, logoType: val as FrontCustomization['logoType'] })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small_left" id="small_left" />
                <Label htmlFor="small_left" className="font-normal cursor-pointer">
                  Logo pequena no peito esquerdo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large_center" id="large_center" />
                <Label htmlFor="large_center" className="font-normal cursor-pointer">
                  Logo grande no centro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Outras personalizações
                </Label>
              </div>
            </RadioGroup>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

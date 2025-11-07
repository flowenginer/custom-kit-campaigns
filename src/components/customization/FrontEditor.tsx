import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./ColorPicker";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('customer-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(filePath);

      onChange({ ...value, logoUrl: publicUrl });
      toast.success("Logo enviada com sucesso!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erro ao fazer upload da logo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview - Frente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <img 
              src={getImageUrl()} 
              alt="Preview da frente"
              className="w-full h-full object-cover"
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

          {(value.logoType === 'small_left' || value.logoType === 'large_center' || value.logoType === 'custom') && (
            <div className="space-y-2">
              <Label>Upload da Logo</Label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {value.logoUrl && (
                <div className="mt-2">
                  <img 
                    src={value.logoUrl} 
                    alt="Logo preview" 
                    className="h-20 w-20 object-contain border rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          <ColorPicker
            label="Cor do Texto/Estampa"
            value={value.textColor}
            onChange={(color) => onChange({ ...value, textColor: color })}
          />

          <div className="space-y-2">
            <Label>Texto Personalizado</Label>
            <Textarea
              placeholder="Digite o texto para estampa..."
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

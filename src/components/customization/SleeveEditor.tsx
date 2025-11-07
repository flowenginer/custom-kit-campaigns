import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [uploadingFlag, setUploadingFlag] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'flag' | 'logo') => {
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

    const setUploading = type === 'flag' ? setUploadingFlag : setUploadingLogo;
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${type === 'flag' ? 'flags' : 'logos'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(filePath);

      if (type === 'flag') {
        onChange({ ...value, flagUrl: publicUrl });
      } else {
        onChange({ ...value, logoUrl: publicUrl });
      }
      
      toast.success(`${type === 'flag' ? 'Bandeira' : 'Logo'} enviada com sucesso!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

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
            
            {value.flag && (
              <div className="ml-6 space-y-2">
                <Label>Upload da Bandeira</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'flag')}
                  disabled={uploadingFlag}
                />
                {value.flagUrl && (
                  <img 
                    src={value.flagUrl} 
                    alt="Bandeira preview" 
                    className="h-16 w-24 object-cover border rounded-md"
                  />
                )}
              </div>
            )}

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
            
            {value.logoSmall && (
              <div className="ml-6 space-y-2">
                <Label>Upload da Logo</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                  disabled={uploadingLogo}
                />
                {value.logoUrl && (
                  <img 
                    src={value.logoUrl} 
                    alt="Logo preview" 
                    className="h-16 w-16 object-contain border rounded-md"
                  />
                )}
              </div>
            )}

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

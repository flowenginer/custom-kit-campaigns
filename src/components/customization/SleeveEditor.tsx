import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState, useRef } from "react";
import { Maximize2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShirtModel {
  id: string;
  name: string;
  image_left: string;
  image_right: string;
}

interface SleeveCustomization {
  flag: boolean;
  flagState?: string;
  flagUrl: string;
  logoSmall: boolean;
  logoFile?: File | null;
  logoUrl: string;
  text: boolean;
  textContent: string;
}

const ESTADOS_BRASILEIROS = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

interface SleeveEditorProps {
  model: ShirtModel;
  side: 'left' | 'right';
  value: SleeveCustomization;
  onChange: (data: SleeveCustomization) => void;
  onNext: () => void;
}

export const SleeveEditor = ({ model, side, value, onChange, onNext }: SleeveEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUrl = side === 'left' ? model.image_left : model.image_right;
  const title = side === 'left' ? 'Manga Esquerda' : 'Manga Direita';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pb-4">
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
            className="relative bg-muted rounded-lg overflow-hidden h-[200px] md:min-h-[600px] cursor-pointer flex items-center justify-center"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`Preview ${title}`}
              className="w-full h-full object-contain"
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

      <Card className="order-2 md:order-2 max-h-[calc(100vh-180px)] md:max-h-none overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações - {title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 md:pb-6">
          {/* Bandeira */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar bandeira?</Label>
            <RadioGroup 
              value={value.flag ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, flag: val === "sim", flagState: val === "nao" ? undefined : value.flagState })}
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
            
            {value.flag && (
              <div className="ml-6 md:ml-8 space-y-2">
                <Label htmlFor={`${side}-flag-state`} className="text-sm">
                  Selecione o estado da bandeira
                </Label>
                <Select
                  value={value.flagState || ""}
                  onValueChange={(val) => onChange({ ...value, flagState: val })}
                >
                  <SelectTrigger id={`${side}-flag-state`} className="min-h-[48px]">
                    <SelectValue placeholder="Escolha o estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASILEIROS.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Logo Pequena */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar logo pequena?</Label>
            <RadioGroup 
              value={value.logoSmall ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, logoSmall: val === "sim", logoFile: val === "nao" ? null : value.logoFile })}
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
            
            {value.logoSmall && (
              <div className="ml-6 md:ml-8 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {value.logoFile ? value.logoFile.name : "Carregar logo"}
                </Button>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onChange({ ...value, logoFile: file });
                  }}
                />
                {value.logoFile && (
                  <p className="text-xs text-muted-foreground">
                    Logo selecionada: {value.logoFile.name}
                  </p>
                )}
              </div>
            )}
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
          
          {/* Botão para confirmar e continuar */}
          <div className="pt-6 pb-2 border-t sticky bottom-0 md:static">
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
        </CardContent>
      </Card>
    </div>
  );
};
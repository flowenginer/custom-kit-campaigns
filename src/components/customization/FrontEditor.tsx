import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState, useRef } from "react";
import { Maximize2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface ShirtModel {
  id: string;
  name: string;
  image_front: string;
  image_front_small_logo?: string | null;
  image_front_large_logo?: string | null;
  image_front_clean?: string | null;
}

interface FrontCustomization {
  logoType: 'none' | 'selected';
  hasSmallLogo: boolean;
  hasLargeLogo: boolean;
  hasCustom: boolean;
  textColor: string;
  text: string;
  logoUrl: string;
  customDescription?: string;
  customFile?: File | null;
  smallLogoObservation?: string;
  smallLogoFile?: File | null;
  largeLogoObservation?: string;
  largeLogoFile?: File | null;
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
  const smallLogoInputRef = useRef<HTMLInputElement | null>(null);
  const largeLogoInputRef = useRef<HTMLInputElement | null>(null);
  
  const getImageUrl = () => {
    // Prioriza small logo, depois large logo, depois custom, senão padrão
    if (value.hasSmallLogo && model.image_front_small_logo) {
      return model.image_front_small_logo;
    }
    if (value.hasLargeLogo && model.image_front_large_logo) {
      return model.image_front_large_logo;
    }
    if (value.hasCustom && model.image_front_clean) {
      return model.image_front_clean;
    }
    return model.image_front;
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
              Escolha as opções desejadas
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
                onChange({ 
                  ...value, 
                  logoType: 'none',
                  hasSmallLogo: false,
                  hasLargeLogo: false,
                  hasCustom: false
                });
                setTimeout(() => onNext(), 300);
              }}
            >
              🚫 Sem personalização
            </Button>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  id="small_logo"
                  checked={value.hasSmallLogo}
                  onCheckedChange={(checked) => onChange({ 
                    ...value, 
                    hasSmallLogo: !!checked,
                    logoType: checked ? 'selected' : (value.hasLargeLogo || value.hasCustom) ? 'selected' : 'none'
                  })}
                />
                <Label htmlFor="small_logo" className="text-base cursor-pointer flex-1">
                  Logo pequena no peito esquerdo
                </Label>
              </div>
              
              {value.hasSmallLogo && (
                <div className="ml-8 space-y-3 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="space-y-2">
                    <Label className="text-base text-blue-700 dark:text-blue-300">Observação (opcional)</Label>
                    <Textarea
                      placeholder="Descreva detalhes sobre a logo pequena no peito..."
                      value={value.smallLogoObservation || ""}
                      onChange={(e) => onChange({ ...value, smallLogoObservation: e.target.value })}
                      className="min-h-[80px] text-base border-blue-300 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base text-blue-700 dark:text-blue-300">📤 Upload da Logo</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => smallLogoInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {value.smallLogoFile ? value.smallLogoFile.name : "Escolher arquivo"}
                    </Button>
                    <input
                      ref={smallLogoInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onChange({ ...value, smallLogoFile: file });
                      }}
                    />
                    {value.smallLogoFile && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Arquivo selecionado: {value.smallLogoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
              
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  id="large_logo"
                  checked={value.hasLargeLogo}
                  onCheckedChange={(checked) => onChange({ 
                    ...value, 
                    hasLargeLogo: !!checked,
                    logoType: checked ? 'selected' : (value.hasSmallLogo || value.hasCustom) ? 'selected' : 'none'
                  })}
                />
                <Label htmlFor="large_logo" className="text-base cursor-pointer flex-1">
                  Logo grande no centro
                </Label>
              </div>
              
              {value.hasLargeLogo && (
                <div className="ml-8 space-y-3 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="space-y-2">
                    <Label className="text-base text-blue-700 dark:text-blue-300">Observação (opcional)</Label>
                    <Textarea
                      placeholder="Descreva detalhes sobre a logo grande no centro..."
                      value={value.largeLogoObservation || ""}
                      onChange={(e) => onChange({ ...value, largeLogoObservation: e.target.value })}
                      className="min-h-[80px] text-base border-blue-300 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base text-blue-700 dark:text-blue-300">📤 Upload da Logo</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => largeLogoInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {value.largeLogoFile ? value.largeLogoFile.name : "Escolher arquivo"}
                    </Button>
                    <input
                      ref={largeLogoInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onChange({ ...value, largeLogoFile: file });
                      }}
                    />
                    {value.largeLogoFile && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Arquivo selecionado: {value.largeLogoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
              
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
              <Checkbox
                id="custom_logo"
                checked={value.hasCustom}
                onCheckedChange={(checked) => onChange({ 
                  ...value, 
                  hasCustom: !!checked,
                  logoType: checked ? 'selected' : (value.hasSmallLogo || value.hasLargeLogo) ? 'selected' : 'none'
                })}
              />
              <Label htmlFor="custom_logo" className="text-base cursor-pointer flex-1">
                Outras personalizações
              </Label>
            </div>
            </div>
          </div>

          {/* Campos adicionais para "Outras personalizações" */}
          {value.hasCustom && (
            <div className="space-y-4 pt-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="space-y-2">
                <Label htmlFor="customDescription" className="text-base text-blue-700 dark:text-blue-300">
                  Descreva a personalização desejada
                </Label>
                <Textarea
                  id="customDescription"
                  placeholder="Descreva detalhadamente como você quer a personalização..."
                  value={value.customDescription || ""}
                  onChange={(e) => onChange({ ...value, customDescription: e.target.value })}
                  className="min-h-[100px] text-base border-blue-300 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-blue-700 dark:text-blue-300">📤 Anexar arquivo (opcional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
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
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Arquivo selecionado: {value.customFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botão Confirmar e Continuar */}
          {(value.hasSmallLogo || value.hasLargeLogo || value.hasCustom) && (
            <Button
              onClick={() => onNext()}
              size="lg"
              className="w-full h-14 text-lg"
            >
              Confirmar e Continuar
            </Button>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

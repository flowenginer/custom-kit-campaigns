import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SponsorsList, Sponsor } from "./SponsorsList";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState, useRef } from "react";
import { Maximize2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  image_back: string;
}

interface BackCustomization {
  logoLarge: boolean;
  logoUrl: string;
  logoNeck: boolean;
  name: boolean;
  nameText: string;
  whatsapp: boolean;
  whatsappText: string;
  instagram: boolean;
  instagramText: string;
  email: boolean;
  emailText: string;
  website: boolean;
  websiteText: string;
  hasSponsors?: boolean;
  sponsorsLocation?: string;
  sponsors: Sponsor[];
  sponsorsLogosUrls?: string[];
  noCustomization: boolean;
  hasCustomDescription: boolean;
  customDescription?: string;
  customFile?: File | null;
  logoLargeObservation?: string;
  logoLargeFile?: File | null;
  logoNeckObservation?: string;
  logoNeckFile?: File | null;
}

interface BackEditorProps {
  model: ShirtModel;
  value: BackCustomization;
  onChange: (data: BackCustomization) => void;
  onNext: () => void;
}

export const BackEditor = ({ model, value, onChange, onNext }: BackEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoLargeInputRef = useRef<HTMLInputElement | null>(null);
  const logoNeckInputRef = useRef<HTMLInputElement | null>(null);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pb-4">
      <Card className="order-1 md:order-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base md:text-lg">Preview - Costas</CardTitle>
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
              src={model.image_back} 
              alt="Preview das costas"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageUrl={model.image_back}
        alt="Preview das costas - Zoom"
      />

      <Card className="order-2 md:order-2 max-h-[calc(100vh-180px)] md:max-h-none overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações das Costas</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 md:pb-6">
          {/* Sem personalização - movido para o topo */}
          <div className="space-y-3 pb-4 border-b">
            <Button
              variant={value.noCustomization ? "default" : "outline"}
              onClick={() => {
                // Se marcar "sem personalização", desmarca todas as outras opções
                onChange({ 
                  ...value, 
                  noCustomization: !value.noCustomization,
                  ...(!value.noCustomization ? {
                    logoLarge: false,
                    logoNeck: false,
                    name: false,
                    whatsapp: false,
                    instagram: false,
                    email: false,
                    website: false,
                    hasCustomDescription: false,
                    hasSponsors: false,
                  } : {})
                });
              }}
              className={`w-full h-12 text-base justify-start gap-2 ${
                value.noCustomization 
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                  : "border-red-200 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <span className="text-lg">🚫</span>
              <span className="font-semibold">Sem personalização</span>
            </Button>
          </div>

          {/* Logo Grande */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="logoLarge"
                checked={value.logoLarge}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, logoLarge: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="logoLarge" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Logo grande no centro
              </Label>
            </div>
            
            {value.logoLarge && (
              <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <Label className="text-base">Observação (opcional)</Label>
                  <Textarea
                    placeholder="Descreva detalhes sobre a logo grande nas costas..."
                    value={value.logoLargeObservation || ""}
                    onChange={(e) => onChange({ ...value, logoLargeObservation: e.target.value })}
                    className="min-h-[80px] text-base"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Upload da Logo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => logoLargeInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {value.logoLargeFile ? value.logoLargeFile.name : "Escolher arquivo"}
                  </Button>
                  <input
                    ref={logoLargeInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onChange({ ...value, logoLargeFile: file });
                    }}
                  />
                  {value.logoLargeFile && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo selecionado: {value.logoLargeFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logo na Nuca */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="logoNeck"
                checked={value.logoNeck}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, logoNeck: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="logoNeck" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Logo pequena na nuca
              </Label>
            </div>
            
            {value.logoNeck && (
              <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <Label className="text-base">Observação (opcional)</Label>
                  <Textarea
                    placeholder="Descreva detalhes sobre a logo na nuca..."
                    value={value.logoNeckObservation || ""}
                    onChange={(e) => onChange({ ...value, logoNeckObservation: e.target.value })}
                    className="min-h-[80px] text-base"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Upload da Logo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => logoNeckInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {value.logoNeckFile ? value.logoNeckFile.name : "Escolher arquivo"}
                  </Button>
                  <input
                    ref={logoNeckInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onChange({ ...value, logoNeckFile: file });
                    }}
                  />
                  {value.logoNeckFile && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo selecionado: {value.logoNeckFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="name"
                checked={value.name}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, name: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="name" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Nome
              </Label>
            </div>
            {value.name && (
              <div className="ml-8">
                <Input 
                  placeholder="Digite o nome"
                  value={value.nameText}
                  onChange={(e) => onChange({ ...value, nameText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="whatsapp"
                checked={value.whatsapp}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, whatsapp: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="whatsapp" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                WhatsApp
              </Label>
            </div>
            {value.whatsapp && (
              <div className="ml-8">
                <Input 
                  placeholder="+55 (00) 00000-0000"
                  value={value.whatsappText}
                  onChange={(e) => onChange({ ...value, whatsappText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* Instagram */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="instagram"
                checked={value.instagram}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, instagram: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="instagram" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Instagram
              </Label>
            </div>
            {value.instagram && (
              <div className="ml-8">
                <Input 
                  placeholder="@usuario"
                  value={value.instagramText}
                  onChange={(e) => onChange({ ...value, instagramText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="email"
                checked={value.email}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, email: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="email" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Email
              </Label>
            </div>
            {value.email && (
              <div className="ml-8">
                <Input 
                  type="email"
                  placeholder="email@exemplo.com"
                  value={value.emailText}
                  onChange={(e) => onChange({ ...value, emailText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* Website */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="website"
                checked={value.website}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, website: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="website" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Site
              </Label>
            </div>
            {value.website && (
              <div className="ml-8">
                <Input 
                  placeholder="www.site.com"
                  value={value.websiteText}
                  onChange={(e) => onChange({ ...value, websiteText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* Outras personalizações */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="hasCustomDescription"
                checked={value.hasCustomDescription}
                disabled={value.noCustomization}
                onCheckedChange={(checked) => 
                  onChange({ ...value, hasCustomDescription: checked as boolean })
                }
                className="h-5 w-5"
              />
              <Label 
                htmlFor="hasCustomDescription" 
                className="flex-1 py-1 cursor-pointer text-base"
              >
                Outras personalizações
              </Label>
            </div>
            {value.hasCustomDescription && (
              <div className="ml-8 space-y-3 p-4 bg-muted/50 rounded-lg border">
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
              </div>
            )}
          </div>

          {/* Patrocinadores - mantém RadioGroup */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Quer adicionar patrocinadores?</Label>
            <RadioGroup 
              value={value.hasSponsors ? "sim" : "nao"}
              onValueChange={(val) => onChange({ 
                ...value, 
                hasSponsors: val === "sim",
                sponsors: val === "nao" ? [] : value.sponsors,
                sponsorsLocation: val === "nao" ? undefined : value.sponsorsLocation
              })}
              className="flex gap-4"
              disabled={value.noCustomization}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="sponsors-sim" className="h-5 w-5" />
                <Label htmlFor="sponsors-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="sponsors-nao" className="h-5 w-5" />
                <Label htmlFor="sponsors-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>

            {value.hasSponsors && (
              <div className="space-y-4 ml-6 md:ml-8 mt-4">
                <div className="space-y-3">
                  <Label className="text-base">Em qual local do modelo?</Label>
                  <Select
                    value={value.sponsorsLocation || ""}
                    onValueChange={(val) => onChange({ ...value, sponsorsLocation: val })}
                  >
                    <SelectTrigger className="min-h-[48px]">
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="costas_superior">Costas - Parte Superior</SelectItem>
                      <SelectItem value="costas_inferior">Costas - Parte Inferior</SelectItem>
                      <SelectItem value="costas_lateral">Costas - Lateral</SelectItem>
                      <SelectItem value="mangas">Mangas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <SponsorsList
                  sponsors={value.sponsors}
                  onChange={(sponsors) => onChange({ ...value, sponsors })}
                />
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SponsorsList, Sponsor } from "./SponsorsList";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
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
  image_back: string;
}

interface BackCustomization {
  logoLarge: boolean;
  logoUrl: string;
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
}

interface BackEditorProps {
  model: ShirtModel;
  value: BackCustomization;
  onChange: (data: BackCustomization) => void;
  onNext: () => void;
}

export const BackEditor = ({ model, value, onChange, onNext }: BackEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
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
          {/* Logo Grande */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="logoLarge"
                checked={value.logoLarge}
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
          </div>

          {/* Nome */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="name"
                checked={value.name}
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
          <div className="pt-6 pb-2 border-t sticky bottom-0 bg-background md:static">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { SponsorsList } from "./SponsorsList";
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
  sponsors: string[];
  sponsorsLogosUrls?: string[];
}

interface BackEditorProps {
  model: ShirtModel;
  value: BackCustomization;
  onChange: (data: BackCustomization) => void;
}

export const BackEditor = ({ model, value, onChange }: BackEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
            className="relative aspect-square bg-muted rounded-lg overflow-hidden min-h-[300px] md:min-h-auto cursor-pointer"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={model.image_back} 
              alt="Preview das costas"
              className="w-full h-full object-cover"
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

      <Card className="order-2 md:order-2">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações das Costas</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Grande */}
          <div className="space-y-3">
            <Label className="text-base">Quer logo grande no centro?</Label>
            <RadioGroup 
              value={value.logoLarge ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, logoLarge: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="logo-sim" className="h-5 w-5" />
                <Label htmlFor="logo-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="logo-nao" className="h-5 w-5" />
                <Label htmlFor="logo-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Nome */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar nome?</Label>
            <RadioGroup 
              value={value.name ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, name: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="name-sim" className="h-5 w-5" />
                <Label htmlFor="name-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="name-nao" className="h-5 w-5" />
                <Label htmlFor="name-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.name && (
              <div className="ml-6 md:ml-8">
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
            <Label className="text-base">Quer adicionar WhatsApp?</Label>
            <RadioGroup 
              value={value.whatsapp ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, whatsapp: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="whatsapp-sim" className="h-5 w-5" />
                <Label htmlFor="whatsapp-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="whatsapp-nao" className="h-5 w-5" />
                <Label htmlFor="whatsapp-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.whatsapp && (
              <div className="ml-6 md:ml-8">
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
            <Label className="text-base">Quer adicionar Instagram?</Label>
            <RadioGroup 
              value={value.instagram ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, instagram: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="instagram-sim" className="h-5 w-5" />
                <Label htmlFor="instagram-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="instagram-nao" className="h-5 w-5" />
                <Label htmlFor="instagram-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.instagram && (
              <div className="ml-6 md:ml-8">
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
            <Label className="text-base">Quer adicionar Email?</Label>
            <RadioGroup 
              value={value.email ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, email: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="email-sim" className="h-5 w-5" />
                <Label htmlFor="email-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="email-nao" className="h-5 w-5" />
                <Label htmlFor="email-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.email && (
              <div className="ml-6 md:ml-8">
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
            <Label className="text-base">Quer adicionar Site?</Label>
            <RadioGroup 
              value={value.website ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, website: val === "sim" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="website-sim" className="h-5 w-5" />
                <Label htmlFor="website-sim" className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="website-nao" className="h-5 w-5" />
                <Label htmlFor="website-nao" className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.website && (
              <div className="ml-6 md:ml-8">
                <Input 
                  placeholder="www.site.com"
                  value={value.websiteText}
                  onChange={(e) => onChange({ ...value, websiteText: e.target.value })}
                  className="min-h-[48px] text-base"
                />
              </div>
            )}
          </div>

          {/* Patrocinadores */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base">Quer adicionar patrocinadores?</Label>
            <RadioGroup 
              value={value.hasSponsors ? "sim" : "nao"}
              onValueChange={(val) => onChange({ 
                ...value, 
                hasSponsors: val === "sim",
                sponsors: val === "nao" ? [] : value.sponsors 
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
        </CardContent>
      </Card>
    </div>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SponsorsList } from "./SponsorsList";

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
  sponsors: string[];
  sponsorsLogosUrls?: string[];
}

interface BackEditorProps {
  model: ShirtModel;
  value: BackCustomization;
  onChange: (data: BackCustomization) => void;
}

export const BackEditor = ({ model, value, onChange }: BackEditorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <Card className="order-1 md:order-1">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Preview - Costas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden min-h-[300px] md:min-h-auto">
            <img 
              src={model.image_back} 
              alt="Preview das costas"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="order-2 md:order-2">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações das Costas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="logoLarge" 
                checked={value.logoLarge}
                onCheckedChange={(checked) => onChange({ ...value, logoLarge: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="logoLarge" className="font-normal cursor-pointer text-base flex-1 py-1">
                Logo grande no centro
              </Label>
            </div>

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="name" 
                checked={value.name}
                onCheckedChange={(checked) => onChange({ ...value, name: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="name" className="font-normal cursor-pointer text-base flex-1 py-1">
                Nome
              </Label>
            </div>
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

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="whatsapp" 
                checked={value.whatsapp}
                onCheckedChange={(checked) => onChange({ ...value, whatsapp: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="whatsapp" className="font-normal cursor-pointer text-base flex-1 py-1">
                WhatsApp
              </Label>
            </div>
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

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="instagram" 
                checked={value.instagram}
                onCheckedChange={(checked) => onChange({ ...value, instagram: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="instagram" className="font-normal cursor-pointer text-base flex-1 py-1">
                Instagram
              </Label>
            </div>
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

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="email" 
                checked={value.email}
                onCheckedChange={(checked) => onChange({ ...value, email: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="email" className="font-normal cursor-pointer text-base flex-1 py-1">
                Email
              </Label>
            </div>
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

            <div className="flex items-center space-x-3 py-2">
              <Checkbox 
                id="website" 
                checked={value.website}
                onCheckedChange={(checked) => onChange({ ...value, website: checked as boolean })}
                className="h-5 w-5"
              />
              <Label htmlFor="website" className="font-normal cursor-pointer text-base flex-1 py-1">
                Site
              </Label>
            </div>
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

          <SponsorsList
            sponsors={value.sponsors}
            onChange={(sponsors) => onChange({ ...value, sponsors })}
          />
        </CardContent>
      </Card>
    </div>
  );
};

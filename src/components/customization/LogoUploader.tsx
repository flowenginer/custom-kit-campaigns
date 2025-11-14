import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

interface CustomizationData {
  front: {
    logoType: 'none' | 'small_left' | 'large_center' | 'custom';
  };
  back: {
    logoLarge: boolean;
    hasSponsors?: boolean;
    sponsors: string[];
  };
  sleeves: {
    right: { flag: boolean; logoSmall: boolean };
    left: { flag: boolean; logoSmall: boolean };
  };
}

interface UploadedLogos {
  frontLogo: File | null;
  backLogo: File | null;
  sponsorsLogos: File[];
  rightFlag: File | null;
  rightLogo: File | null;
  leftFlag: File | null;
  leftLogo: File | null;
}

interface LogoUploaderProps {
  customizations: CustomizationData;
  uploadChoice: 'agora' | 'depois' | null;
  onUploadChoiceChange: (choice: 'agora' | 'depois') => void;
  onLogosUpload: (logos: UploadedLogos) => void;
  currentLogos: UploadedLogos;
}

export const LogoUploader = ({
  customizations,
  uploadChoice,
  onUploadChoiceChange,
  onLogosUpload,
  currentLogos,
}: LogoUploaderProps) => {
  const [sponsorUploadChoice, setSponsorUploadChoice] = useState(false);

  const needsFrontLogo = customizations.front.logoType !== 'none';
  const needsBackLogo = customizations.back.logoLarge;
  const hasSponsors = customizations.back.hasSponsors && customizations.back.sponsors.length > 0;
  const needsRightFlag = customizations.sleeves.right.flag;
  const needsRightLogo = customizations.sleeves.right.logoSmall;
  const needsLeftFlag = customizations.sleeves.left.flag;
  const needsLeftLogo = customizations.sleeves.left.logoSmall;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof UploadedLogos
  ) => {
    const file = e.target.files?.[0] || null;
    onLogosUpload({
      ...currentLogos,
      [field]: file,
    });
  };

  const handleSponsorFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSponsorsLogos = [...currentLogos.sponsorsLogos];
      newSponsorsLogos[index] = file;
      onLogosUpload({
        ...currentLogos,
        sponsorsLogos: newSponsorsLogos,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Upload de Logos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pergunta inicial */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">
            Você prefere enviar suas logos agora ou depois?
          </Label>
          <RadioGroup
            value={uploadChoice || ""}
            onValueChange={(val) => onUploadChoiceChange(val as 'agora' | 'depois')}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="agora" id="upload-agora" className="h-5 w-5" />
              <Label htmlFor="upload-agora" className="font-normal cursor-pointer text-base">
                Agora
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="depois" id="upload-depois" className="h-5 w-5" />
              <Label htmlFor="upload-depois" className="font-normal cursor-pointer text-base">
                Depois
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Se escolheu AGORA */}
        {uploadChoice === 'agora' && (
          <div className="space-y-6 border-t pt-6">
            <p className="text-sm text-muted-foreground">
              Clique abaixo para adicionar suas logos
            </p>

            {/* Upload da logo da frente */}
            {needsFrontLogo && (
              <div className="space-y-2">
                <Label className="text-base">
                  Logo da Frente *
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'frontLogo')}
                  className="min-h-[48px]"
                />
                {currentLogos.frontLogo && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.frontLogo.name}
                  </p>
                )}
              </div>
            )}

            {/* Upload de logo das costas */}
            {needsBackLogo && (
              <div className="space-y-2">
                <Label className="text-base">Logo Grande das Costas *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'backLogo')}
                  className="min-h-[48px]"
                />
                {currentLogos.backLogo && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.backLogo.name}
                  </p>
                )}
              </div>
            )}

            {/* Bandeira manga direita */}
            {needsRightFlag && (
              <div className="space-y-2">
                <Label className="text-base">Bandeira - Manga Direita</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'rightFlag')}
                  className="min-h-[48px]"
                />
                {currentLogos.rightFlag && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.rightFlag.name}
                  </p>
                )}
              </div>
            )}

            {/* Logo manga direita */}
            {needsRightLogo && (
              <div className="space-y-2">
                <Label className="text-base">Logo Pequena - Manga Direita</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'rightLogo')}
                  className="min-h-[48px]"
                />
                {currentLogos.rightLogo && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.rightLogo.name}
                  </p>
                )}
              </div>
            )}

            {/* Bandeira manga esquerda */}
            {needsLeftFlag && (
              <div className="space-y-2">
                <Label className="text-base">Bandeira - Manga Esquerda</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'leftFlag')}
                  className="min-h-[48px]"
                />
                {currentLogos.leftFlag && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.leftFlag.name}
                  </p>
                )}
              </div>
            )}

            {/* Logo manga esquerda */}
            {needsLeftLogo && (
              <div className="space-y-2">
                <Label className="text-base">Logo Pequena - Manga Esquerda</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'leftLogo')}
                  className="min-h-[48px]"
                />
                {currentLogos.leftLogo && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {currentLogos.leftLogo.name}
                  </p>
                )}
              </div>
            )}

            {/* Pergunta sobre patrocinadores */}
            {hasSponsors && (
              <>
                <div className="space-y-3 border-t pt-6">
                  <Label className="text-lg font-semibold">
                    Quer enviar as logos dos patrocinadores agora?
                  </Label>
                  <RadioGroup
                    value={sponsorUploadChoice ? "sim" : "nao"}
                    onValueChange={(val) => setSponsorUploadChoice(val === "sim")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="sim" id="sponsor-sim" className="h-5 w-5" />
                      <Label htmlFor="sponsor-sim" className="font-normal cursor-pointer text-base">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="nao" id="sponsor-nao" className="h-5 w-5" />
                      <Label htmlFor="sponsor-nao" className="font-normal cursor-pointer text-base">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Se SIM, mostrar uploads dos patrocinadores */}
                {sponsorUploadChoice && (
                  <div className="space-y-4 ml-6 md:ml-8">
                    {customizations.back.sponsors.map((sponsor, idx) => (
                      <div key={idx} className="space-y-2">
                        <Label className="text-base">{sponsor}</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSponsorFileUpload(e, idx)}
                          className="min-h-[48px]"
                        />
                        {currentLogos.sponsorsLogos[idx] && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {currentLogos.sponsorsLogos[idx].name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Se escolheu DEPOIS */}
        {uploadChoice === 'depois' && (
          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Você poderá enviar as logos depois por email ou WhatsApp
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
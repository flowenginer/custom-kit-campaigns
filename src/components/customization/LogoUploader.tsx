import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Check } from "lucide-react";
import { useRef } from "react";

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
  onNext: () => void;
}

export const LogoUploader = ({
  customizations,
  uploadChoice,
  onUploadChoiceChange,
  onLogosUpload,
  currentLogos,
  onNext,
}: LogoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const needsFrontLogo = customizations.front.logoType !== 'none';
  const needsBackLogo = customizations.back.logoLarge;
  const hasSponsors = customizations.back.hasSponsors && customizations.back.sponsors.length > 0;
  const needsRightFlag = customizations.sleeves.right.flag;
  const needsRightLogo = customizations.sleeves.right.logoSmall;
  const needsLeftFlag = customizations.sleeves.left.flag;
  const needsLeftLogo = customizations.sleeves.left.logoSmall;

  const needsAnyLogo = needsFrontLogo || needsBackLogo || hasSponsors || 
                       needsRightFlag || needsRightLogo || needsLeftFlag || needsLeftLogo;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    console.log('Arquivo selecionado:', file?.name);
    
    if (!file) return;

    // Atualiza o estado com a logo selecionada
    onLogosUpload({
      ...currentLogos,
      frontLogo: file,
    });
  };

  // Se não precisa de logos, mostrar mensagem
  if (!needsAnyLogo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-lg text-muted-foreground mb-6">
            Você não precisa enviar logos para este pedido.
          </p>
          <p className="text-sm text-muted-foreground">
            Clique em "Próximo" para continuar para a revisão do pedido.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">
          Adicionar Logo
        </h2>
        
        <p className="text-center text-muted-foreground">
          Escolha uma das opções abaixo:
        </p>

        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {/* Botão Adicionar Logo */}
          <Button
            size="lg"
            className="h-16 text-lg"
            onClick={() => {
              console.log('Botão "Adicionar Logo" clicado');
              onUploadChoiceChange('agora');
              // Abrir a galeria do celular
              fileInputRef.current?.click();
            }}
          >
            <Upload className="mr-2 h-5 w-5" />
            Adicionar Logo
          </Button>

          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Botão Não Tenho Logo */}
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg"
            onClick={() => {
              console.log('Botão "Não Tenho Logo" clicado');
              onUploadChoiceChange('depois');
            }}
          >
            <X className="mr-2 h-5 w-5" />
            Não Tenho Logo
          </Button>
        </div>

        {/* Feedback visual da logo selecionada */}
        {uploadChoice === 'agora' && (
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            {currentLogos.frontLogo ? (
              <div className="flex items-center justify-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">
                  Logo selecionada: {currentLogos.frontLogo.name}
                </p>
              </div>
            ) : (
              <p className="text-sm text-center">
                Toque em "Adicionar Logo" para escolher uma imagem da sua galeria.
              </p>
            )}
          </div>
        )}

        {uploadChoice === 'depois' && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-center text-muted-foreground">
              Você poderá enviar as logos depois por email ou WhatsApp.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

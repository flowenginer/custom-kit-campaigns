import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LogoSection {
  id: string;
  title: string;
  required: boolean;
  file: File | null;
  uploaded: boolean;
  fieldPath: string; // Caminho no customization_data (ex: "front.logoUrl")
  useSameAsFront?: boolean; // 🆕 Para copiar logo da frente
}

interface LogoSectionUploaderProps {
  customizationData: any;
  onAllLogosReady: (sections: LogoSection[]) => void;
  onLogoChange: (sections: LogoSection[]) => void;
  currentSections?: LogoSection[];
}

export const LogoSectionUploader = ({
  customizationData,
  onAllLogosReady,
  onLogoChange,
  currentSections,
}: LogoSectionUploaderProps) => {
  
  // Analisar customization_data e identificar quais logos são necessárias
  const identifyRequiredLogos = (): LogoSection[] => {
    const sections: LogoSection[] = [];

    // FRENTE
    if (customizationData?.front?.logoType && 
        customizationData.front.logoType !== 'none' && 
        customizationData.front.logoType !== 'text_only') {
      sections.push({
        id: 'front',
        title: `Frente (${getLabelForLogoType(customizationData.front.logoType)})`,
        required: true,
        file: null,
        uploaded: false,
        fieldPath: 'front.logoUrl'
      });
    }

    // COSTAS - ✨ Agora opcional
    if (customizationData?.back?.logoLarge === true) {
      sections.push({
        id: 'back',
        title: 'Costas (Logo Grande)',
        required: false, // ✨ Mudado para opcional
        file: null,
        uploaded: false,
        fieldPath: 'back.logoUrl',
        useSameAsFront: false
      });
    }

    // MANGA ESQUERDA
    if (customizationData?.sleeves?.left?.logoSmall === true) {
      sections.push({
        id: 'sleeve-left',
        title: 'Manga Esquerda (Logo Pequeno)',
        required: true,
        file: null,
        uploaded: false,
        fieldPath: 'sleeves.left.logoUrl'
      });
    }

    // MANGA DIREITA
    if (customizationData?.sleeves?.right?.logoSmall === true) {
      sections.push({
        id: 'sleeve-right',
        title: 'Manga Direita (Logo Pequeno)',
        required: true,
        file: null,
        uploaded: false,
        fieldPath: 'sleeves.right.logoUrl'
      });
    }

    return sections;
  };

  const getLabelForLogoType = (logoType: string): string => {
    const labels: Record<string, string> = {
      'small_left': 'Logo Pequeno Esquerda',
      'large_center': 'Logo Grande Centro',
      'custom': 'Personalizado'
    };
    return labels[logoType] || logoType;
  };

  const [sections, setSections] = useState<LogoSection[]>(
    currentSections && currentSections.length > 0 
      ? currentSections 
      : identifyRequiredLogos()
  );

  const handleFileChange = (sectionId: string, file: File | null) => {
    if (!file) return;

    // Validação
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf'];
    
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PNG, JPG, SVG ou PDF");
      return;
    }

    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, file, uploaded: false }
        : section
    );

    setSections(updatedSections);
    onLogoChange(updatedSections);
    toast.success(`Logo selecionado para ${sections.find(s => s.id === sectionId)?.title}`);
  };

  const removeFile = (sectionId: string) => {
    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, file: null, uploaded: false }
        : section
    );

    setSections(updatedSections);
    onLogoChange(updatedSections);
    toast.info("Logo removido");
  };

  // 🆕 Função para usar a mesma logo da frente
  const handleUseSameAsFront = (sectionId: string, checked: boolean) => {
    if (checked) {
      // Encontrar a logo da frente
      const frontSection = sections.find(s => s.id === 'front');
      
      if (!frontSection?.file) {
        toast.error("Primeiro selecione a logo da frente");
        return;
      }
      
      // Copiar para a seção de costas
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { 
              ...section, 
              file: frontSection.file,
              useSameAsFront: true 
            }
          : section
      );
      
      setSections(updatedSections);
      onLogoChange(updatedSections);
      toast.success("Logo da frente copiada para as costas");
    } else {
      // Limpar a logo copiada
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { 
              ...section, 
              file: null,
              useSameAsFront: false 
            }
          : section
      );
      
      setSections(updatedSections);
      onLogoChange(updatedSections);
    }
  };

  const allRequiredFilled = sections
    .filter(s => s.required)
    .every(s => s.file !== null);

  const uploadProgress = sections.filter(s => s.file).length / sections.length * 100;

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Nenhuma logo necessária</p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta personalização não requer upload de logos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Logos Necessárias</h3>
          <span className="text-sm text-muted-foreground">
            {sections.filter(s => s.file).length} de {sections.length} selecionadas
          </span>
        </div>
        <Progress value={uploadProgress} className="h-2" />
      </div>

      {/* Lista de seções */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className={section.required ? "border-2" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{section.title}</Label>
                  {section.required && (
                    <span className="text-xs text-destructive">*obrigatório</span>
                  )}
                  {!section.required && (
                    <span className="text-xs text-muted-foreground">opcional</span>
                  )}
                </div>
                {section.file && (
                  <Check className="h-5 w-5 text-green-600" />
                )}
              </div>

              {/* 🆕 Checkbox para usar mesma logo da frente (apenas para costas) */}
              {section.id === 'back' && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <Checkbox 
                    id={`same-front-${section.id}`}
                    checked={section.useSameAsFront || false}
                    onCheckedChange={(checked) => 
                      handleUseSameAsFront(section.id, checked as boolean)
                    }
                    disabled={!sections.find(s => s.id === 'front')?.file}
                  />
                  <Label 
                    htmlFor={`same-front-${section.id}`}
                    className="text-sm cursor-pointer text-blue-900"
                  >
                    Usar mesma logo da frente
                  </Label>
                </div>
              )}

              {section.file ? (
                // Arquivo selecionado
                <div className="flex items-center gap-2 p-3 bg-accent rounded-md">
                  <span className="text-sm font-medium flex-1 truncate">
                    {section.file.name}
                  </span>
                  {section.useSameAsFront && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      copiada da frente
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFile(section.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // Campo de upload - ✨ Ocultado se checkbox marcada
                !section.useSameAsFront && (
                  <div className="border-2 border-dashed rounded-md p-4 text-center hover:border-primary/50 transition-colors">
                    <Input 
                      id={`upload-${section.id}`}
                      type="file" 
                      accept=".png,.jpg,.jpeg,.svg,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(section.id, file);
                      }}
                      className="cursor-pointer"
                    />
                    <Label 
                      htmlFor={`upload-${section.id}`} 
                      className="text-xs text-muted-foreground mt-1 cursor-pointer block"
                    >
                      PNG, JPG, SVG ou PDF • Máximo 10MB
                    </Label>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aviso se faltam logos obrigatórias */}
      {!allRequiredFilled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">Logos obrigatórias pendentes</p>
              <p className="text-amber-700 mt-1">
                Selecione todas as logos marcadas com * para poder enviar para o designer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

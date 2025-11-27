import { VisualOverrides } from "@/hooks/useCampaignVisualOverrides";
import { EditableElement } from "./EditableElement";
import { TextEditPopover, ColorEditPopover, ImageEditPopover } from "./EditPopover";
import { Card } from "@/components/ui/card";

interface CampaignPreviewInteractiveProps {
  stepId: string;
  overrides: VisualOverrides;
  onChange: (overrides: VisualOverrides) => void;
  campaign: any;
}

export const CampaignPreviewInteractive = ({
  stepId,
  overrides,
  onChange,
  campaign,
}: CampaignPreviewInteractiveProps) => {
  
  const updateOverride = (path: string[], value: any) => {
    const newOverrides = { ...overrides };
    let current: any = newOverrides;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    onChange(newOverrides);
  };

  // Global settings
  if (stepId === "global") {
    return (
      <div className="space-y-6 p-8 bg-background rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Configurações Globais</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Logo</p>
            <ImageEditPopover
              value={overrides.logo?.url || ""}
              onChange={(value) => updateOverride(['logo', 'url'], value)}
              label="Logo da Campanha"
            >
              <EditableElement>
                <div className="p-4 border rounded-lg bg-muted flex items-center justify-center">
                  {overrides.logo?.url ? (
                    <img 
                      src={overrides.logo.url} 
                      alt="Logo" 
                      style={{ height: overrides.logo?.height || '80px' }}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-muted-foreground">Clique para adicionar logo</div>
                  )}
                </div>
              </EditableElement>
            </ImageEditPopover>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Cor Primária</p>
            <ColorEditPopover
              value={overrides.primaryColor || "#4F9CF9"}
              onChange={(value) => updateOverride(['primaryColor'], value)}
              label="Cor Primária"
            >
              <EditableElement>
                <div 
                  className="h-12 rounded-lg border"
                  style={{ backgroundColor: overrides.primaryColor || "#4F9CF9" }}
                />
              </EditableElement>
            </ColorEditPopover>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Cor de Fundo</p>
            <ColorEditPopover
              value={overrides.backgroundColor || "#FFFFFF"}
              onChange={(value) => updateOverride(['backgroundColor'], value)}
              label="Cor de Fundo"
            >
              <EditableElement>
                <div 
                  className="h-12 rounded-lg border"
                  style={{ backgroundColor: overrides.backgroundColor || "#FFFFFF" }}
                />
              </EditableElement>
            </ColorEditPopover>
          </div>
        </div>
      </div>
    );
  }

  // Step-specific previews
  return (
    <div className="space-y-6 p-8 bg-background rounded-lg border">
      {/* Header */}
      <div className="space-y-2">
        <TextEditPopover
          value={overrides.heading?.text || "Título"}
          onChange={(value) => updateOverride(['heading', 'text'], value)}
          label="Título Principal"
        >
          <EditableElement>
            <h2 
              className="text-3xl font-bold"
              style={{ 
                color: overrides.heading?.color || "#1A1F36",
                fontSize: overrides.heading?.fontSize || "30px"
              }}
            >
              {overrides.heading?.text || "Título"}
            </h2>
          </EditableElement>
        </TextEditPopover>

        {overrides.subheading?.text && (
          <TextEditPopover
            value={overrides.subheading.text}
            onChange={(value) => updateOverride(['subheading', 'text'], value)}
            label="Subtítulo"
          >
            <EditableElement>
              <p 
                className="text-lg"
                style={{ color: overrides.subheading?.color || "#6B7280" }}
              >
                {overrides.subheading.text}
              </p>
            </EditableElement>
          </TextEditPopover>
        )}
      </div>

      {/* Step-specific content */}
      {stepId === "select_type" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {["manga-curta", "manga-longa", "regata", "ziper-manga-longa"].map((type) => (
            <ImageEditPopover
              key={type}
              value={overrides.cardImages?.[type] || ""}
              onChange={(value) => {
                const newCardImages = { ...overrides.cardImages, [type]: value };
                updateOverride(['cardImages'], newCardImages);
              }}
              label={`Imagem ${type}`}
            >
              <EditableElement>
                <Card className="p-4 text-center hover:shadow-lg transition-shadow">
                  <div className="h-32 flex items-center justify-center bg-muted rounded">
                    {overrides.cardImages?.[type] ? (
                      <img 
                        src={overrides.cardImages[type]} 
                        alt={type}
                        className="h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Clique para adicionar</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium capitalize">
                    {type.replace("-", " ")}
                  </p>
                </Card>
              </EditableElement>
            </ImageEditPopover>
          ))}
        </div>
      )}

      {(stepId === "enter_name" || stepId === "enter_phone") && (
        <div className="mt-6 space-y-4">
          <TextEditPopover
            value={overrides.placeholder || "Digite aqui..."}
            onChange={(value) => updateOverride(['placeholder'], value)}
            label="Texto do Placeholder"
          >
            <EditableElement>
              <div className="p-3 border rounded-lg bg-muted text-muted-foreground">
                {overrides.placeholder || "Digite aqui..."}
              </div>
            </EditableElement>
          </TextEditPopover>

          {stepId === "enter_phone" && overrides.helpText && (
            <TextEditPopover
              value={overrides.helpText}
              onChange={(value) => updateOverride(['helpText'], value)}
              label="Texto de Ajuda"
              multiline
            >
              <EditableElement>
                <p className="text-sm text-muted-foreground">
                  {overrides.helpText}
                </p>
              </EditableElement>
            </TextEditPopover>
          )}
        </div>
      )}
    </div>
  );
};

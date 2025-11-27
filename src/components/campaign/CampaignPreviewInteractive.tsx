import { VisualOverrides } from "@/hooks/useCampaignVisualOverrides";
import { EditableElement } from "./EditableElement";
import { TextEditPopover, ColorEditPopover, ImageEditPopover } from "./EditPopover";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableUniformCard } from "./SortableUniformCard";

// Import uniform images and logo
import mangaCurtaImg from "@/assets/uniforms/manga-curta.png";
import mangaLongaImg from "@/assets/uniforms/manga-longa.png";
import regataImg from "@/assets/uniforms/regata.png";
import ziperMangaLongaImg from "@/assets/uniforms/ziper-manga-longa.png";
import logoImg from "@/assets/logo-ss.png";

const DEFAULT_UNIFORM_IMAGES: Record<string, string> = {
  'manga-curta': mangaCurtaImg,
  'manga-longa': mangaLongaImg,
  'regata': regataImg,
  'ziper-manga-longa': ziperMangaLongaImg,
};

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

  const primaryColor = overrides.primaryColor || "#4F9CF9";
  const backgroundColor = overrides.backgroundColor || "#FFFFFF";
  const logoUrl = overrides.logo?.url || logoImg;
  const logoHeight = overrides.logo?.height || "80px";

  // Render persistent header (appears on all steps)
  const renderHeader = () => (
    <div className="border-b">
      <ColorEditPopover
        value={primaryColor}
        onChange={(value) => updateOverride(['primaryColor'], value)}
        label="Cor Primária do Header"
      >
        <EditableElement>
          <div 
            className="py-6 flex justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="pointer-events-none">
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ height: logoHeight }}
                className="object-contain"
              />
            </div>
          </div>
        </EditableElement>
      </ColorEditPopover>
      
      <div className="flex justify-center py-2 bg-muted/30">
        <ImageEditPopover
          value={logoUrl}
          onChange={(value) => updateOverride(['logo', 'url'], value)}
          label="Logo da Campanha"
        >
          <EditableElement>
            <div className="text-sm text-muted-foreground px-4 py-2">
              Clique aqui para editar o logo
            </div>
          </EditableElement>
        </ImageEditPopover>
      </div>
    </div>
  );

  // Global settings view
  if (stepId === "global") {
    return (
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
        {renderHeader()}
        
        <ColorEditPopover
          value={backgroundColor}
          onChange={(value) => updateOverride(['backgroundColor'], value)}
          label="Cor de Fundo do Conteúdo"
        >
          <EditableElement>
            <div 
              className="min-h-[400px] p-8 flex items-center justify-center"
              style={{ backgroundColor }}
            >
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">Configurações Globais</h3>
                <p className="text-muted-foreground">
                  Clique no logo acima para editá-lo<br />
                  Clique no header para mudar a cor primária<br />
                  Clique nesta área para mudar a cor de fundo
                </p>
              </div>
            </div>
          </EditableElement>
        </ColorEditPopover>
      </div>
    );
  }

  // Select Type step
  if (stepId === "select_type") {
    const heading = overrides.heading?.text || "Escolha o tipo de uniforme";
    const subheading = overrides.subheading?.text || "Selecione o modelo que melhor atende sua necessidade";
    
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );

    const uniformTypes = Object.keys(DEFAULT_UNIFORM_IMAGES);
    const sortedTypes = overrides.cardOrder || uniformTypes;

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (over && active.id !== over.id) {
        const oldIndex = sortedTypes.indexOf(active.id as string);
        const newIndex = sortedTypes.indexOf(over.id as string);
        
        const newOrder = [...sortedTypes];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as string);
        
        updateOverride(['cardOrder'], newOrder);
      }
    };

    const UNIFORM_LABELS: Record<string, string> = {
      'manga-curta': 'Manga Curta',
      'manga-longa': 'Manga Longa',
      'regata': 'Regata',
      'ziper-manga-longa': 'Zíper Manga Longa',
    };
    
    return (
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
        {renderHeader()}
        
        <div className="p-8" style={{ backgroundColor }}>
          <div className="text-center space-y-4 mb-8">
            <TextEditPopover
              value={heading}
              onChange={(value) => updateOverride(['heading', 'text'], value)}
              label="Título Principal"
            >
              <EditableElement>
                <h2 
                  className="text-3xl font-bold"
                  style={{ color: overrides.heading?.color || "#1A1F36" }}
                >
                  {heading}
                </h2>
              </EditableElement>
            </TextEditPopover>

            <TextEditPopover
              value={subheading}
              onChange={(value) => updateOverride(['subheading', 'text'], value)}
              label="Subtítulo"
            >
              <EditableElement>
                <p 
                  className="text-lg"
                  style={{ color: overrides.subheading?.color || "#6B7280" }}
                >
                  {subheading}
                </p>
              </EditableElement>
            </TextEditPopover>
          </div>

          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Arraste os cards para reordenar • Clique para editar imagens
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedTypes} strategy={horizontalListSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sortedTypes.map((type) => {
                  const imageUrl = overrides.cardImages?.[type] || DEFAULT_UNIFORM_IMAGES[type];
                  const label = UNIFORM_LABELS[type] || type;
                  
                  return (
                    <SortableUniformCard
                      key={type}
                      type={type}
                      imageUrl={imageUrl}
                      label={label}
                      onImageChange={(value) => {
                        const newCardImages = { ...overrides.cardImages, [type]: value };
                        updateOverride(['cardImages'], newCardImages);
                      }}
                      isDraggable
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  }

  // Enter Name step
  if (stepId === "enter_name") {
    const heading = overrides.heading?.text || "Me informa o seu nome";
    const placeholder = overrides.placeholder || "Digite seu nome completo...";
    
    return (
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
        {renderHeader()}
        
        <div className="p-8 flex items-center justify-center min-h-[500px]" style={{ backgroundColor }}>
          <Card className="w-full max-w-md p-6">
            <TextEditPopover
              value={heading}
              onChange={(value) => updateOverride(['heading', 'text'], value)}
              label="Título"
            >
              <EditableElement>
                <h2 
                  className="text-2xl font-semibold mb-6 text-center"
                  style={{ color: overrides.heading?.color || "#1A1F36" }}
                >
                  {heading}
                </h2>
              </EditableElement>
            </TextEditPopover>

            <TextEditPopover
              value={placeholder}
              onChange={(value) => updateOverride(['placeholder'], value)}
              label="Placeholder do Input"
            >
              <EditableElement>
                <Input 
                  placeholder={placeholder}
                  className="w-full"
                  disabled
                />
              </EditableElement>
            </TextEditPopover>

            <Button className="w-full mt-4" disabled>
              Continuar
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Enter Phone step
  if (stepId === "enter_phone") {
    const heading = overrides.heading?.text || "Digite seu WhatsApp";
    const placeholder = overrides.placeholder || "(00) 00000-0000";
    const helpText = overrides.helpText || "Informe seu número com DDD para contato";
    
    return (
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
        {renderHeader()}
        
        <div className="p-8 flex items-center justify-center min-h-[500px]" style={{ backgroundColor }}>
          <Card className="w-full max-w-md p-6">
            <TextEditPopover
              value={heading}
              onChange={(value) => updateOverride(['heading', 'text'], value)}
              label="Título"
            >
              <EditableElement>
                <h2 
                  className="text-2xl font-semibold mb-2 text-center"
                  style={{ color: overrides.heading?.color || "#1A1F36" }}
                >
                  {heading}
                </h2>
              </EditableElement>
            </TextEditPopover>

            <TextEditPopover
              value={helpText}
              onChange={(value) => updateOverride(['helpText'], value)}
              label="Texto de Ajuda"
              multiline
            >
              <EditableElement>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {helpText}
                </p>
              </EditableElement>
            </TextEditPopover>

            <TextEditPopover
              value={placeholder}
              onChange={(value) => updateOverride(['placeholder'], value)}
              label="Placeholder do Input"
            >
              <EditableElement>
                <Input 
                  placeholder={placeholder}
                  className="w-full"
                  disabled
                />
              </EditableElement>
            </TextEditPopover>

            <Button className="w-full mt-4" disabled>
              Continuar
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Step-specific previews
  return (
    <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
      {renderHeader()}
      
      <div className="p-8 min-h-[400px]" style={{ backgroundColor }}>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-muted-foreground">
            Preview para "{stepId}" em desenvolvimento
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione outro step para ver o preview
          </p>
        </div>
      </div>
    </div>
  );
};

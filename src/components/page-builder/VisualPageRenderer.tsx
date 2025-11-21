import { useState, useRef, useEffect } from "react";
import { PageLayout, PageComponent } from "@/types/page-builder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

interface VisualPageRendererProps {
  layout: PageLayout;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

export const VisualPageRenderer = ({ 
  layout, 
  selectedComponentId,
  onSelectComponent 
}: VisualPageRendererProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedComponents = [...layout.components].sort((a, b) => a.order - b.order);

  const getAlignClass = (align: string) => {
    switch (align) {
      case 'center': return 'text-center mx-auto';
      case 'right': return 'text-right ml-auto';
      default: return 'text-left';
    }
  };

  const renderComponent = (component: PageComponent) => {
    const isSelected = component.id === selectedComponentId;
    const isHovered = component.id === hoveredId;
    
    const wrapperClasses = `
      relative cursor-pointer transition-all
      ${isSelected ? 'ring-4 ring-primary ring-offset-2' : ''}
      ${isHovered && !isSelected ? 'ring-2 ring-primary/50' : ''}
    `;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectComponent(component.id);
    };

    switch (component.type) {
      case 'heading': {
        const Tag = `h${component.level}` as keyof JSX.IntrinsicElements;
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Tag 
              className={`${getAlignClass(component.align)} ${component.className || ''}`}
              style={{ color: component.color }}
            >
              {component.content}
            </Tag>
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
                Título H{component.level}
              </div>
            )}
          </div>
        );
      }

      case 'text':
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <p 
              className={`${getAlignClass(component.align)} ${component.className || ''}`}
              style={{ 
                color: component.color,
                fontSize: component.fontSize 
              }}
            >
              {component.content}
            </p>
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
                Texto
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div 
            key={component.id}
            className={`${wrapperClasses} ${getAlignClass(component.align)}`}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img
              src={component.src || 'https://via.placeholder.com/400x300?text=Imagem'}
              alt={component.alt}
              className={component.className || ''}
              style={{
                width: component.width,
                height: component.height
              }}
            />
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-10">
                Imagem
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div 
            key={component.id}
            className={`${wrapperClasses} ${getAlignClass(component.align)}`}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Button
              variant={component.variant}
              size={component.size}
              className={component.className || ''}
            >
              {component.text}
            </Button>
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-10">
                Botão
              </div>
            )}
          </div>
        );

      case 'form_field':
        return (
          <div 
            key={component.id}
            className={`${wrapperClasses} space-y-2`}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Label>
              {component.label}
              {component.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {component.fieldType === 'select' ? (
              <Select disabled>
                <SelectTrigger className={component.className || ''}>
                  <SelectValue placeholder={component.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {component.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={component.fieldType}
                placeholder={component.placeholder}
                required={component.required}
                className={component.className || ''}
                disabled
              />
            )}
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-10">
                Campo: {component.label}
              </div>
            )}
          </div>
        );

      case 'spacer':
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            style={{ height: component.height }}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {(isHovered || isSelected) && (
              <div className="w-full h-full border-2 border-dashed border-primary/50 flex items-center justify-center text-xs text-muted-foreground">
                Espaçador ({component.height})
              </div>
            )}
          </div>
        );

      case 'divider':
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Separator 
              className={component.className || ''}
              style={{ 
                backgroundColor: component.color,
                height: component.thickness 
              }}
            />
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
                Divisor
              </div>
            )}
          </div>
        );

      case 'card':
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Card className={component.className || ''}>
              <CardContent className="p-6 space-y-4">
                {component.children?.map(child => renderComponent(child))}
              </CardContent>
            </Card>
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-10">
                Card
              </div>
            )}
          </div>
        );

      case 'custom_editor':
        return (
          <div 
            key={component.id}
            className={wrapperClasses}
            onClick={handleClick}
            onMouseEnter={() => setHoveredId(component.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-bold mb-2">
                  Editor: {component.editorType.replace('_', ' ').toUpperCase()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Componente interativo de personalização
                </p>
              </CardContent>
            </Card>
            {isHovered && !isSelected && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-10">
                Editor Customizado
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate progress percentage
  const progressPercentage = layout.progressIndicator?.totalSteps 
    ? (layout.progressIndicator.currentStep / layout.progressIndicator.totalSteps) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Logo, Steps, and Progress */}
      <div className="container max-w-6xl mx-auto px-4 py-4">
        {layout.progressIndicator?.showLogo && layout.progressIndicator.logoUrl && (
          <div className="flex justify-center mb-6">
            <img 
              src={layout.progressIndicator.logoUrl}
              alt="Logo" 
              style={{ height: layout.progressIndicator.logoHeight || '64px' }}
              className="w-auto"
            />
          </div>
        )}
        
        {layout.progressIndicator && (
          <>
            {/* Step Text */}
            <p className="text-center text-base text-muted-foreground mb-4">
              Etapa {layout.progressIndicator.currentStep} de {layout.progressIndicator.totalSteps}
            </p>
            
            {/* Step Indicator with Circles */}
            {layout.progressIndicator.showStepNumbers && (
              <div className="flex justify-center items-center gap-2 mb-4 overflow-x-auto px-4">
                {Array.from({ length: layout.progressIndicator.totalSteps }, (_, index) => (
                  <div key={index} className="flex items-center flex-shrink-0">
                    <div className={`flex flex-col items-center ${
                      index + 1 <= layout.progressIndicator.currentStep 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                    }`}>
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                          index + 1 <= layout.progressIndicator.currentStep
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-background border-muted'
                        }`}
                        style={{
                          backgroundColor: index + 1 <= layout.progressIndicator.currentStep 
                            ? layout.progressIndicator.completedStepColor 
                            : undefined,
                          borderColor: index + 1 <= layout.progressIndicator.currentStep
                            ? layout.progressIndicator.completedStepColor
                            : layout.progressIndicator.pendingStepColor
                        }}
                      >
                        {index + 1 < layout.progressIndicator.currentStep ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>
                    {index < layout.progressIndicator.totalSteps - 1 && (
                      <div 
                        className={`w-8 h-0.5 mx-1 ${
                          index + 1 < layout.progressIndicator.currentStep 
                            ? 'bg-primary' 
                            : 'bg-muted'
                        }`}
                        style={{
                          backgroundColor: index + 1 < layout.progressIndicator.currentStep
                            ? layout.progressIndicator.completedStepColor
                            : layout.progressIndicator.pendingStepColor
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Progress Bar */}
            {layout.progressIndicator.showProgressBar && (
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            )}
          </>
        )}
      </div>

      {/* Main Content */}
      <div
        style={{
          backgroundColor: layout.backgroundColor,
          maxWidth: layout.containerWidth || '100%',
          padding: layout.padding || '2rem',
          minHeight: '400px'
        }}
        className="mx-auto space-y-6 relative"
        onClick={() => onSelectComponent('')}
      >
        {sortedComponents.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Página vazia</p>
              <p className="text-sm">Adicione componentes usando o painel lateral</p>
            </div>
          </div>
        ) : (
          sortedComponents.map(component => renderComponent(component))
        )}
      </div>
    </div>
  );
};

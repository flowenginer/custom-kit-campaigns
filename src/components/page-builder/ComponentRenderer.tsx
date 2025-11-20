import { PageComponent, PageLayout } from "@/types/page-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FrontEditor } from "@/components/customization/FrontEditor";
import { BackEditor } from "@/components/customization/BackEditor";
import { SleeveEditor } from "@/components/customization/SleeveEditor";

interface ComponentRendererProps {
  layout: PageLayout;
  formData?: Record<string, any>;
  onFormChange?: (key: string, value: any) => void;
  onButtonClick?: (action: string) => void;
  customizationProps?: any; // Props para editores customizados
}

const RenderComponent = ({ 
  component, 
  formData = {}, 
  onFormChange = () => {}, 
  onButtonClick = () => {},
  customizationProps = {}
}: { 
  component: PageComponent;
  formData?: Record<string, any>;
  onFormChange?: (key: string, value: any) => void;
  onButtonClick?: (action: string) => void;
  customizationProps?: any;
}) => {
  const getAlignClass = (align: string) => {
    switch (align) {
      case 'center': return 'text-center mx-auto';
      case 'right': return 'text-right ml-auto';
      default: return 'text-left';
    }
  };

  switch (component.type) {
    case 'heading': {
      const Tag = `h${component.level}` as keyof JSX.IntrinsicElements;
      return (
        <Tag 
          className={`${getAlignClass(component.align)} ${component.className || ''}`}
          style={{ color: component.color }}
        >
          {component.content}
        </Tag>
      );
    }

    case 'text':
      return (
        <p 
          className={`${getAlignClass(component.align)} ${component.className || ''}`}
          style={{ 
            color: component.color,
            fontSize: component.fontSize 
          }}
        >
          {component.content}
        </p>
      );

    case 'image':
      return (
        <div className={getAlignClass(component.align)}>
          <img
            src={component.src}
            alt={component.alt}
            className={component.className || ''}
            style={{
              width: component.width,
              height: component.height
            }}
          />
        </div>
      );

    case 'button':
      return (
        <div className={getAlignClass(component.align)}>
          <Button
            variant={component.variant}
            size={component.size}
            className={component.className || ''}
            onClick={() => component.onClick && onButtonClick(component.onClick)}
          >
            {component.text}
          </Button>
        </div>
      );

    case 'form_field':
      return (
        <div className="space-y-2">
          <Label htmlFor={component.dataKey}>
            {component.label}
            {component.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {component.fieldType === 'select' ? (
            <Select
              value={formData[component.dataKey] || ''}
              onValueChange={(value) => onFormChange(component.dataKey, value)}
            >
              <SelectTrigger id={component.dataKey}>
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
              id={component.dataKey}
              type={component.fieldType}
              placeholder={component.placeholder}
              value={formData[component.dataKey] || ''}
              onChange={(e) => onFormChange(component.dataKey, e.target.value)}
              required={component.required}
              className={component.className || ''}
            />
          )}
        </div>
      );

    case 'spacer':
      return <div style={{ height: component.height }} />;

    case 'divider':
      return (
        <Separator 
          className={component.className || ''}
          style={{ 
            backgroundColor: component.color,
            height: component.thickness 
          }}
        />
      );

    case 'card':
      return (
        <Card className={component.className || ''}>
          <CardContent className="p-6 space-y-4">
            {component.children.map((child) => (
              <RenderComponent
                key={child.id}
                component={child}
                formData={formData}
                onFormChange={onFormChange}
                onButtonClick={onButtonClick}
                customizationProps={customizationProps}
              />
            ))}
          </CardContent>
        </Card>
      );

    case 'custom_editor':
      switch (component.editorType) {
        case 'front':
          return <FrontEditor {...customizationProps.front} />;
        case 'back':
          return <BackEditor {...customizationProps.back} />;
        case 'sleeve_right':
          return <SleeveEditor {...customizationProps.sleeveRight} />;
        case 'sleeve_left':
          return <SleeveEditor {...customizationProps.sleeveLeft} />;
        default:
          return null;
      }

    default:
      return null;
  }
};

export const ComponentRenderer = ({ 
  layout, 
  formData, 
  onFormChange, 
  onButtonClick,
  customizationProps 
}: ComponentRendererProps) => {
  const sortedComponents = [...layout.components].sort((a, b) => a.order - b.order);

  return (
    <div
      style={{
        backgroundColor: layout.backgroundColor,
        maxWidth: layout.containerWidth || '100%',
        padding: layout.padding || '0',
      }}
      className="mx-auto space-y-6"
    >
      {sortedComponents.map((component) => (
        <RenderComponent
          key={component.id}
          component={component}
          formData={formData}
          onFormChange={onFormChange}
          onButtonClick={onButtonClick}
          customizationProps={customizationProps}
        />
      ))}
    </div>
  );
};

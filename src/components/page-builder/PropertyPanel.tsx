import { PageComponent } from "@/types/page-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/customization/ColorPicker";
import { Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";

interface PropertyPanelProps {
  component: PageComponent | null;
  onUpdate: (updates: Partial<PageComponent>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const PropertyPanel = ({ 
  component, 
  onUpdate, 
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown 
}: PropertyPanelProps) => {
  if (!component) {
    return (
      <Card className="w-80 h-full border-l">
        <CardHeader>
          <CardTitle className="text-sm">Propriedades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um componente para editar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 h-full border-l overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Propriedades</CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onMoveUp} title="Mover para cima">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onMoveDown} title="Mover para baixo">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicar">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} title="Deletar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground capitalize">
          {component.type.replace('_', ' ')}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="style">Estilo</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            {(component.type === 'heading' || component.type === 'text') && (
              <div className="space-y-2">
                <Label>Texto</Label>
                <Textarea
                  value={component.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  rows={3}
                />
              </div>
            )}

            {component.type === 'heading' && (
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select
                  value={String(component.level)}
                  onValueChange={(v) => onUpdate({ level: Number(v) as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={String(n)}>H{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {component.type === 'image' && (
              <>
                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <Input
                    value={component.src}
                    onChange={(e) => onUpdate({ src: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto Alternativo</Label>
                  <Input
                    value={component.alt}
                    onChange={(e) => onUpdate({ alt: e.target.value })}
                  />
                </div>
              </>
            )}

            {component.type === 'button' && (
              <>
                <div className="space-y-2">
                  <Label>Texto do Botão</Label>
                  <Input
                    value={component.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Variante</Label>
                  <Select
                    value={component.variant}
                    onValueChange={(v) => onUpdate({ variant: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  <Select
                    value={component.size}
                    onValueChange={(v) => onUpdate({ size: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequeno</SelectItem>
                      <SelectItem value="default">Médio</SelectItem>
                      <SelectItem value="lg">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {component.type === 'form_field' && (
              <>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={component.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input
                    value={component.placeholder || ''}
                    onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={component.fieldType}
                    onValueChange={(v) => onUpdate({ fieldType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="tel">Telefone</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            {(component.type === 'heading' || component.type === 'text' || component.type === 'divider') && (
              <ColorPicker
                label="Cor"
                value={component.color || '#000000'}
                onChange={(color) => onUpdate({ color })}
              />
            )}

            {(component.type === 'heading' || component.type === 'text' || component.type === 'image' || component.type === 'button') && (
              <div className="space-y-2">
                <Label>Alinhamento</Label>
                <Select
                  value={component.align}
                  onValueChange={(v) => onUpdate({ align: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {component.type === 'text' && (
              <div className="space-y-2">
                <Label>Tamanho da Fonte</Label>
                <Input
                  value={component.fontSize || ''}
                  onChange={(e) => onUpdate({ fontSize: e.target.value })}
                  placeholder="16px"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Classes CSS</Label>
              <Input
                value={component.className || ''}
                onChange={(e) => onUpdate({ className: e.target.value })}
                placeholder="custom-class"
              />
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <div className="space-y-2">
              <Label>Largura</Label>
              <Input
                value={component.width || ''}
                onChange={(e) => onUpdate({ width: e.target.value })}
                placeholder="auto, 100%, 300px"
              />
            </div>

            <div className="space-y-2">
              <Label>Altura</Label>
              <Input
                value={component.height || ''}
                onChange={(e) => onUpdate({ height: e.target.value })}
                placeholder="auto, 200px"
              />
            </div>

            <div className="space-y-2">
              <Label>Padding</Label>
              <Input
                value={component.padding || ''}
                onChange={(e) => onUpdate({ padding: e.target.value })}
                placeholder="0, 1rem, 20px"
              />
            </div>

            <div className="space-y-2">
              <Label>Margin</Label>
              <Input
                value={component.margin || ''}
                onChange={(e) => onUpdate({ margin: e.target.value })}
                placeholder="0, 1rem, 20px"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

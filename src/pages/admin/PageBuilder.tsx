import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Eye } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageComponent, PageLayout, ComponentType } from "@/types/page-builder";
import { WorkflowStep } from "@/types/workflow";
import { ComponentRenderer } from "@/components/page-builder/ComponentRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const SortableComponent = ({ 
  component, 
  onRemove, 
  onSelect,
  isSelected 
}: { 
  component: PageComponent; 
  onRemove: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getComponentLabel = (comp: PageComponent) => {
    switch (comp.type) {
      case 'heading': return `Título H${comp.level}`;
      case 'text': return 'Texto';
      case 'image': return 'Imagem';
      case 'button': return 'Botão';
      case 'form_field': return `Campo: ${comp.label}`;
      case 'spacer': return 'Espaçador';
      case 'divider': return 'Divisor';
      case 'card': return 'Card';
      case 'custom_editor': return `Editor: ${comp.editorType}`;
      default: return 'Componente';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-card border rounded cursor-pointer hover:border-primary ${
        isSelected ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={onSelect}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        ⋮⋮
      </button>
      <span className="flex-1 text-sm">{getComponentLabel(component)}</span>
      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};

export const PageBuilder = () => {
  const { workflowId, stepId } = useParams<{ workflowId: string; stepId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [layout, setLayout] = useState<PageLayout>({
    components: [],
    backgroundColor: '',
    containerWidth: '800px',
    padding: '2rem'
  });
  const [selectedComponent, setSelectedComponent] = useState<PageComponent | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadWorkflowAndStep();
  }, [workflowId, stepId]);

  const loadWorkflowAndStep = async () => {
    if (!workflowId || !stepId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (error) {
      toast.error("Erro ao carregar workflow");
      console.error(error);
      setLoading(false);
      return;
    }

    setWorkflow(data);
    const steps = (data.workflow_config as any) as WorkflowStep[];
    const step = steps.find(s => s.id === stepId);

    if (step) {
      setCurrentStep(step);
      if (step.page_layout) {
        setLayout(step.page_layout);
      }
    } else {
      toast.error("Etapa não encontrada");
    }

    setLoading(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout((prev) => {
        const oldIndex = prev.components.findIndex((c) => c.id === active.id);
        const newIndex = prev.components.findIndex((c) => c.id === over.id);
        const newComponents = arrayMove(prev.components, oldIndex, newIndex);
        return {
          ...prev,
          components: newComponents.map((c, i) => ({ ...c, order: i }))
        };
      });
    }
  };

  const addComponent = (type: ComponentType) => {
    const id = `comp-${Date.now()}`;
    let newComponent: PageComponent;

    switch (type) {
      case 'heading':
        newComponent = {
          id,
          type: 'heading',
          content: 'Novo Título',
          level: 2,
          align: 'left',
          order: layout.components.length
        };
        break;
      case 'text':
        newComponent = {
          id,
          type: 'text',
          content: 'Novo texto',
          align: 'left',
          order: layout.components.length
        };
        break;
      case 'image':
        newComponent = {
          id,
          type: 'image',
          src: '',
          alt: 'Imagem',
          align: 'center',
          order: layout.components.length
        };
        break;
      case 'button':
        newComponent = {
          id,
          type: 'button',
          text: 'Clique aqui',
          variant: 'default',
          size: 'default',
          align: 'center',
          order: layout.components.length
        };
        break;
      case 'form_field':
        newComponent = {
          id,
          type: 'form_field',
          fieldType: 'text',
          label: 'Campo',
          dataKey: `field_${Date.now()}`,
          required: false,
          order: layout.components.length
        };
        break;
      case 'spacer':
        newComponent = {
          id,
          type: 'spacer',
          height: '2rem',
          order: layout.components.length
        };
        break;
      case 'divider':
        newComponent = {
          id,
          type: 'divider',
          order: layout.components.length
        };
        break;
      case 'card':
        newComponent = {
          id,
          type: 'card',
          children: [],
          order: layout.components.length
        };
        break;
      case 'custom_editor':
        newComponent = {
          id,
          type: 'custom_editor',
          editorType: 'front',
          order: layout.components.length
        };
        break;
      default:
        return;
    }

    setLayout(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
    setSelectedComponent(newComponent);
  };

  const removeComponent = (id: string) => {
    setLayout(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i }))
    }));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const updateComponent = (updates: Partial<PageComponent>) => {
    if (!selectedComponent) return;
    
    setLayout(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === selectedComponent.id ? { ...c, ...updates } as PageComponent : c
      )
    }));
    setSelectedComponent(prev => prev ? { ...prev, ...updates } as PageComponent : null);
  };

  const handleSave = async () => {
    if (!workflow || !currentStep) return;

    setSaving(true);

    const updatedSteps = ((workflow.workflow_config as any) as WorkflowStep[]).map(step =>
      step.id === stepId ? { ...step, page_layout: layout } : step
    );

    const { error } = await supabase
      .from("workflow_templates")
      .update({ workflow_config: updatedSteps as any })
      .eq("id", workflowId);

    if (error) {
      toast.error("Erro ao salvar layout");
      console.error(error);
    } else {
      toast.success("Layout salvo com sucesso!");
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!currentStep) {
    return <div className="flex items-center justify-center h-screen">Etapa não encontrada</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/workflows')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{currentStep.label}</h1>
            <p className="text-sm text-muted-foreground">{workflow?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Editor' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!previewMode ? (
          <>
            {/* Sidebar - Componentes */}
            <div className="w-64 border-r p-4 overflow-y-auto bg-muted/30">
              <h3 className="font-semibold mb-3">Componentes</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('heading')}>
                  <Plus className="w-4 h-4 mr-2" /> Título
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('text')}>
                  <Plus className="w-4 h-4 mr-2" /> Texto
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('image')}>
                  <Plus className="w-4 h-4 mr-2" /> Imagem
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('button')}>
                  <Plus className="w-4 h-4 mr-2" /> Botão
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('form_field')}>
                  <Plus className="w-4 h-4 mr-2" /> Campo
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('spacer')}>
                  <Plus className="w-4 h-4 mr-2" /> Espaçador
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('divider')}>
                  <Plus className="w-4 h-4 mr-2" /> Divisor
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('card')}>
                  <Plus className="w-4 h-4 mr-2" /> Card
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addComponent('custom_editor')}>
                  <Plus className="w-4 h-4 mr-2" /> Editor Customizado
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-3">Estrutura</h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={layout.components.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {layout.components.map((component) => (
                        <SortableComponent
                          key={component.id}
                          component={component}
                          onRemove={() => removeComponent(component.id)}
                          onSelect={() => setSelectedComponent(component)}
                          isSelected={selectedComponent?.id === component.id}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>

            {/* Canvas Central */}
            <div className="flex-1 overflow-y-auto p-8 bg-muted/50">
              <div className="mx-auto" style={{ maxWidth: layout.containerWidth }}>
                <Card>
                  <CardContent className="p-8">
                    <ComponentRenderer layout={layout} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Painel de Propriedades */}
            <div className="w-80 border-l p-4 overflow-y-auto">
              {selectedComponent ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Propriedades</h3>
                  
                  {selectedComponent.type === 'heading' && (
                    <>
                      <div>
                        <Label>Conteúdo</Label>
                        <Input
                          value={selectedComponent.content}
                          onChange={(e) => updateComponent({ content: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Nível</Label>
                        <Select
                          value={String(selectedComponent.level)}
                          onValueChange={(v) => updateComponent({ level: parseInt(v) as any })}
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
                      <div>
                        <Label>Alinhamento</Label>
                        <Select
                          value={selectedComponent.align}
                          onValueChange={(v: any) => updateComponent({ align: v })}
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
                      <div>
                        <Label>Cor</Label>
                        <Input
                          type="color"
                          value={selectedComponent.color || '#000000'}
                          onChange={(e) => updateComponent({ color: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedComponent.type === 'text' && (
                    <>
                      <div>
                        <Label>Conteúdo</Label>
                        <Textarea
                          value={selectedComponent.content}
                          onChange={(e) => updateComponent({ content: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Alinhamento</Label>
                        <Select
                          value={selectedComponent.align}
                          onValueChange={(v: any) => updateComponent({ align: v })}
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
                      <div>
                        <Label>Cor</Label>
                        <Input
                          type="color"
                          value={selectedComponent.color || '#000000'}
                          onChange={(e) => updateComponent({ color: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Tamanho da Fonte</Label>
                        <Input
                          value={selectedComponent.fontSize || ''}
                          onChange={(e) => updateComponent({ fontSize: e.target.value })}
                          placeholder="Ex: 16px, 1rem"
                        />
                      </div>
                    </>
                  )}

                  {selectedComponent.type === 'image' && (
                    <>
                      <div>
                        <Label>URL da Imagem</Label>
                        <Input
                          value={selectedComponent.src}
                          onChange={(e) => updateComponent({ src: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Texto Alternativo</Label>
                        <Input
                          value={selectedComponent.alt}
                          onChange={(e) => updateComponent({ alt: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Largura</Label>
                        <Input
                          value={selectedComponent.width || ''}
                          onChange={(e) => updateComponent({ width: e.target.value })}
                          placeholder="Ex: 300px, 100%"
                        />
                      </div>
                      <div>
                        <Label>Altura</Label>
                        <Input
                          value={selectedComponent.height || ''}
                          onChange={(e) => updateComponent({ height: e.target.value })}
                          placeholder="Ex: 200px, auto"
                        />
                      </div>
                      <div>
                        <Label>Alinhamento</Label>
                        <Select
                          value={selectedComponent.align}
                          onValueChange={(v: any) => updateComponent({ align: v })}
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
                    </>
                  )}

                  {selectedComponent.type === 'button' && (
                    <>
                      <div>
                        <Label>Texto</Label>
                        <Input
                          value={selectedComponent.text}
                          onChange={(e) => updateComponent({ text: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Variante</Label>
                        <Select
                          value={selectedComponent.variant}
                          onValueChange={(v: any) => updateComponent({ variant: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Padrão</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="secondary">Secundário</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tamanho</Label>
                        <Select
                          value={selectedComponent.size}
                          onValueChange={(v: any) => updateComponent({ size: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sm">Pequeno</SelectItem>
                            <SelectItem value="default">Padrão</SelectItem>
                            <SelectItem value="lg">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ação (onClick)</Label>
                        <Input
                          value={selectedComponent.onClick || ''}
                          onChange={(e) => updateComponent({ onClick: e.target.value })}
                          placeholder="Ex: next_step"
                        />
                      </div>
                      <div>
                        <Label>Alinhamento</Label>
                        <Select
                          value={selectedComponent.align}
                          onValueChange={(v: any) => updateComponent({ align: v })}
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
                    </>
                  )}

                  {selectedComponent.type === 'form_field' && (
                    <>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={selectedComponent.label}
                          onChange={(e) => updateComponent({ label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Tipo de Campo</Label>
                        <Select
                          value={selectedComponent.fieldType}
                          onValueChange={(v: any) => updateComponent({ fieldType: v })}
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
                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedComponent.placeholder || ''}
                          onChange={(e) => updateComponent({ placeholder: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Chave de Dados</Label>
                        <Input
                          value={selectedComponent.dataKey}
                          onChange={(e) => updateComponent({ dataKey: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedComponent.required || false}
                          onCheckedChange={(checked) => updateComponent({ required: checked })}
                        />
                        <Label>Obrigatório</Label>
                      </div>
                      {selectedComponent.fieldType === 'select' && (
                        <div>
                          <Label>Opções (uma por linha)</Label>
                          <Textarea
                            value={selectedComponent.options?.join('\n') || ''}
                            onChange={(e) => updateComponent({ options: e.target.value.split('\n').filter(Boolean) })}
                            rows={4}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {selectedComponent.type === 'spacer' && (
                    <div>
                      <Label>Altura</Label>
                      <Input
                        value={selectedComponent.height}
                        onChange={(e) => updateComponent({ height: e.target.value })}
                        placeholder="Ex: 2rem, 20px"
                      />
                    </div>
                  )}

                  {selectedComponent.type === 'divider' && (
                    <>
                      <div>
                        <Label>Cor</Label>
                        <Input
                          type="color"
                          value={selectedComponent.color || '#e5e7eb'}
                          onChange={(e) => updateComponent({ color: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Espessura</Label>
                        <Input
                          value={selectedComponent.thickness || ''}
                          onChange={(e) => updateComponent({ thickness: e.target.value })}
                          placeholder="Ex: 1px, 2px"
                        />
                      </div>
                    </>
                  )}

                  {selectedComponent.type === 'custom_editor' && (
                    <div>
                      <Label>Tipo de Editor</Label>
                      <Select
                        value={selectedComponent.editorType}
                        onValueChange={(v: any) => updateComponent({ editorType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="front">Frente</SelectItem>
                          <SelectItem value="back">Costas</SelectItem>
                          <SelectItem value="sleeve_right">Manga Direita</SelectItem>
                          <SelectItem value="sleeve_left">Manga Esquerda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Classes CSS Customizadas</Label>
                    <Input
                      value={(selectedComponent as any).className || ''}
                      onChange={(e) => updateComponent({ className: e.target.value })}
                      placeholder="Ex: mt-4 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Selecione um componente para editar
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Configurações da Página</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="color"
                      value={layout.backgroundColor || '#ffffff'}
                      onChange={(e) => setLayout(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Largura do Container</Label>
                    <Input
                      value={layout.containerWidth || ''}
                      onChange={(e) => setLayout(prev => ({ ...prev, containerWidth: e.target.value }))}
                      placeholder="Ex: 800px, 100%"
                    />
                  </div>
                  <div>
                    <Label>Padding</Label>
                    <Input
                      value={layout.padding || ''}
                      onChange={(e) => setLayout(prev => ({ ...prev, padding: e.target.value }))}
                      placeholder="Ex: 2rem, 20px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto" style={{ maxWidth: layout.containerWidth }}>
              <ComponentRenderer layout={layout} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

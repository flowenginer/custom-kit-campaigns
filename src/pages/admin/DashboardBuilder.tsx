import { useState } from "react";
import { useDataSources, DataSource } from "@/hooks/useDataSources";
import { useDashboards, useSaveDashboard, useDeleteDashboard, useLoadDashboard } from "@/hooks/useDashboards";
import { Widget } from "@/types/dashboard";
import { WidgetConfigDialog } from "@/components/dashboard-builder/WidgetConfigDialog";
import { WidgetGrid } from "@/components/dashboard-builder/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, FolderOpen, LayoutDashboard, Database, Table2, Trash2, Eye, Edit3 } from "lucide-react";
import { toast } from "sonner";

const DashboardBuilder = () => {
  const { dataSources, groupedSources, categoryLabels, isLoading } = useDataSources();
  const { data: dashboards } = useDashboards();
  const saveDashboard = useSaveDashboard();
  const deleteDashboard = useDeleteDashboard();
  
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("");
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const { data: loadedDashboard } = useLoadDashboard(currentDashboardId);

  const handleSaveDashboard = () => {
    if (!dashboardName.trim()) {
      toast.error("Digite um nome para o dashboard");
      return;
    }

    saveDashboard.mutate({
      id: currentDashboardId || undefined,
      name: dashboardName,
      is_public: false,
      widgets: widgets,
    });
  };

  const handleLoadDashboard = (dashboardId: string) => {
    setCurrentDashboardId(dashboardId);
  };

  if (loadedDashboard && currentDashboardId && widgets.length === 0) {
    setWidgets(loadedDashboard.widgets || []);
    setDashboardName(loadedDashboard.name);
  }

  const handleAddWidget = (widget: Partial<Widget>) => {
    if (editingWidget) {
      // Editing existing widget
      setWidgets(widgets.map(w => w.id === widget.id ? widget as Widget : w));
      setEditingWidget(null);
    } else {
      // Adding new widget
      setWidgets([...widgets, widget as Widget]);
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowWidgetDialog(true);
  };

  const handleReorderWidgets = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
  };

  const handleResizeWidget = (widgetId: string, size: { w: number; h: number }) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId 
        ? { ...w, position: { ...w.position, ...size } }
        : w
    ));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleNewDashboard = () => {
    setWidgets([]);
    setDashboardName("");
    setCurrentDashboardId(null);
    setSelectedSource(null);
    setPreviewMode(false);
  };

  const handleSelectSource = (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (source) {
      setSelectedSource(source);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-6">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Dashboard Builder</h1>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Nome:</Label>
              <Input
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Digite o nome"
                className="w-48"
              />
            </div>
            <Button 
              variant={previewMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <Edit3 className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {previewMode ? "Editar" : "Preview"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewDashboard}>
              Novo
            </Button>
            <Button size="sm" onClick={handleSaveDashboard} disabled={saveDashboard.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fontes de Dados */}
        <div className="w-80 border-r bg-muted/30">
          <div className="p-4 border-b bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Fontes de Dados</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {dataSources.length} fonte{dataSources.length !== 1 ? 's' : ''} disponíve{dataSources.length !== 1 ? 'is' : 'l'}
            </p>
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {Object.entries(groupedSources).map(([category, sources]) => (
                    <AccordionItem key={category} value={category} className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-normal">
                            {sources.length}
                          </Badge>
                          <span className="font-medium text-sm">
                            {categoryLabels[category] || category}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-2">
                        <div className="space-y-2">
                          {sources.map((source) => (
                            <Card
                              key={source.id}
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedSource?.id === source.id 
                                  ? 'ring-2 ring-primary bg-primary/5' 
                                  : 'hover:bg-accent'
                              }`}
                              onClick={() => handleSelectSource(source.id)}
                            >
                              <CardHeader className="p-3 pb-2">
                                <div className="flex items-start gap-2">
                                  <Table2 className="h-4 w-4 text-primary mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-medium line-clamp-1">
                                      {source.display_name}
                                    </CardTitle>
                                    {source.description && (
                                      <CardDescription className="text-xs line-clamp-2 mt-1">
                                        {source.description}
                                      </CardDescription>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-xs">
                                    {source.available_fields.length} campos
                                  </Badge>
                                  <span className="text-xs opacity-60">•</span>
                                  <code className="text-xs bg-muted px-1 rounded">
                                    {source.table_name}
                                  </code>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Toolbar */}
          <div className="border-b bg-background p-3">
            <div className="flex items-center gap-2">
              {!previewMode && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingWidget(null);
                    setShowWidgetDialog(true);
                  }} 
                  disabled={!selectedSource}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Widget
                </Button>
              )}
              
              {selectedSource && (
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Fonte selecionada:</span>
                  <Badge variant="secondary">
                    {selectedSource.display_name}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-muted/20 p-6">
            <div className="mx-auto max-w-7xl">
              {!selectedSource ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Database className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">Selecione uma fonte de dados</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Escolha uma tabela do painel lateral para começar a criar widgets para seu dashboard personalizado.
                    </p>
                  </div>
                </div>
              ) : widgets.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium">Área de Widgets</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Clique em "Adicionar Widget" para criar gráficos, tabelas e métricas usando a fonte selecionada.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setShowWidgetDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Widget
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <WidgetGrid 
                  widgets={widgets} 
                  onEdit={handleEditWidget}
                  onDelete={handleDeleteWidget}
                  onReorder={handleReorderWidgets}
                  onResize={handleResizeWidget}
                  previewMode={previewMode}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Direita - Dashboards Salvos */}
        <div className="w-64 border-l bg-muted/30">
          <div className="p-4 border-b bg-background">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Dashboards Salvos
            </h2>
          </div>
          
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-4">
              {dashboards && dashboards.length > 0 ? (
                <div className="space-y-2">
                  {dashboards.map((dashboard) => (
                    <Card 
                      key={dashboard.id} 
                      className={`cursor-pointer hover:bg-accent transition-colors ${
                        currentDashboardId === dashboard.id ? 'bg-accent' : ''
                      }`}
                    >
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between">
                          <div 
                            className="flex-1"
                            onClick={() => handleLoadDashboard(dashboard.id)}
                          >
                            <CardTitle className="text-sm">{dashboard.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {dashboard.widgets?.length || 0} widgets
                            </CardDescription>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDashboard.mutate(dashboard.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>Nenhum dashboard salvo ainda</p>
                  <p className="text-xs mt-2">Crie e salve seu primeiro dashboard</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <WidgetConfigDialog
        open={showWidgetDialog}
        onOpenChange={(open) => {
          setShowWidgetDialog(open);
          if (!open) setEditingWidget(null);
        }}
        dataSource={selectedSource}
        onSave={handleAddWidget}
        editWidget={editingWidget}
      />
    </div>
  );
};

export default DashboardBuilder;

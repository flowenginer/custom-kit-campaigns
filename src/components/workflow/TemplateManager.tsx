import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, Trash2, Edit, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  is_custom: boolean;
  description?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  workflow_config: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

interface TemplateManagerProps {
  currentWorkflow: WorkflowStep[];
  onApplyTemplate: (workflow: WorkflowStep[]) => void;
}

export function TemplateManager({ currentWorkflow, onApplyTemplate }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        workflow_config: (t.workflow_config as unknown as WorkflowStep[]) || []
      })));
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    try {
      const { error } = await supabase
        .from("workflow_templates")
        .insert({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          workflow_config: currentWorkflow as any,
        });

      if (error) throw error;

      toast.success("Template salvo com sucesso!");
      setTemplateName("");
      setTemplateDescription("");
      setShowSaveDialog(false);
      loadTemplates();
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      if (error.code === '23505') {
        toast.error("Já existe um template com este nome");
      } else {
        toast.error("Erro ao salvar template");
      }
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) return;

    try {
      const { error } = await supabase
        .from("workflow_templates")
        .update({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template atualizado com sucesso!");
      setShowEditDialog(false);
      setSelectedTemplate(null);
      setTemplateName("");
      setTemplateDescription("");
      loadTemplates();
    } catch (error: any) {
      console.error("Erro ao atualizar template:", error);
      if (error.code === '23505') {
        toast.error("Já existe um template com este nome");
      } else {
        toast.error("Erro ao atualizar template");
      }
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from("workflow_templates")
        .delete()
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template deletado com sucesso!");
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Erro ao deletar template:", error);
      toast.error("Erro ao deletar template");
    }
  };

  const handleApply = (template: WorkflowTemplate) => {
    onApplyTemplate(template.workflow_config);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const openEditDialog = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates de Workflow
              </CardTitle>
              <CardDescription>
                Salve e reutilize configurações de workflow
              </CardDescription>
            </div>
            <Button onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              Salvar como Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum template salvo ainda</p>
              <p className="text-sm mt-2">Salve seu primeiro template para reutilizar depois</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="outline">
                        {template.workflow_config.length} etapas
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApply(template)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
            <DialogDescription>
              Crie um template reutilizável com a configuração atual
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                placeholder="Ex: Workflow Padrão"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Textarea
                id="desc"
                placeholder="Descreva este template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              Atualize o nome e descrição do template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Template *</Label>
              <Input
                id="edit-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Descrição (opcional)</Label>
              <Textarea
                id="edit-desc"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTemplate} disabled={!templateName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o template "{selectedTemplate?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
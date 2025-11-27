import { useState } from "react";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { DashboardTemplate } from "@/types/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateGalleryProps {
  onApplyTemplate: (template: DashboardTemplate) => void;
}

const categoryColors: Record<string, string> = {
  comercial: "bg-primary text-primary-foreground",
  operacional: "bg-accent text-accent-foreground",
  marketing: "bg-secondary text-secondary-foreground",
  custom: "bg-muted text-muted-foreground",
};

const categoryIcons: Record<string, string> = {
  comercial: "💼",
  operacional: "⚙️",
  marketing: "📢",
  custom: "✨",
};

export const TemplateGallery = ({ onApplyTemplate }: TemplateGalleryProps) => {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DashboardTemplate | null>(null);

  const categories = ["all", "comercial", "operacional", "marketing", "custom"];

  const filteredTemplates = templates?.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  );

  const handleDelete = (template: DashboardTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "Todos" : categoryIcons[cat]} {cat === "all" ? "" : cat}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates?.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge className={categoryColors[template.category]}>
                      {categoryIcons[template.category]} {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        Template do Sistema
                      </Badge>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(template.layout) ? template.layout.length : 0} widgets
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => onApplyTemplate(template)}
                      >
                        Usar Template
                      </Button>
                      
                      {!template.is_system && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

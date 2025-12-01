import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Building2 } from "lucide-react";
import { 
  useBusinessSegments, 
  useCreateBusinessSegment, 
  useUpdateBusinessSegment, 
  useDeleteBusinessSegment,
  useReorderBusinessSegments,
  BusinessSegment 
} from "@/hooks/useBusinessSegments";
import { EmojiPicker } from "./EmojiPicker";

export const BusinessSegmentsManager = () => {
  const { data: segments, isLoading } = useBusinessSegments();
  const createMutation = useCreateBusinessSegment();
  const updateMutation = useUpdateBusinessSegment();
  const deleteMutation = useDeleteBusinessSegment();
  const reorderMutation = useReorderBusinessSegments();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<BusinessSegment | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏢'
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', icon: '🏢' });
    setSelectedSegment(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createMutation.mutateAsync(formData);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedSegment || !formData.name.trim()) return;
    await updateMutation.mutateAsync({
      id: selectedSegment.id,
      name: formData.name,
      description: formData.description || null,
      icon: formData.icon
    });
    setIsEditOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedSegment) return;
    await deleteMutation.mutateAsync(selectedSegment.id);
    setIsDeleteOpen(false);
    resetForm();
  };

  const handleToggleActive = async (segment: BusinessSegment) => {
    await updateMutation.mutateAsync({
      id: segment.id,
      is_active: !segment.is_active
    });
  };

  const handleMoveUp = async (index: number) => {
    if (!segments || index === 0) return;
    
    const newSegments = [...segments];
    const updates = [
      { id: newSegments[index].id, display_order: newSegments[index - 1].display_order },
      { id: newSegments[index - 1].id, display_order: newSegments[index].display_order }
    ];
    
    await reorderMutation.mutateAsync(updates);
  };

  const handleMoveDown = async (index: number) => {
    if (!segments || index === segments.length - 1) return;
    
    const updates = [
      { id: segments[index].id, display_order: segments[index + 1].display_order },
      { id: segments[index + 1].id, display_order: segments[index].display_order }
    ];
    
    await reorderMutation.mutateAsync(updates);
  };

  const openEditDialog = (segment: BusinessSegment) => {
    setSelectedSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || '',
      icon: segment.icon
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (segment: BusinessSegment) => {
    setSelectedSegment(segment);
    setIsDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Segmentos de Negócio
            </CardTitle>
            <CardDescription>
              Gerencie os segmentos de negócio disponíveis para leads do Adventure
            </CardDescription>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Segmento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Segmento de Negócio</DialogTitle>
                <DialogDescription>
                  Adicione um novo segmento para classificar leads do Adventure
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
              <div>
                  <Label>Ícone</Label>
                  <div className="mt-2">
                    <EmojiPicker 
                      value={formData.icon} 
                      onChange={(emoji) => setFormData(prev => ({ ...prev, icon: emoji }))} 
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="name">Nome do Segmento *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Jardinagem"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Uma breve descrição deste segmento..."
                    rows={2}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!formData.name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar Segmento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {!segments || segments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum segmento cadastrado</p>
            <p className="text-sm">Clique em "Novo Segmento" para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  segment.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{segment.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{segment.name}</span>
                      {!segment.is_active && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    {segment.description && (
                      <p className="text-sm text-muted-foreground">{segment.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === segments.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Switch
                    checked={segment.is_active}
                    onCheckedChange={() => handleToggleActive(segment)}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(segment)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(segment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Segmento</DialogTitle>
              <DialogDescription>
                Altere os dados do segmento de negócio
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Ícone</Label>
                <div className="mt-2">
                  <EmojiPicker 
                    value={formData.icon} 
                    onChange={(emoji) => setFormData(prev => ({ ...prev, icon: emoji }))} 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-name">Nome do Segmento *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Descrição (opcional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={!formData.name.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Segmento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o segmento "{selectedSegment?.name}"?
                Esta ação não poderá ser desfeita se não houver leads associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => resetForm()}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

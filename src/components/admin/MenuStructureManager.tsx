import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, GripVertical, ChevronRight } from "lucide-react";
import { useMenuStructure, MenuItem } from "@/hooks/useMenuStructure";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";

const COMMON_ICONS = [
  "LayoutDashboard", "LineChart", "Trophy", "Tags", "Shirt", "Megaphone",
  "Users", "Workflow", "FlaskConical", "Palette", "ShoppingCart",
  "CheckCircle", "Code", "Settings", "Circle", "Square", "Box",
  "FileText", "Image", "Database", "Server", "Bell", "Mail"
];

export const MenuStructureManager = () => {
  const { menuItems, isLoading, refetch, getMenuTree, getIcon, getMainMenus } = useMenuStructure();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("Circle");
  const [route, setRoute] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const menuTree = getMenuTree();

  const resetForm = () => {
    setLabel("");
    setSlug("");
    setIcon("Circle");
    setRoute("");
    setDescription("");
    setParentId(null);
    setDisplayOrder(0);
    setIsActive(true);
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setLabel(item.label);
    setSlug(item.slug);
    setIcon(item.icon);
    setRoute(item.route);
    setDescription(item.description || "");
    setParentId(item.parent_id);
    setDisplayOrder(item.display_order);
    setIsActive(item.is_active);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!label || !slug || !route) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update
        const { error } = await supabase
          .from("menu_items")
          .update({
            label,
            slug,
            icon,
            route,
            description: description || null,
            parent_id: parentId,
            display_order: displayOrder,
            is_active: isActive,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Menu atualizado com sucesso!");
      } else {
        // Create
        const { error } = await supabase
          .from("menu_items")
          .insert({
            label,
            slug,
            icon,
            route,
            description: description || null,
            parent_id: parentId,
            display_order: displayOrder,
            is_active: isActive,
          });

        if (error) throw error;
        toast.success("Menu criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Tem certeza que deseja deletar o menu "${item.label}"?`)) return;

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success("Menu deletado com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      toast.success(item.is_active ? "Menu desativado" : "Menu ativado");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (!editingItem) {
      setSlug(generateSlug(value));
      setRoute(`/admin/${generateSlug(value)}`);
    }
  };

  const renderMenuRow = (item: MenuItem, level: number = 0) => {
    const Icon = getIcon(item.icon);
    return (
      <>
        <TableRow key={item.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {level > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </div>
          </TableCell>
          <TableCell>
            <code className="text-xs bg-muted px-2 py-1 rounded">{item.slug}</code>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">{item.route}</TableCell>
          <TableCell>
            {item.parent_id ? (
              <Badge variant="outline">
                Submenu
              </Badge>
            ) : (
              <Badge>Menu Principal</Badge>
            )}
          </TableCell>
          <TableCell className="text-center">{item.display_order}</TableCell>
          <TableCell>
            <Switch
              checked={item.is_active}
              onCheckedChange={() => handleToggleActive(item)}
            />
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(item)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {item.children?.map((child) => renderMenuRow(child, level + 1))}
      </>
    );
  };

  if (isLoading) {
    return <div>Carregando estrutura de menus...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Estrutura de Menus</CardTitle>
            <CardDescription>
              Gerencie a hierarquia de menus e submenus do sistema
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Menu
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Ordem</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuTree.map((item) => renderMenuRow(item))}
          </TableBody>
        </Table>

        {/* Dialog para Criar/Editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Menu" : "Novo Menu"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Atualize as informações do menu"
                  : "Crie um novo menu ou submenu"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Nome do Menu *</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="Dashboard"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (identificador) *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="dashboard"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="route">Rota *</Label>
                <Input
                  id="route"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="/admin/dashboard"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do menu"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Ícone</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_ICONS.map((iconName) => {
                        const Icon = (LucideIcons as any)[iconName];
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {iconName}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="parent">Tipo</Label>
                  <Select
                    value={parentId || "none"}
                    onValueChange={(v) => setParentId(v === "none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Menu Principal</SelectItem>
                      {getMainMenus()
                        .filter((menu) => !editingItem || menu.id !== editingItem.id)
                        .map((menu) => (
                          <SelectItem key={menu.id} value={menu.id}>
                            Submenu de: {menu.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order">Ordem de Exibição</Label>
                  <Input
                    id="order"
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Menu Ativo</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

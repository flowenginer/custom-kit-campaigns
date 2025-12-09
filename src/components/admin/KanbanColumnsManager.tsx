import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Settings, RefreshCw, Save, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanColumnRule {
  id: string;
  column_id: string;
  rule_order: number;
  field_name: string;
  operator: string;
  value: string | null;
  is_active: boolean;
}

interface KanbanColumn {
  id: string;
  key: string;
  title: string;
  icon: string | null;
  background_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active: boolean;
  is_manual_only: boolean;
  rules?: KanbanColumnRule[];
}

const AVAILABLE_FIELDS = [
  { value: 'status', label: 'Status da Task' },
  { value: 'needs_logo', label: 'Precisa de Logo (lead)' },
  { value: 'logo_action', label: 'Ação do Logo (lead)' },
  { value: 'salesperson_status', label: 'Status do Vendedor (lead)' },
  { value: 'returned_from_rejection', label: 'Retornado de Rejeição' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'assigned_to', label: 'Designer Atribuído' },
];

const OPERATORS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'not_equals', label: 'Diferente de' },
  { value: 'is_null', label: 'É vazio' },
  { value: 'is_not_null', label: 'Não é vazio' },
  { value: 'contains', label: 'Contém' },
];

function SortableColumnRow({ column, onEdit, onToggle, onDelete }: { 
  column: KanbanColumn; 
  onEdit: (col: KanbanColumn) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {column.background_color && (
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: column.background_color }} 
            />
          )}
          <span className="font-medium">{column.title}</span>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1 py-0.5 rounded">{column.key}</code>
      </TableCell>
      <TableCell>
        <Badge variant={column.is_manual_only ? "secondary" : "default"}>
          {column.is_manual_only ? 'Manual' : 'Automático'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{column.rules?.length || 0} regras</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={column.is_active}
          onCheckedChange={(checked) => onToggle(column.id, checked)}
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(column)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(column.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function KanbanColumnsManager() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewColumn, setIsNewColumn] = useState(false);
  const [columnRules, setColumnRules] = useState<KanbanColumnRule[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('sort_order');

      if (columnsError) throw columnsError;

      const { data: rulesData, error: rulesError } = await supabase
        .from('kanban_column_rules')
        .select('*')
        .order('rule_order');

      if (rulesError) throw rulesError;

      const columnsWithRules = (columnsData || []).map(col => ({
        ...col,
        rules: (rulesData || []).filter(rule => rule.column_id === col.id)
      }));

      setColumns(columnsWithRules);
    } catch (error: any) {
      toast.error('Erro ao carregar colunas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);
    const newColumns = arrayMove(columns, oldIndex, newIndex);

    setColumns(newColumns);

    // Atualizar sort_order no banco
    for (let i = 0; i < newColumns.length; i++) {
      await supabase
        .from('kanban_columns')
        .update({ sort_order: i + 1 })
        .eq('id', newColumns[i].id);
    }

    toast.success('Ordem atualizada');
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('kanban_columns')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    } else {
      setColumns(columns.map(c => c.id === id ? { ...c, is_active: active } : c));
      toast.success(active ? 'Coluna ativada' : 'Coluna desativada');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta coluna?')) return;

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      setColumns(columns.filter(c => c.id !== id));
      toast.success('Coluna excluída');
    }
  };

  const openEditDialog = (column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnRules(column.rules || []);
    setIsNewColumn(false);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingColumn({
      id: '',
      key: '',
      title: '',
      icon: null,
      background_color: null,
      text_color: '#ffffff',
      sort_order: columns.length + 1,
      is_active: true,
      is_manual_only: false,
    });
    setColumnRules([]);
    setIsNewColumn(true);
    setIsDialogOpen(true);
  };

  const addRule = () => {
    setColumnRules([
      ...columnRules,
      {
        id: `temp-${Date.now()}`,
        column_id: editingColumn?.id || '',
        rule_order: columnRules.length + 1,
        field_name: 'status',
        operator: 'equals',
        value: '',
        is_active: true,
      }
    ]);
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...columnRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setColumnRules(newRules);
  };

  const removeRule = (index: number) => {
    setColumnRules(columnRules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!editingColumn) return;

    try {
      if (isNewColumn) {
        // Criar nova coluna
        const { data: newCol, error: colError } = await supabase
          .from('kanban_columns')
          .insert({
            key: editingColumn.key,
            title: editingColumn.title,
            icon: editingColumn.icon,
            background_color: editingColumn.background_color,
            text_color: editingColumn.text_color,
            sort_order: editingColumn.sort_order,
            is_active: editingColumn.is_active,
            is_manual_only: editingColumn.is_manual_only,
          })
          .select()
          .single();

        if (colError) throw colError;

        // Criar regras
        if (columnRules.length > 0) {
          const rulesToInsert = columnRules.map((rule, index) => ({
            column_id: newCol.id,
            rule_order: index + 1,
            field_name: rule.field_name,
            operator: rule.operator,
            value: rule.value,
            is_active: true,
          }));

          const { error: rulesError } = await supabase
            .from('kanban_column_rules')
            .insert(rulesToInsert);

          if (rulesError) throw rulesError;
        }

        toast.success('Coluna criada com sucesso');
      } else {
        // Atualizar coluna existente
        const { error: colError } = await supabase
          .from('kanban_columns')
          .update({
            title: editingColumn.title,
            icon: editingColumn.icon,
            background_color: editingColumn.background_color,
            text_color: editingColumn.text_color,
            is_manual_only: editingColumn.is_manual_only,
          })
          .eq('id', editingColumn.id);

        if (colError) throw colError;

        // Deletar regras antigas e inserir novas
        await supabase
          .from('kanban_column_rules')
          .delete()
          .eq('column_id', editingColumn.id);

        if (columnRules.length > 0) {
          const rulesToInsert = columnRules.map((rule, index) => ({
            column_id: editingColumn.id,
            rule_order: index + 1,
            field_name: rule.field_name,
            operator: rule.operator,
            value: rule.value,
            is_active: true,
          }));

          const { error: rulesError } = await supabase
            .from('kanban_column_rules')
            .insert(rulesToInsert);

          if (rulesError) throw rulesError;
        }

        toast.success('Coluna atualizada com sucesso');
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Colunas do Kanban</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-1" /> Nova Coluna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Regras</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {columns.map(column => (
                  <SortableColumnRow
                    key={column.id}
                    column={column}
                    onEdit={openEditDialog}
                    onToggle={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>

        {/* Dialog de Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isNewColumn ? 'Nova Coluna' : 'Editar Coluna'}</DialogTitle>
            </DialogHeader>

            {editingColumn && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Chave (única)</Label>
                    <Input
                      value={editingColumn.key}
                      onChange={(e) => setEditingColumn({ ...editingColumn, key: e.target.value })}
                      placeholder="ex: minha_coluna"
                      disabled={!isNewColumn}
                    />
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editingColumn.title}
                      onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                      placeholder="ex: 📋 Minha Coluna"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editingColumn.background_color || '#ffffff'}
                        onChange={(e) => setEditingColumn({ ...editingColumn, background_color: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={editingColumn.background_color || ''}
                        onChange={(e) => setEditingColumn({ ...editingColumn, background_color: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Ícone</Label>
                    <Input
                      value={editingColumn.icon || ''}
                      onChange={(e) => setEditingColumn({ ...editingColumn, icon: e.target.value })}
                      placeholder="ex: Inbox, AlertCircle"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingColumn.is_manual_only}
                      onCheckedChange={(checked) => setEditingColumn({ ...editingColumn, is_manual_only: checked })}
                    />
                    <Label>Transferência apenas manual</Label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-medium">Regras de Filtro</Label>
                    <Button variant="outline" size="sm" onClick={addRule}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Regra
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    Tasks que atendem a TODAS as regras abaixo serão exibidas nesta coluna.
                  </p>

                  <div className="space-y-2">
                    {columnRules.map((rule, index) => (
                      <div key={rule.id} className="flex gap-2 items-center bg-muted/50 p-2 rounded">
                        <Select
                          value={rule.field_name}
                          onValueChange={(value) => updateRule(index, 'field_name', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={rule.operator}
                          onValueChange={(value) => updateRule(index, 'operator', value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!['is_null', 'is_not_null'].includes(rule.operator) && (
                          <Input
                            value={rule.value || ''}
                            onChange={(e) => updateRule(index, 'value', e.target.value)}
                            placeholder="Valor"
                            className="flex-1"
                          />
                        )}

                        <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {columnRules.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma regra definida. Esta coluna só receberá cards manualmente.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Percent, DollarSign, Play, PlayCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PriceRule {
  id: string;
  name: string;
  rule_type: "fixed" | "adjustment" | "promotion";
  apply_to: "all" | "segment" | "model_tag" | "size";
  segment_tag: string | null;
  model_tag: string | null;
  sizes: string[];
  price_value: number;
  is_percentage: boolean;
  priority: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export function PriceRulesManager() {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    rule_type: "fixed" | "adjustment" | "promotion";
    apply_to: "all" | "segment" | "model_tag" | "size";
    segment_tag: string;
    model_tag: string;
    sizes: string[];
    price_value: number;
    is_percentage: boolean;
    priority: number;
    valid_from: string;
    valid_until: string;
  }>({
    name: "",
    rule_type: "adjustment",
    apply_to: "all",
    segment_tag: "",
    model_tag: "",
    sizes: [],
    price_value: 0,
    is_percentage: false,
    priority: 0,
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from("price_rules")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar regras");
      return;
    }

    setRules((data as PriceRule[]) || []);
  };

  const openEditDialog = (rule: PriceRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      rule_type: rule.rule_type,
      apply_to: rule.apply_to,
      segment_tag: rule.segment_tag || "",
      model_tag: rule.model_tag || "",
      sizes: rule.sizes || [],
      price_value: rule.price_value,
      is_percentage: rule.is_percentage,
      priority: rule.priority,
      valid_from: rule.valid_from || "",
      valid_until: rule.valid_until || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Preencha o nome da regra");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        rule_type: formData.rule_type,
        apply_to: formData.apply_to,
        segment_tag: formData.segment_tag || null,
        model_tag: formData.model_tag || null,
        sizes: formData.sizes,
        price_value: formData.price_value,
        is_percentage: formData.is_percentage,
        priority: formData.priority,
        is_active: true,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (editingRule) {
        // Atualizar regra existente
        const { error } = await supabase
          .from("price_rules")
          .update(payload)
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Regra atualizada com sucesso!");
      } else {
        // Criar nova regra
        const { error } = await supabase.from("price_rules").insert(payload);
        if (error) throw error;
        toast.success("Regra criada com sucesso!");
      }

      setDialogOpen(false);
      loadRules();
      resetForm();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      rule_type: "adjustment",
      apply_to: "all",
      segment_tag: "",
      model_tag: "",
      sizes: [],
      price_value: 0,
      is_percentage: false,
      priority: 0,
      valid_from: "",
      valid_until: "",
    });
    setEditingRule(null);
  };

  const applyRule = async (rule: PriceRule) => {
    setLoading(true);
    
    try {
      let query = supabase.from("shirt_model_variations").select("id, model_id");
      
      // Filtrar por escopo
      if (rule.apply_to === "size" && rule.sizes.length > 0) {
        query = query.in("size", rule.sizes);
      } else if (rule.apply_to === "segment" && rule.segment_tag) {
        // Buscar modelos do segmento
        const { data: models } = await supabase
          .from("shirt_models")
          .select("id")
          .eq("segment_tag", rule.segment_tag);
        
        if (models && models.length > 0) {
          query = query.in("model_id", models.map(m => m.id));
        }
      } else if (rule.apply_to === "model_tag" && rule.model_tag) {
        // Buscar modelos do tipo
        const { data: models } = await supabase
          .from("shirt_models")
          .select("id")
          .eq("model_tag", rule.model_tag);
        
        if (models && models.length > 0) {
          query = query.in("model_id", models.map(m => m.id));
        }
      }
      
      const { data: variations, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      if (!variations || variations.length === 0) {
        toast.error("Nenhuma variação encontrada para aplicar a regra");
        setLoading(false);
        return;
      }

      // Aplicar ajuste
      const adjustmentValue = rule.is_percentage 
        ? null // TODO: calcular percentual baseado no preço base
        : rule.price_value;

      const { error: updateError } = await supabase
        .from("shirt_model_variations")
        .update({ price_adjustment: adjustmentValue })
        .in("id", variations.map(v => v.id));

      if (updateError) throw updateError;

      toast.success(`✅ Regra aplicada a ${variations.length} variações!`);
    } catch (error: any) {
      toast.error(`Erro ao aplicar regra: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyAllActiveRules = async () => {
    setLoading(true);
    const activeRules = rules.filter(r => r.is_active);
    
    for (const rule of activeRules) {
      await applyRule(rule);
    }
    
    toast.success(`✅ ${activeRules.length} regras aplicadas!`);
    setLoading(false);
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("price_rules")
      .update({ is_active: !currentStatus })
      .eq("id", ruleId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    loadRules();
    toast.success("Status atualizado");
  };

  const deleteRule = async (ruleId: string) => {
    const { error } = await supabase
      .from("price_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast.error("Erro ao excluir regra");
      return;
    }

    loadRules();
    toast.success("Regra excluída");
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "fixed": return "Preço Fixo";
      case "adjustment": return "Ajuste";
      case "promotion": return "Promoção";
      default: return type;
    }
  };

  const getApplyToLabel = (applyTo: string) => {
    switch (applyTo) {
      case "all": return "Todos";
      case "segment": return "Segmento";
      case "model_tag": return "Tipo";
      case "size": return "Tamanhos";
      default: return applyTo;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Regras de Preço</CardTitle>
          <CardDescription>
            Configure e aplique regras de preço por tamanho, segmento ou tipo
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={applyAllActiveRules}
            disabled={loading || rules.filter(r => r.is_active).length === 0}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Aplicar Todas Ativas
          </Button>
          <Dialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Editar Regra de Preço" : "Criar Regra de Preço"}
                </DialogTitle>
                <DialogDescription>
                  {editingRule 
                    ? "Modifique a configuração da regra de preço" 
                    : "Configure uma nova regra de preço para seus produtos"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4">
                <div>
                  <Label>Nome da Regra</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Tamanhos Grandes +R$ 20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Regra</Label>
                    <Select
                      value={formData.rule_type}
                      onValueChange={(value: any) => setFormData({ ...formData, rule_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Preço Fixo</SelectItem>
                        <SelectItem value="adjustment">Ajuste</SelectItem>
                        <SelectItem value="promotion">Promoção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Aplicar em</Label>
                    <Select
                      value={formData.apply_to}
                      onValueChange={(value: any) => setFormData({ ...formData, apply_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Produtos</SelectItem>
                        <SelectItem value="segment">Por Segmento</SelectItem>
                        <SelectItem value="model_tag">Por Tipo</SelectItem>
                        <SelectItem value="size">Por Tamanhos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.apply_to === "size" && (
                  <div>
                    <Label>Tamanhos (separe com vírgula)</Label>
                    <Input
                      value={formData.sizes.join(", ")}
                      onChange={(e) => setFormData({
                        ...formData,
                        sizes: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Ex: G1, G2, G3, G4, G5"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_value}
                      onChange={(e) => setFormData({ ...formData, price_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 mt-8">
                    <Switch
                      checked={formData.is_percentage}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_percentage: checked })}
                    />
                    <Label>Percentual (%)</Label>
                  </div>
                </div>

                {formData.rule_type === "promotion" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Válido de</Label>
                      <Input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Válido até</Label>
                      <Input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Prioridade (0 = baixa, 100 = alta)</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {editingRule ? "Atualizar" : "Salvar"} Regra
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Aplicar em</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma regra cadastrada
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getRuleTypeLabel(rule.rule_type)}</Badge>
                  </TableCell>
                  <TableCell>{getApplyToLabel(rule.apply_to)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {rule.is_percentage ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {rule.price_value.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleStatus(rule.id, rule.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => applyRule(rule)}
                      disabled={loading || !rule.is_active}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
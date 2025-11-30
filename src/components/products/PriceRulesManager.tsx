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
import { Plus, Trash2, Percent, DollarSign } from "lucide-react";
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

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Preencha o nome da regra");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("price_rules").insert({
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
      });

      if (error) throw error;

      toast.success("Regra criada com sucesso!");
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
            Configure regras de preço por tamanho, segmento ou tipo de produto
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Regra de Preço</DialogTitle>
              <DialogDescription>
                Configure uma nova regra de preço para seus produtos
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Salvar Regra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <TableCell className="text-right">
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

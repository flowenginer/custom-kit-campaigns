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
  apply_to: "all" | "segment" | "model_tag" | "size" | "gender" | "custom_combination";
  segment_tag: string | null;
  model_tag: string | null;
  model_tags: string[];
  segment_tags: string[];
  sizes: string[];
  genders: string[];
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
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<{
    name: string;
    rule_type: "fixed" | "adjustment" | "promotion";
    apply_to: "all" | "segment" | "model_tag" | "size" | "gender" | "custom_combination";
    segment_tag: string;
    model_tag: string;
    model_tags: string[];
    segment_tags: string[];
    sizes: string[];
    genders: string[];
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
    model_tags: [],
    segment_tags: [],
    sizes: [],
    genders: [],
    price_value: 0,
    is_percentage: false,
    priority: 0,
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    loadRules();
    loadSizes();
    loadTypesAndSegments();
  }, []);

  const loadSizes = async () => {
    const { data } = await supabase
      .from("variation_attributes")
      .select("options")
      .eq("name", "TAMANHO")
      .single();
    
    if (data?.options) {
      setAvailableSizes(data.options);
    }
  };

  const loadTypesAndSegments = async () => {
    // Carregar tipos únicos
    const { data: typesData } = await supabase
      .from("shirt_models")
      .select("model_tag")
      .not("model_tag", "is", null);
    
    const types = [...new Set(typesData?.map(t => t.model_tag).filter(Boolean))] as string[];
    setAvailableTypes(types);

    // Carregar segmentos únicos
    const { data: segmentsData } = await supabase
      .from("shirt_models")
      .select("segment_tag")
      .not("segment_tag", "is", null);
    
    const segments = [...new Set(segmentsData?.map(s => s.segment_tag).filter(Boolean))] as string[];
    setAvailableSegments(segments);
  };

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
      model_tags: rule.model_tags || [],
      segment_tags: rule.segment_tags || [],
      sizes: rule.sizes || [],
      genders: rule.genders || [],
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
        model_tags: formData.model_tags,
        segment_tags: formData.segment_tags,
        sizes: formData.sizes,
        genders: formData.genders,
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
      model_tags: [],
      segment_tags: [],
      sizes: [],
      genders: [],
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
      let modelIds: string[] = [];
      
      // Filtrar por escopo
      if (rule.apply_to === "size" && rule.sizes.length > 0) {
        query = query.in("size", rule.sizes);
      } else if (rule.apply_to === "gender" && rule.genders.length > 0) {
        query = query.in("gender", rule.genders);
      } else if (rule.apply_to === "custom_combination") {
        // Filtrar por tipos selecionados
        if (rule.model_tags?.length > 0) {
          const { data: models } = await supabase
            .from("shirt_models")
            .select("id")
            .in("model_tag", rule.model_tags);
          if (models?.length) {
            modelIds = models.map(m => m.id);
          }
        }
        
        // Filtrar por segmentos selecionados
        if (rule.segment_tags?.length > 0) {
          const { data: models } = await supabase
            .from("shirt_models")
            .select("id")
            .in("segment_tag", rule.segment_tags);
          if (models?.length) {
            if (modelIds.length > 0) {
              // Intersecção dos filtros
              const segmentIds = models.map(m => m.id);
              modelIds = modelIds.filter(id => segmentIds.includes(id));
            } else {
              modelIds = models.map(m => m.id);
            }
          }
        }
        
        // Aplicar filtro de modelos se houver
        if (modelIds.length > 0) {
          query = query.in("model_id", modelIds);
        }
        
        // Filtrar por tamanhos
        if (rule.sizes?.length > 0) {
          query = query.in("size", rule.sizes);
        }
        
        // Filtrar por gêneros
        if (rule.genders?.length > 0) {
          query = query.in("gender", rule.genders);
        }
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

      // Processar em lotes de 500 para evitar erro de URL muito longa
      const BATCH_SIZE = 500;
      const variationIds = variations.map(v => v.id);
      let totalUpdated = 0;

      for (let i = 0; i < variationIds.length; i += BATCH_SIZE) {
        const batch = variationIds.slice(i, i + BATCH_SIZE);
        const { error: updateError } = await supabase
          .from("shirt_model_variations")
          .update({ price_adjustment: adjustmentValue })
          .in("id", batch);

        if (updateError) throw updateError;
        totalUpdated += batch.length;
      }

      toast.success(`✅ Regra aplicada a ${totalUpdated} variações!`);
    } catch (error: any) {
      console.error("Erro ao aplicar regra:", error);
      toast.error(`Erro ao aplicar regra: ${error.message || 'Erro desconhecido'}`);
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
      case "gender": return "Gênero";
      case "custom_combination": return "Combinação Personalizada";
      default: return applyTo;
    }
  };

  const toggleGender = (gender: string) => {
    setFormData({
      ...formData,
      genders: formData.genders.includes(gender)
        ? formData.genders.filter(g => g !== gender)
        : [...formData.genders, gender]
    });
  };

  const toggleSize = (size: string) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.includes(size)
        ? formData.sizes.filter(s => s !== size)
        : [...formData.sizes, size]
    });
  };

  const toggleModelTag = (tag: string) => {
    setFormData({
      ...formData,
      model_tags: formData.model_tags.includes(tag)
        ? formData.model_tags.filter(t => t !== tag)
        : [...formData.model_tags, tag]
    });
  };

  const toggleSegmentTag = (tag: string) => {
    setFormData({
      ...formData,
      segment_tags: formData.segment_tags.includes(tag)
        ? formData.segment_tags.filter(s => s !== tag)
        : [...formData.segment_tags, tag]
    });
  };

  const getTypeLabel = (tag: string) => {
    switch(tag) {
      case "manga_curta": return "👕 Manga Curta";
      case "manga_longa": return "👔 Manga Longa";
      case "regata": return "🥋 Regata";
      case "ziper": return "🧥 Zíper";
      default: return tag;
    }
  };

  const formatSegmentName = (tag: string) => {
    return tag.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
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
                        <SelectItem value="gender">Por Gênero</SelectItem>
                        <SelectItem value="custom_combination">Combinação Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.apply_to === "model_tag" || formData.apply_to === "custom_combination") && (
                  <div>
                    <Label>Tipos de Modelo</Label>
                    <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-md">
                      {availableTypes.map((type) => (
                        <Badge
                          key={type}
                          variant={formData.model_tags.includes(type) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={() => toggleModelTag(type)}
                        >
                          {getTypeLabel(type)}
                        </Badge>
                      ))}
                    </div>
                    {formData.model_tags.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecionados: {formData.model_tags.map(t => getTypeLabel(t)).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {(formData.apply_to === "segment" || formData.apply_to === "custom_combination") && (
                  <div>
                    <Label>Segmentos</Label>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                      {availableSegments.map((segment) => (
                        <Badge
                          key={segment}
                          variant={formData.segment_tags.includes(segment) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={() => toggleSegmentTag(segment)}
                        >
                          {formatSegmentName(segment)}
                        </Badge>
                      ))}
                    </div>
                    {formData.segment_tags.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecionados: {formData.segment_tags.map(s => formatSegmentName(s)).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {(formData.apply_to === "size" || formData.apply_to === "custom_combination") && (
                  <div>
                    <Label>Tamanhos</Label>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                      {availableSizes.map((size) => (
                        <Badge
                          key={size}
                          variant={formData.sizes.includes(size) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={() => toggleSize(size)}
                        >
                          {size}
                        </Badge>
                      ))}
                    </div>
                    {formData.sizes.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecionados: {formData.sizes.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {(formData.apply_to === "gender" || formData.apply_to === "custom_combination") && (
                  <div>
                    <Label>Gêneros</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Masculino", "Feminino", "Infantil"].map((gender) => (
                        <Badge
                          key={gender}
                          variant={formData.genders.includes(gender) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={() => toggleGender(gender)}
                        >
                          {gender === "Masculino" ? "♂ Masculino" : 
                           gender === "Feminino" ? "♀ Feminino" : 
                           "👶 Infantil"}
                        </Badge>
                      ))}
                    </div>
                    {formData.genders.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecionados: {formData.genders.join(", ")}
                      </p>
                    )}
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
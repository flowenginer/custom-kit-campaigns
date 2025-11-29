import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DollarSign, Plus, Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface ProductPrice {
  id: string;
  model_tag: string;
  display_name: string;
  sku_prefix: string;
  base_price: number;
  is_active: boolean;
}

export default function ProductPricing() {
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  
  const [modelTag, setModelTag] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_prices")
        .select("*")
        .order("display_name", { ascending: true });

      if (error) throw error;
      setPrices(data || []);
    } catch (error) {
      console.error("Error loading prices:", error);
      toast.error("Erro ao carregar preços");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!modelTag || !displayName || !skuPrefix || !basePrice) {
        toast.error("Preencha todos os campos");
        return;
      }

      const priceData = {
        model_tag: modelTag,
        display_name: displayName,
        sku_prefix: skuPrefix,
        base_price: parseFloat(basePrice),
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("product_prices")
          .update(priceData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Preço atualizado!");
      } else {
        const { error } = await supabase
          .from("product_prices")
          .insert([priceData]);

        if (error) throw error;
        toast.success("Preço adicionado!");
      }

      resetForm();
      setShowDialog(false);
      loadPrices();
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("Erro ao salvar preço");
    }
  };

  const handleEdit = (price: ProductPrice) => {
    setEditingId(price.id);
    setModelTag(price.model_tag);
    setDisplayName(price.display_name);
    setSkuPrefix(price.sku_prefix);
    setBasePrice(price.base_price.toString());
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este preço?")) return;

    try {
      const { error } = await supabase
        .from("product_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Preço excluído!");
      loadPrices();
    } catch (error) {
      console.error("Error deleting price:", error);
      toast.error("Erro ao excluir preço");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("product_prices")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      loadPrices();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setModelTag("");
    setDisplayName("");
    setSkuPrefix("");
    setBasePrice("");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Preços de Produtos</h1>
          <p className="text-muted-foreground">Configure preços base e SKU automático</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Preço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Preço</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="modelTag">Tag do Modelo *</Label>
                <Input
                  id="modelTag"
                  value={modelTag}
                  onChange={(e) => setModelTag(e.target.value)}
                  placeholder="manga-curta"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tag única para identificar o tipo de produto
                </p>
              </div>

              <div>
                <Label htmlFor="displayName">Nome de Exibição *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Camisa Manga Curta"
                />
              </div>

              <div>
                <Label htmlFor="skuPrefix">Prefixo SKU *</Label>
                <Input
                  id="skuPrefix"
                  value={skuPrefix}
                  onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
                  placeholder="MC"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  SKU será: {skuPrefix || "MC"}-001, {skuPrefix || "MC"}-002, etc.
                </p>
              </div>

              <div>
                <Label htmlFor="basePrice">Preço Base (R$) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="50.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDialog(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tabela de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum preço configurado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Prefixo SKU</TableHead>
                  <TableHead className="text-right">Preço Base</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">{price.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{price.model_tag}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {price.sku_prefix}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {price.base_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={price.is_active}
                        onCheckedChange={(checked) => handleToggleActive(price.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(price)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(price.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona o SKU Automático?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Cada tipo de produto tem um <strong>prefixo único</strong> (ex: MC para Manga Curta)
          </p>
          <p>
            • Ao criar um pedido, o SKU é gerado automaticamente: <code className="bg-muted px-2 py-0.5 rounded">MC-001</code>
          </p>
          <p>
            • O número é sequencial e incrementado automaticamente
          </p>
          <p>
            • Facilita a organização e integração com sistemas de estoque
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

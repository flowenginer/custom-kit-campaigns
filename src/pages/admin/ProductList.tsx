import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { toast } from "sonner";

interface ShirtModel {
  id: string;
  name: string;
  model_tag: string | null;
  segment_tag: string | null;
  photo_main: string;
  base_price: number | null;
}

interface ProductListProps {
  onSelectModel: (id: string, name: string) => void;
  onSwitchToVariations?: () => void;
}

export default function ProductList({ onSelectModel, onSwitchToVariations }: ProductListProps) {
  const [products, setProducts] = useState<ShirtModel[]>([]);
  const [variationCounts, setVariationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shirt_models")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar produtos");
      setLoading(false);
      return;
    }

    setProducts(data || []);
    
    if (data) {
      loadVariationCounts(data.map(p => p.id));
    }
    setLoading(false);
  };

  const loadVariationCounts = async (modelIds: string[]) => {
    const { data, error } = await supabase
      .from("shirt_model_variations")
      .select("model_id")
      .in("model_id", modelIds);

    if (error) return;

    const counts: Record<string, number> = {};
    data?.forEach(v => {
      counts[v.model_id] = (counts[v.model_id] || 0) + 1;
    });
    setVariationCounts(counts);
  };

  const handleSelectProduct = (product: ShirtModel) => {
    setSelectedProductId(product.id);
    onSelectModel(product.id, product.name);
    toast.success(`✅ ${product.name} selecionado`);
    
    // Automaticamente mudar para a aba de variações
    if (onSwitchToVariations) {
      onSwitchToVariations();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Cadastrados</CardTitle>
        <CardDescription>
          Selecione um produto para gerenciar suas variações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Variações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow 
                  key={product.id}
                  className={selectedProductId === product.id ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <img
                      src={product.photo_main}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.model_tag && (
                      <Badge variant="outline">{product.model_tag}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.segment_tag && (
                      <Badge variant="secondary">{product.segment_tag}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.base_price ? `R$ ${product.base_price.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {variationCounts[product.id] || 0} variações
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant={selectedProductId === product.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <Settings className="h-4 w-4" />
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
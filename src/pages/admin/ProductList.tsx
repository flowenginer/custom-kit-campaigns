import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  
  // Filtros
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);

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
      .select("model_id, id")
      .in("model_id", modelIds);

    if (error) {
      console.error("Erro ao carregar variações:", error);
      return;
    }

    // Inicializar todos com 0
    const counts: Record<string, number> = {};
    modelIds.forEach(id => counts[id] = 0);
    
    // Contar variações
    data?.forEach(v => {
      counts[v.model_id] = (counts[v.model_id] || 0) + 1;
    });
    
    setVariationCounts(counts);
  };

  // Carregar opções de filtro
  useEffect(() => {
    const types = [...new Set(products.map(p => p.model_tag).filter(Boolean))] as string[];
    const segments = [...new Set(products.map(p => p.segment_tag).filter(Boolean))] as string[];
    setAvailableTypes(types);
    setAvailableSegments(segments);
  }, [products]);

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    if (filterType !== "all" && product.model_tag !== filterType) return false;
    if (filterSegment !== "all" && product.segment_tag !== filterSegment) return false;
    if (searchText && !product.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterType("all");
    setFilterSegment("all");
    setSearchText("");
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
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os Tipos</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Segmento</Label>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos os Segmentos</option>
                {availableSegments.map(segment => (
                  <option key={segment} value={segment}>{segment}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Pesquisar</Label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nome..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <span className="text-sm text-muted-foreground">
              Mostrando {filteredProducts.length} de {products.length} produtos
            </span>
          </div>
        </div>
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
              filteredProducts.map((product) => (
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
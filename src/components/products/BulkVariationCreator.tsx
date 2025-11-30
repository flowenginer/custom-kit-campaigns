import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface VariationAttribute {
  type: string;
  values: string[];
}

const AVAILABLE_SIZES = ["PP", "P", "M", "G", "GG", "XG", "G1", "G2", "G3", "G4", "G5", "1 ANO", "2 ANOS", "4 ANOS", "6 ANOS", "8 ANOS", "10 ANOS", "12 ANOS", "14 ANOS"];
const AVAILABLE_GENDERS = ["Masculino", "Feminino", "Unissex", "Infantil"];

export function BulkVariationCreator() {
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<"all" | "type" | "segment">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["PP", "P", "M", "G", "GG", "XG"]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(["Masculino", "Feminino"]);
  const [preview, setPreview] = useState<{ products: number; combinations: number; total: number }>({ products: 0, combinations: 0, total: 0 });

  useEffect(() => {
    loadTypes();
    loadSegments();
  }, []);

  useEffect(() => {
    calculatePreview();
  }, [scope, selectedType, selectedSegment, selectedSizes, selectedGenders]);

  const loadTypes = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("model_tag")
      .not("model_tag", "is", null);
    
    if (data) {
      const types = [...new Set(data.map(d => d.model_tag).filter(Boolean))];
      setAvailableTypes(types);
      if (types.length > 0) setSelectedType(types[0]);
    }
  };

  const loadSegments = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("segment_tag")
      .not("segment_tag", "is", null);
    
    if (data) {
      const segments = [...new Set(data.map(d => d.segment_tag).filter(Boolean))];
      setAvailableSegments(segments);
      if (segments.length > 0) setSelectedSegment(segments[0]);
    }
  };

  const calculatePreview = async () => {
    try {
      let query = supabase.from("shirt_models").select("id", { count: "exact", head: true });

      if (scope === "type" && selectedType) {
        query = query.eq("model_tag", selectedType);
      } else if (scope === "segment" && selectedSegment) {
        query = query.eq("segment_tag", selectedSegment);
      }

      const { count } = await query;
      const products = count || 0;
      const combinations = selectedSizes.length * selectedGenders.length;
      const total = products * combinations;

      setPreview({ products, combinations, total });
    } catch (error) {
      console.error("Erro ao calcular preview:", error);
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
  };

  const generateVariations = async () => {
    if (selectedSizes.length === 0 || selectedGenders.length === 0) {
      toast.error("Selecione ao menos um tamanho e um gênero");
      return;
    }

    if (!window.confirm(`Confirma a criação de ${preview.total} variações para ${preview.products} produtos?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log(`[BulkVariation] 🚀 Iniciando criação em massa...`);

      // Buscar produtos
      let query = supabase.from("shirt_models").select("id");

      if (scope === "type" && selectedType) {
        query = query.eq("model_tag", selectedType);
      } else if (scope === "segment" && selectedSegment) {
        query = query.eq("segment_tag", selectedSegment);
      }

      const { data: products, error: productsError } = await query;

      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        toast.error("Nenhum produto encontrado");
        setLoading(false);
        return;
      }

      console.log(`[BulkVariation] ✓ ${products.length} produtos encontrados`);

      // Gerar variações
      const variations = [];
      for (const product of products) {
        for (const size of selectedSizes) {
          for (const gender of selectedGenders) {
            variations.push({
              model_id: product.id,
              size,
              gender: gender === "Masculino" ? "male" : gender === "Feminino" ? "female" : gender === "Infantil" ? "infantil" : "unissex",
              price_adjustment: 0,
              stock_quantity: 0,
              is_active: true,
            });
          }
        }
      }

      console.log(`[BulkVariation] 📦 ${variations.length} variações a serem criadas`);

      // Inserir em lotes de 500
      const BATCH_SIZE = 500;
      let created = 0;
      let skipped = 0;

      for (let i = 0; i < variations.length; i += BATCH_SIZE) {
        const batch = variations.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase
          .from("shirt_model_variations")
          .upsert(batch, { onConflict: "model_id,size,gender", ignoreDuplicates: true })
          .select();

        if (error) {
          console.error(`[BulkVariation] ❌ Erro no lote ${i / BATCH_SIZE + 1}:`, error);
          // Continue com próximo lote ao invés de falhar tudo
          skipped += batch.length;
          continue;
        }

        created += data?.length || 0;
        skipped += batch.length - (data?.length || 0);
        
        console.log(`[BulkVariation] ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length || 0} criadas, ${batch.length - (data?.length || 0)} já existiam`);
      }

      console.log(`[BulkVariation] ✅ Concluído! ${created} criadas, ${skipped} já existiam`);
      
      if (created > 0) {
        toast.success(`✅ ${created} variações criadas com sucesso!${skipped > 0 ? ` (${skipped} já existiam)` : ""}`);
      } else {
        toast.info(`ℹ️ Todas as ${skipped} variações já existiam`);
      }
    } catch (error: any) {
      console.error("[BulkVariation] ❌ Erro:", error);
      toast.error(`Erro ao criar variações: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Criar Variações em Massa
        </CardTitle>
        <CardDescription>
          Configure o escopo de aplicação e combine atributos para gerar variações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Escopo de Aplicação */}
        <div className="space-y-3">
          <h3 className="font-semibold">Escopo de Aplicação</h3>
          <RadioGroup value={scope} onValueChange={(v: any) => setScope(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="scope-all" />
              <Label htmlFor="scope-all">Todos os produtos ({preview.products})</Label>
            </div>
            
            <div className="flex items-center space-x-2 gap-2">
              <RadioGroupItem value="type" id="scope-type" />
              <Label htmlFor="scope-type">Por tipo:</Label>
              <Select value={selectedType} onValueChange={setSelectedType} disabled={scope !== "type"}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 gap-2">
              <RadioGroupItem value="segment" id="scope-segment" />
              <Label htmlFor="scope-segment">Por segmento:</Label>
              <Select value={selectedSegment} onValueChange={setSelectedSegment} disabled={scope !== "segment"}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {availableSegments.map(segment => (
                    <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </RadioGroup>
        </div>

        {/* Atributos */}
        <div className="space-y-4">
          <h3 className="font-semibold">Atributos (selecione múltiplos para mesclar)</h3>
          
          {/* Tamanhos */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">TAMANHO</Label>
            <div className="text-sm text-muted-foreground mb-2">Opções disponíveis:</div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SIZES.map(size => (
                <Badge
                  key={size}
                  variant={selectedSizes.includes(size) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSize(size)}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>

          {/* Gêneros */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">GÊNERO</Label>
            <div className="text-sm text-muted-foreground mb-2">Opções disponíveis:</div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENDERS.map(gender => (
                <Badge
                  key={gender}
                  variant={selectedGenders.includes(gender) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleGender(gender)}
                >
                  {gender}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {preview.total > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Sparkles className="h-4 w-4" />
              PRÉVIA: {preview.total} variações serão criadas
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {preview.combinations} combinações × {preview.products} produtos
            </div>
          </div>
        )}

        {/* Botão Gerar */}
        <Button
          onClick={generateVariations}
          disabled={loading || preview.total === 0}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando variações...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar {preview.total} Variações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

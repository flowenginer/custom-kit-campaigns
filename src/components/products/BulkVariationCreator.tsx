import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown, ChevronRight, User, Users, Baby } from "lucide-react";

// Constantes de tamanhos
const ADULT_STANDARD_SIZES = ["PP", "P", "M", "G", "GG", "XG"];
const ADULT_PLUS_SIZES = ["G1", "G2", "G3", "G4", "G5"];
const INFANT_SIZES = ["1 ANO", "2 ANOS", "4 ANOS", "6 ANOS", "8 ANOS", "10 ANOS", "12 ANOS", "14 ANOS"];

interface GenderConfig {
  enabled: boolean;
  standardSizes: string[];
  standardPrice: number;
  plusSizes: string[];
  plusPrice: number;
}

interface InfantilConfig {
  enabled: boolean;
  sizes: string[];
  price: number;
}

export function BulkVariationCreator() {
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<"all" | "type" | "segment">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [productCount, setProductCount] = useState(0);

  // Configurações por gênero
  const [masculino, setMasculino] = useState<GenderConfig>({
    enabled: true,
    standardSizes: [...ADULT_STANDARD_SIZES],
    standardPrice: 0,
    plusSizes: [...ADULT_PLUS_SIZES],
    plusPrice: 0,
  });

  const [feminino, setFeminino] = useState<GenderConfig>({
    enabled: true,
    standardSizes: [...ADULT_STANDARD_SIZES],
    standardPrice: 0,
    plusSizes: [...ADULT_PLUS_SIZES],
    plusPrice: 0,
  });

  const [infantil, setInfantil] = useState<InfantilConfig>({
    enabled: false,
    sizes: [...INFANT_SIZES],
    price: 0,
  });

  // Estado de abertura dos colapsáveis
  const [openMasculino, setOpenMasculino] = useState(true);
  const [openFeminino, setOpenFeminino] = useState(true);
  const [openInfantil, setOpenInfantil] = useState(false);

  useEffect(() => {
    loadTypes();
    loadSegments();
  }, []);

  useEffect(() => {
    calculateProductCount();
  }, [scope, selectedType, selectedSegment]);

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

  const calculateProductCount = async () => {
    try {
      let query = supabase.from("shirt_models").select("id", { count: "exact", head: true });

      if (scope === "type" && selectedType) {
        query = query.eq("model_tag", selectedType);
      } else if (scope === "segment" && selectedSegment) {
        query = query.eq("segment_tag", selectedSegment);
      }

      const { count } = await query;
      setProductCount(count || 0);
    } catch (error) {
      console.error("Erro ao calcular produtos:", error);
    }
  };

  // Calcular total de variações
  const calculateTotalVariations = () => {
    let total = 0;

    if (masculino.enabled) {
      total += masculino.standardSizes.length + masculino.plusSizes.length;
    }
    if (feminino.enabled) {
      total += feminino.standardSizes.length + feminino.plusSizes.length;
    }
    if (infantil.enabled) {
      total += infantil.sizes.length;
    }

    return total * productCount;
  };

  const toggleSize = (
    config: GenderConfig | InfantilConfig,
    setConfig: React.Dispatch<React.SetStateAction<any>>,
    size: string,
    sizeType: 'standard' | 'plus' | 'infant'
  ) => {
    if ('standardSizes' in config && sizeType === 'standard') {
      const newSizes = config.standardSizes.includes(size)
        ? config.standardSizes.filter(s => s !== size)
        : [...config.standardSizes, size];
      setConfig({ ...config, standardSizes: newSizes });
    } else if ('plusSizes' in config && sizeType === 'plus') {
      const newSizes = config.plusSizes.includes(size)
        ? config.plusSizes.filter(s => s !== size)
        : [...config.plusSizes, size];
      setConfig({ ...config, plusSizes: newSizes });
    } else if ('sizes' in config && sizeType === 'infant') {
      const newSizes = (config as InfantilConfig).sizes.includes(size)
        ? (config as InfantilConfig).sizes.filter(s => s !== size)
        : [...(config as InfantilConfig).sizes, size];
      setConfig({ ...config, sizes: newSizes });
    }
  };

  const selectAllSizes = (
    config: GenderConfig,
    setConfig: React.Dispatch<React.SetStateAction<GenderConfig>>,
    sizeType: 'standard' | 'plus'
  ) => {
    if (sizeType === 'standard') {
      setConfig({ ...config, standardSizes: [...ADULT_STANDARD_SIZES] });
    } else {
      setConfig({ ...config, plusSizes: [...ADULT_PLUS_SIZES] });
    }
  };

  const clearAllSizes = (
    config: GenderConfig,
    setConfig: React.Dispatch<React.SetStateAction<GenderConfig>>,
    sizeType: 'standard' | 'plus'
  ) => {
    if (sizeType === 'standard') {
      setConfig({ ...config, standardSizes: [] });
    } else {
      setConfig({ ...config, plusSizes: [] });
    }
  };

  const generateVariations = async () => {
    const totalVariations = calculateTotalVariations();
    
    if (totalVariations === 0) {
      toast.error("Configure ao menos um gênero com tamanhos selecionados");
      return;
    }

    if (!window.confirm(`Confirma a criação de ${totalVariations} variações para ${productCount} produtos?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log(`[BulkVariation] 🚀 Iniciando criação em massa...`);

      // Buscar produtos com SKU
      let query = supabase.from("shirt_models").select("id, sku");

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

      // Função para gerar SKU COMPLETO da variação (SKU produto + gênero + tamanho)
      const generateVariationSKU = (productSku: string, gender: string, size: string): string => {
        const genderCode = gender === 'male' ? 'M' : gender === 'female' ? 'F' : 'I';
        const sizeCode = size.replace(/\s+/g, '').replace('ANOS', 'A').replace('ANO', 'A').toUpperCase();
        return `${productSku}-${genderCode}-${sizeCode}`;
      };

      // Gerar variações
      const variations: any[] = [];

      for (const product of products) {
        const productSku = product.sku || '';
        
        // Skip se produto não tem SKU
        if (!productSku) {
          console.warn(`[BulkVariation] ⚠️ Produto ${product.id} sem SKU, pulando...`);
          continue;
        }

        // Masculino
        if (masculino.enabled) {
          for (const size of masculino.standardSizes) {
            variations.push({
              model_id: product.id,
              size,
              gender: "male",
              sku_suffix: generateVariationSKU(productSku, "male", size),
              price_adjustment: masculino.standardPrice,
              stock_quantity: 0,
              is_active: true,
            });
          }
          for (const size of masculino.plusSizes) {
            variations.push({
              model_id: product.id,
              size,
              gender: "male",
              sku_suffix: generateVariationSKU(productSku, "male", size),
              price_adjustment: masculino.plusPrice,
              stock_quantity: 0,
              is_active: true,
            });
          }
        }

        // Feminino
        if (feminino.enabled) {
          for (const size of feminino.standardSizes) {
            variations.push({
              model_id: product.id,
              size,
              gender: "female",
              sku_suffix: generateVariationSKU(productSku, "female", size),
              price_adjustment: feminino.standardPrice,
              stock_quantity: 0,
              is_active: true,
            });
          }
          for (const size of feminino.plusSizes) {
            variations.push({
              model_id: product.id,
              size,
              gender: "female",
              sku_suffix: generateVariationSKU(productSku, "female", size),
              price_adjustment: feminino.plusPrice,
              stock_quantity: 0,
              is_active: true,
            });
          }
        }

        // Infantil
        if (infantil.enabled) {
          for (const size of infantil.sizes) {
            variations.push({
              model_id: product.id,
              size,
              gender: "infantil",
              sku_suffix: generateVariationSKU(productSku, "infantil", size),
              price_adjustment: infantil.price,
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
          skipped += batch.length;
          continue;
        }

        created += data?.length || 0;
        skipped += batch.length - (data?.length || 0);
        
        console.log(`[BulkVariation] ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length || 0} criadas`);
      }

      console.log(`[BulkVariation] ✅ Concluído! ${created} criadas, ${skipped} já existiam`);

      // Atualizar base_price dos produtos com o menor preço das variações
      const basePrice = Math.min(
        masculino.enabled && masculino.standardPrice > 0 ? masculino.standardPrice : Infinity,
        feminino.enabled && feminino.standardPrice > 0 ? feminino.standardPrice : Infinity,
        infantil.enabled && infantil.price > 0 ? infantil.price : Infinity
      );

      if (basePrice !== Infinity && basePrice > 0) {
        const productIds = products.filter(p => p.sku).map(p => p.id);
        
        // Atualizar base_price de todos os produtos que ainda não têm preço
        const { error: updateError } = await supabase
          .from("shirt_models")
          .update({ base_price: basePrice })
          .in("id", productIds)
          .is("base_price", null);

        if (updateError) {
          console.error("[BulkVariation] ⚠️ Erro ao atualizar base_price:", updateError);
        } else {
          console.log(`[BulkVariation] ✓ base_price atualizado para R$ ${basePrice}`);
        }
      }
      
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

  const totalVariations = calculateTotalVariations();

  // Componente para seção de tamanhos adulto
  const AdultSizeSection = ({
    config,
    setConfig,
    label,
    icon: Icon,
  }: {
    config: GenderConfig;
    setConfig: React.Dispatch<React.SetStateAction<GenderConfig>>;
    label: string;
    icon: any;
  }) => (
    <div className="space-y-4">
      {/* Tamanhos Padrão */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-sm font-medium">Tamanhos Padrão (PP - XG)</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => selectAllSizes(config, setConfig, 'standard')}
              >
                Selecionar todos
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => clearAllSizes(config, setConfig, 'standard')}
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Preço:</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                value={config.standardPrice || ""}
                onChange={(e) => setConfig({ ...config, standardPrice: parseFloat(e.target.value) || 0 })}
                className="w-28 pl-9"
                placeholder="0,00"
                step="0.01"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ADULT_STANDARD_SIZES.map(size => (
            <Badge
              key={size}
              variant={config.standardSizes.includes(size) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleSize(config, setConfig, size, 'standard')}
            >
              {size}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tamanhos Plus */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-sm font-medium">Tamanhos Plus (G1 - G5)</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => selectAllSizes(config, setConfig, 'plus')}
              >
                Selecionar todos
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => clearAllSizes(config, setConfig, 'plus')}
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Preço:</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                value={config.plusPrice || ""}
                onChange={(e) => setConfig({ ...config, plusPrice: parseFloat(e.target.value) || 0 })}
                className="w-28 pl-9"
                placeholder="0,00"
                step="0.01"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ADULT_PLUS_SIZES.map(size => (
            <Badge
              key={size}
              variant={config.plusSizes.includes(size) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleSize(config, setConfig, size, 'plus')}
            >
              {size}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Criar Variações em Massa
        </CardTitle>
        <CardDescription>
          Configure gêneros, tamanhos e preços para gerar variações automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Escopo de Aplicação */}
        <div className="space-y-3">
          <h3 className="font-semibold">Escopo de Aplicação</h3>
          <RadioGroup value={scope} onValueChange={(v: any) => setScope(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="scope-all" />
              <Label htmlFor="scope-all">Todos os produtos</Label>
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
          <p className="text-sm text-muted-foreground">
            {productCount} produto(s) selecionado(s)
          </p>
        </div>

        {/* Configuração por Gênero */}
        <div className="space-y-4">
          <h3 className="font-semibold">Configuração por Gênero</h3>

          {/* Masculino */}
          <Collapsible open={openMasculino} onOpenChange={setOpenMasculino}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {openMasculino ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Masculino</span>
                    {masculino.enabled && (
                      <Badge variant="secondary" className="ml-2">
                        {masculino.standardSizes.length + masculino.plusSizes.length} tamanhos
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label className="text-sm text-muted-foreground">Ativar</Label>
                    <Switch
                      checked={masculino.enabled}
                      onCheckedChange={(checked) => setMasculino({ ...masculino, enabled: checked })}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {masculino.enabled && (
                  <div className="p-4 border-t">
                    <AdultSizeSection config={masculino} setConfig={setMasculino} label="Masculino" icon={User} />
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Feminino */}
          <Collapsible open={openFeminino} onOpenChange={setOpenFeminino}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {openFeminino ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Users className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">Feminino</span>
                    {feminino.enabled && (
                      <Badge variant="secondary" className="ml-2">
                        {feminino.standardSizes.length + feminino.plusSizes.length} tamanhos
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label className="text-sm text-muted-foreground">Ativar</Label>
                    <Switch
                      checked={feminino.enabled}
                      onCheckedChange={(checked) => setFeminino({ ...feminino, enabled: checked })}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {feminino.enabled && (
                  <div className="p-4 border-t">
                    <AdultSizeSection config={feminino} setConfig={setFeminino} label="Feminino" icon={Users} />
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Infantil */}
          <Collapsible open={openInfantil} onOpenChange={setOpenInfantil}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {openInfantil ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Baby className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Infantil</span>
                    {infantil.enabled && (
                      <Badge variant="secondary" className="ml-2">
                        {infantil.sizes.length} tamanhos
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label className="text-sm text-muted-foreground">Ativar</Label>
                    <Switch
                      checked={infantil.enabled}
                      onCheckedChange={(checked) => {
                        setInfantil({ ...infantil, enabled: checked });
                        if (checked) setOpenInfantil(true);
                      }}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {infantil.enabled && (
                  <div className="p-4 border-t">
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Label className="text-sm font-medium">Tamanhos Infantil</Label>
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() => setInfantil({ ...infantil, sizes: [...INFANT_SIZES] })}
                            >
                              Selecionar todos
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={() => setInfantil({ ...infantil, sizes: [] })}
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Preço:</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              type="number"
                              value={infantil.price || ""}
                              onChange={(e) => setInfantil({ ...infantil, price: parseFloat(e.target.value) || 0 })}
                              className="w-28 pl-9"
                              placeholder="0,00"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {INFANT_SIZES.map(size => (
                          <Badge
                            key={size}
                            variant={infantil.sizes.includes(size) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleSize(infantil, setInfantil, size, 'infant')}
                          >
                            {size}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Preview */}
        {totalVariations > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Sparkles className="h-4 w-4" />
              PRÉVIA: {totalVariations} variações serão criadas
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {productCount} produto(s) × variações configuradas
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {masculino.enabled && (
                <div>👤 Masculino: {masculino.standardSizes.length} padrão (R$ {masculino.standardPrice.toFixed(2)}) + {masculino.plusSizes.length} plus (R$ {masculino.plusPrice.toFixed(2)})</div>
              )}
              {feminino.enabled && (
                <div>👩 Feminino: {feminino.standardSizes.length} padrão (R$ {feminino.standardPrice.toFixed(2)}) + {feminino.plusSizes.length} plus (R$ {feminino.plusPrice.toFixed(2)})</div>
              )}
              {infantil.enabled && (
                <div>👶 Infantil: {infantil.sizes.length} tamanhos (R$ {infantil.price.toFixed(2)})</div>
              )}
            </div>
          </div>
        )}

        {/* Botão Gerar */}
        <Button
          onClick={generateVariations}
          disabled={loading || totalVariations === 0}
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
              Gerar {totalVariations} Variações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

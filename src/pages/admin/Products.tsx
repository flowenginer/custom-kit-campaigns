import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Settings, DollarSign, Ruler } from "lucide-react";
import { VariationBuilder } from "@/components/products/VariationBuilder";
import { PriceRulesManager } from "@/components/products/PriceRulesManager";
import { DimensionPresetsManager } from "@/components/products/DimensionPresetsManager";
import ProductList from "./ProductList";

export default function Products() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie produtos, variações, preços e dimensões
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Lista de Produtos
          </TabsTrigger>
          <TabsTrigger value="variations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Variações
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Regras de Preço
          </TabsTrigger>
          <TabsTrigger value="dimensions" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dimensões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ProductList
            onSelectModel={(id, name) => {
              setSelectedModelId(id);
              setSelectedModelName(name);
            }}
          />
        </TabsContent>

        <TabsContent value="variations">
          {selectedModelId ? (
            <VariationBuilder
              modelId={selectedModelId}
              modelName={selectedModelName}
            />
          ) : (
            <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
              Selecione um produto na aba "Lista de Produtos" para gerenciar suas variações
            </div>
          )}
        </TabsContent>

        <TabsContent value="prices">
          <PriceRulesManager />
        </TabsContent>

        <TabsContent value="dimensions">
          <DimensionPresetsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

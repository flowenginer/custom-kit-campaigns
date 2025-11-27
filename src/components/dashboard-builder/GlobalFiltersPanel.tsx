import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { WidgetFilter } from "@/types/dashboard";

interface GlobalFiltersPanelProps {
  filters: WidgetFilter[];
  onFiltersChange: (filters: WidgetFilter[]) => void;
  availableFields: Array<{ name: string; label: string; type: string }>;
}

export const GlobalFiltersPanel = ({ filters, onFiltersChange, availableFields }: GlobalFiltersPanelProps) => {
  const addFilter = () => {
    onFiltersChange([
      ...filters,
      { field: "", operator: "=", value: "" }
    ]);
  };

  const updateFilter = (index: number, updates: Partial<WidgetFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onFiltersChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  if (filters.length === 0) {
    return (
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Nenhum filtro global aplicado</span>
          </div>
          <Button onClick={addFilter} variant="outline" size="sm">
            Adicionar Filtro
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filtros Globais</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={addFilter} variant="outline" size="sm">
            Adicionar
          </Button>
          <Button onClick={clearAllFilters} variant="ghost" size="sm">
            Limpar Todos
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Campo</Label>
              <Select
                value={filter.field}
                onValueChange={(value) => updateFilter(index, { field: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Label className="text-xs">Operador</Label>
              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(index, { operator: value as WidgetFilter["operator"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="=">=</SelectItem>
                  <SelectItem value="!=">≠</SelectItem>
                  <SelectItem value=">">{">"}</SelectItem>
                  <SelectItem value="<">{"<"}</SelectItem>
                  <SelectItem value=">=">{">="}</SelectItem>
                  <SelectItem value="<=">{"<="}</SelectItem>
                  <SelectItem value="like">Contém</SelectItem>
                  <SelectItem value="ilike">Contém (ignorar maiúsculas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-xs">Valor</Label>
              <Input
                value={filter.value as string}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                placeholder="Valor do filtro"
              />
            </div>

            <Button
              onClick={() => removeFilter(index)}
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

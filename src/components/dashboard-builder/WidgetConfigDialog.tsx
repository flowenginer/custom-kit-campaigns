import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Widget, WidgetType, ChartType, AggregationType } from "@/types/dashboard";
import { DataSource } from "@/hooks/useDataSources";
import { BarChart3, LineChart, PieChart, Table2, Gauge } from "lucide-react";

interface WidgetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSource: DataSource | null;
  onSave: (widget: Partial<Widget>) => void;
  editWidget?: Widget | null;
}

export const WidgetConfigDialog = ({
  open,
  onOpenChange,
  dataSource,
  onSave,
  editWidget,
}: WidgetConfigDialogProps) => {
  const [step, setStep] = useState(1);
  const [widgetType, setWidgetType] = useState<WidgetType>(editWidget?.type || "metric");
  const [field, setField] = useState(editWidget?.query_config.field || "");
  const [aggregation, setAggregation] = useState<AggregationType>(editWidget?.query_config.aggregation || "count");
  const [title, setTitle] = useState(editWidget?.display_config.title || "");
  const [chartType, setChartType] = useState<ChartType>(editWidget?.display_config.chartType || "bar");

  const handleSave = () => {
    const widget: Partial<Widget> = {
      id: editWidget?.id || crypto.randomUUID(),
      type: widgetType,
      query_config: {
        table: dataSource?.table_name || "",
        field: field || "*",
        aggregation: widgetType === "metric" || widgetType === "progress" ? aggregation : undefined,
      },
      display_config: {
        title: title || `Widget ${widgetType}`,
        chartType: widgetType === "chart" ? chartType : undefined,
      },
      position: editWidget?.position || {
        x: 0,
        y: 0,
        w: widgetType === "metric" ? 1 : 2,
        h: widgetType === "metric" ? 1 : 2,
      },
    };

    onSave(widget);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setWidgetType("metric");
    setField("");
    setAggregation("count");
    setTitle("");
    setChartType("bar");
  };

  const widgetTypes = [
    { value: "metric", label: "Métrica", icon: Gauge },
    { value: "chart", label: "Gráfico", icon: BarChart3 },
    { value: "table", label: "Tabela", icon: Table2 },
    { value: "progress", label: "Progresso", icon: PieChart },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editWidget ? "Editar Widget" : "Adicionar Widget"}</DialogTitle>
          <DialogDescription>
            Passo {step} de 3: {step === 1 ? "Tipo" : step === 2 ? "Dados" : "Visual"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {widgetTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={widgetType === type.value ? "default" : "outline"}
                  className="h-24 flex-col gap-2"
                  onClick={() => setWidgetType(type.value as WidgetType)}
                >
                  <type.icon className="h-6 w-6" />
                  <span>{type.label}</span>
                </Button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campo</Label>
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSource?.available_fields.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(widgetType === "metric" || widgetType === "progress") && (
                <div className="space-y-2">
                  <Label>Agregação</Label>
                  <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Contar</SelectItem>
                      <SelectItem value="sum">Somar</SelectItem>
                      <SelectItem value="avg">Média</SelectItem>
                      <SelectItem value="min">Mínimo</SelectItem>
                      <SelectItem value="max">Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título do widget"
                />
              </div>

              {widgetType === "chart" && (
                <div className="space-y-2">
                  <Label>Tipo de Gráfico</Label>
                  <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Barras</SelectItem>
                      <SelectItem value="line">Linha</SelectItem>
                      <SelectItem value="area">Área</SelectItem>
                      <SelectItem value="pie">Pizza</SelectItem>
                      <SelectItem value="donut">Rosca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Próximo</Button>
          ) : (
            <Button onClick={handleSave}>{editWidget ? "Salvar" : "Adicionar"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

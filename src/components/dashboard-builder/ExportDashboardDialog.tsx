import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { exportToPDF, exportToPNG, exportToCSV } from "@/lib/dashboardExport";
import { FileDown, Image, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardName: string;
}

type ExportFormat = "pdf" | "png" | "csv";

export const ExportDashboardDialog = ({
  open,
  onOpenChange,
  dashboardName,
}: ExportDashboardDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const fileName = dashboardName || "dashboard";

    try {
      switch (format) {
        case "pdf":
          await exportToPDF("dashboard-grid", `${fileName}.pdf`);
          toast.success("Dashboard exportado como PDF!");
          break;
        case "png":
          await exportToPNG("dashboard-grid", `${fileName}.png`);
          toast.success("Dashboard exportado como PNG!");
          break;
        case "csv":
          toast.info("Exportação CSV em desenvolvimento");
          break;
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao exportar dashboard");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Dashboard</DialogTitle>
          <DialogDescription>
            Escolha o formato para exportar seu dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-sm text-muted-foreground">
                        Documento para impressão e compartilhamento
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">PNG</div>
                      <div className="text-sm text-muted-foreground">
                        Imagem de alta qualidade
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer opacity-50">
                <RadioGroupItem value="csv" id="csv" disabled />
                <Label htmlFor="csv" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">CSV (Em breve)</div>
                      <div className="text-sm text-muted-foreground">
                        Dados brutos para análise
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

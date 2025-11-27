import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDynamicQuery } from "@/hooks/useDynamicQuery";
import { Widget } from "@/types/dashboard";
import { Loader2 } from "lucide-react";

interface TableWidgetProps {
  widget: Widget;
  globalFilters?: any[];
}

export const TableWidget = ({ widget, globalFilters = [] }: TableWidgetProps) => {
  const { data, isLoading, error } = useDynamicQuery(widget.query_config, true, globalFilters);

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <p className="text-sm text-destructive">Erro ao carregar dados</p>
      </Card>
    );
  }

  const tableData = data?.data || [];
  
  if (tableData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {widget.display_config.title}
        </h3>
        <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
      </Card>
    );
  }

  const columns = Object.keys(tableData[0]);

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {widget.display_config.title}
      </h3>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="capitalize">
                  {col.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row: any, idx: number) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col}>
                    {typeof row[col] === "object" 
                      ? JSON.stringify(row[col]) 
                      : row[col]?.toString() || "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

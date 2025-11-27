import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DisplayConfig } from "@/types/dashboard";

interface TableWidgetProps {
  data: any[];
  config: DisplayConfig;
  fields: string[];
  isLoading?: boolean;
}

export const TableWidget = ({
  data,
  config,
  fields,
  isLoading,
}: TableWidgetProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (value instanceof Date) return value.toLocaleDateString("pt-BR");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        {config.description && (
          <p className="text-xs text-muted-foreground">{config.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map((field) => (
                  <TableHead key={field} className="text-xs">
                    {field}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {fields.map((field) => (
                    <TableCell key={field} className="text-xs">
                      {formatValue(row[field])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CrossData {
  utm_source: string;
  utm_medium: string;
  segment_name: string;
  total_leads: number;
  total_orders: number;
  conversion_rate: number;
}

interface CrossAnalysisTableProps {
  data: CrossData[];
}

export const CrossAnalysisTable = ({ data }: CrossAnalysisTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>UTM Source</TableHead>
            <TableHead>UTM Medium</TableHead>
            <TableHead>Segmento Escolhido</TableHead>
            <TableHead className="text-right">Total Leads</TableHead>
            <TableHead className="text-right">Conversões</TableHead>
            <TableHead className="text-right">Taxa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {row.utm_source || "-"}
                </TableCell>
                <TableCell>{row.utm_medium || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.segment_name || "Sem segmento"}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.total_leads}</TableCell>
                <TableCell className="text-right">{row.total_orders}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-medium ${
                      row.conversion_rate >= 40
                        ? "text-green-600"
                        : row.conversion_rate >= 20
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {row.conversion_rate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

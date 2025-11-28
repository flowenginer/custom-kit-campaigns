import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DeleteRecord {
  id: string;
  task_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  reviewed_by: string;
  reviewed_at: string;
  status: string;
  rejection_reason?: string;
  customer_name?: string;
  requester_name?: string;
  reviewer_name?: string;
}

export const DeleteApprovalsHistory = () => {
  const [records, setRecords] = useState<DeleteRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DeleteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_delete_requests")
        .select(`
          *,
          requester:profiles!pending_delete_requests_requested_by_fkey(full_name),
          reviewer:profiles!pending_delete_requests_reviewed_by_fkey(full_name),
          task:design_tasks!pending_delete_requests_task_id_fkey(
            id,
            orders(customer_name)
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false });

      if (error) throw error;

      const formatted = data?.map((rec: any) => ({
        id: rec.id,
        task_id: rec.task_id,
        reason: rec.reason,
        requested_by: rec.requested_by,
        requested_at: rec.requested_at,
        reviewed_by: rec.reviewed_by,
        reviewed_at: rec.reviewed_at,
        status: rec.status,
        rejection_reason: rec.rejection_reason,
        customer_name: rec.task?.orders?.customer_name || "Cliente não encontrado",
        requester_name: rec.requester?.full_name || "Vendedor",
        reviewer_name: rec.reviewer?.full_name || "Admin",
      })) || [];

      setRecords(formatted);
      setFilteredRecords(formatted);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de exclusões");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const channel = supabase
      .channel("delete_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_delete_requests",
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, selectedVendor, selectedStatus, startDate, endDate]);

  const applyFilters = () => {
    let filtered = [...records];

    if (selectedVendor !== "all") {
      filtered = filtered.filter((r) => r.requester_name === selectedVendor);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    if (startDate) {
      filtered = filtered.filter(
        (r) => new Date(r.reviewed_at) >= startDate
      );
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (r) => new Date(r.reviewed_at) <= endOfDay
      );
    }

    setFilteredRecords(filtered);
  };

  const uniqueVendors = Array.from(
    new Set(records.map((r) => r.requester_name))
  ).sort();

  const handleDateChange = (type: "start" | "end", date: Date | undefined) => {
    if (type === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {uniqueVendors.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange("start", date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => handleDateChange("end", date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
              >
                Todos
              </Button>
              <Button
                variant={selectedStatus === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("approved")}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovados
              </Button>
              <Button
                variant={selectedStatus === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("rejected")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Revisão</TableHead>
                <TableHead>Revisor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.customer_name}
                    </TableCell>
                    <TableCell>{record.requester_name}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={record.reason}>
                        {record.reason}
                      </div>
                      {record.status === "rejected" && record.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={record.rejection_reason}>
                          Motivo rejeição: {record.rejection_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(record.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {record.status === "approved" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(record.reviewed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{record.reviewer_name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

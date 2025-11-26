import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApprovalRecord {
  id: string;
  customer_name: string;
  requester_name: string;
  requester_id: string;
  requested_at: string;
  status: string;
  reviewed_at: string | null;
  reviewer_name: string | null;
  final_priority: string | null;
  requested_priority: string;
  rejection_reason: string | null;
  urgent_reason_label: string | null;
}

export const ApprovalsHistory = () => {
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ApprovalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    loadHistory();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("approvals_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_urgent_requests",
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

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_urgent_requests")
        .select(`
          id,
          request_data,
          requested_at,
          status,
          reviewed_at,
          requested_priority,
          final_priority,
          rejection_reason,
          requested_by,
          reviewed_by,
          urgent_reason_id,
          urgent_reasons (
            label
          ),
          requester:profiles!pending_urgent_requests_requested_by_fkey (
            full_name
          ),
          reviewer:profiles!pending_urgent_requests_reviewed_by_fkey (
            full_name
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false });

      if (error) throw error;

      const formattedRecords: ApprovalRecord[] = (data || []).map((record) => ({
        id: record.id,
        customer_name: (record.request_data as any)?.customer_name || "N/A",
        requester_name: (record.requester as any)?.full_name || "N/A",
        requester_id: record.requested_by || "",
        requested_at: record.requested_at || "",
        status: record.status,
        reviewed_at: record.reviewed_at,
        reviewer_name: (record.reviewer as any)?.full_name || "N/A",
        final_priority: record.final_priority,
        requested_priority: record.requested_priority,
        rejection_reason: record.rejection_reason,
        urgent_reason_label: (record.urgent_reasons as any)?.label || null,
      }));

      setRecords(formattedRecords);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Filter by vendor
    if (selectedVendor !== "all") {
      filtered = filtered.filter((r) => r.requester_id === selectedVendor);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(
        (r) => new Date(r.requested_at) >= startDate
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (r) => new Date(r.requested_at) <= endOfDay
      );
    }

    setFilteredRecords(filtered);
  };

  const getPriorityLabel = (priority: string | null) => {
    if (!priority) return "N/A";
    const labels: Record<string, string> = {
      low: "Baixa",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return "bg-muted";
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      normal: "bg-gray-100 text-gray-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-muted";
  };

  // Get unique vendors for filter
  const uniqueVendors = Array.from(
    new Map(
      records.map((r) => [r.requester_id, { id: r.requester_id, name: r.requester_name }])
    ).values()
  );

  const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Vendedor</label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vendedores</SelectItem>
                    {uniqueVendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onDateChange={handleDateChange}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
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
                  <CheckCircle2 className="h-4 w-4 mr-1" />
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
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredRecords.length} {filteredRecords.length === 1 ? "registro encontrado" : "registros encontrados"}
      </div>

      {/* History Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Solicitação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead>Prioridade Final</TableHead>
                  <TableHead>Revisor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.customer_name}</TableCell>
                      <TableCell>{record.requester_name}</TableCell>
                      <TableCell>
                        {record.urgent_reason_label || (
                          <span className="text-muted-foreground text-xs">Sem motivo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.requested_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {record.status === "approved" ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeitado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.reviewed_at
                          ? format(new Date(record.reviewed_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(record.final_priority)}>
                          {getPriorityLabel(record.final_priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.reviewer_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

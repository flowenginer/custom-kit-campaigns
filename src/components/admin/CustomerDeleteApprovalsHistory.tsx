import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

interface HistoryRecord {
  id: string;
  customer_name: string;
  vendor_name: string;
  reason: string;
  requested_at: string;
  reviewed_at: string;
  status: string;
  reviewer_name: string | null;
  rejection_reason: string | null;
}

export const CustomerDeleteApprovalsHistory = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("pending_customer_delete_requests")
      .select(`
        *,
        customers (name),
        requester:profiles!requested_by (full_name),
        reviewer:profiles!reviewed_by (full_name)
      `)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar histórico");
      return;
    }

    const formatted: HistoryRecord[] = data.map((req: any) => ({
      id: req.id,
      customer_name: req.customers?.name || "N/A",
      vendor_name: req.requester?.full_name || "N/A",
      reason: req.reason,
      requested_at: req.requested_at,
      reviewed_at: req.reviewed_at,
      status: req.status,
      reviewer_name: req.reviewer?.full_name || null,
      rejection_reason: req.rejection_reason,
    }));

    setRecords(formatted);

    // Extract unique vendors
    const uniqueVendors = Array.from(
      new Map(
        formatted.map((r) => [r.vendor_name, { id: r.vendor_name, name: r.vendor_name }])
      ).values()
    );
    setVendors(uniqueVendors);

    setLoading(false);
  };

  useEffect(() => {
    loadHistory();

    const channel = supabase
      .channel("customer_delete_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_customer_delete_requests",
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
  }, [records, selectedVendor, selectedStatus, dateFrom, dateTo]);

  const applyFilters = () => {
    let filtered = [...records];

    if (selectedVendor !== "all") {
      filtered = filtered.filter((r) => r.vendor_name === selectedVendor);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (r) => new Date(r.reviewed_at) >= dateFrom
      );
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.reviewed_at) <= endOfDay);
    }

    setFilteredRecords(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.name}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum registro encontrado
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Revisado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revisor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.customer_name}</TableCell>
                  <TableCell>{record.vendor_name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={record.reason}>
                    {record.reason}
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.requested_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.reviewed_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {record.status === "approved" ? (
                      <Badge variant="default">Aprovado</Badge>
                    ) : (
                      <Badge variant="destructive">Rejeitado</Badge>
                    )}
                  </TableCell>
                  <TableCell>{record.reviewer_name || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search } from "lucide-react";

interface ModificationHistory {
  id: string;
  task_id: string;
  description: string;
  requested_by: string;
  requested_at: string;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  requester_name?: string;
  reviewer_name?: string;
  customer_name?: string;
}

export const ModificationApprovalsHistory = () => {
  const [history, setHistory] = useState<ModificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadHistory();

    const channel = supabase
      .channel("modification_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_modification_requests",
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

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_modification_requests")
        .select(`
          *,
          requester:profiles!pending_modification_requests_requested_by_fkey(full_name),
          reviewer:profiles!pending_modification_requests_reviewed_by_fkey(full_name),
          task:design_tasks!pending_modification_requests_task_id_fkey(
            orders(customer_name)
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false });

      if (error) throw error;

      const formatted: ModificationHistory[] = (data || []).map((req: any) => ({
        id: req.id,
        task_id: req.task_id,
        description: req.description,
        requested_by: req.requested_by,
        requested_at: req.requested_at,
        status: req.status,
        rejection_reason: req.rejection_reason,
        reviewed_by: req.reviewed_by,
        reviewed_at: req.reviewed_at,
        requester_name: req.requester?.full_name || "Desconhecido",
        reviewer_name: req.reviewer?.full_name || "Desconhecido",
        customer_name: req.task?.orders?.customer_name || "N/A",
      }));

      setHistory(formatted);
    } catch (error) {
      console.error("Error loading modification history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (selectedVendor !== "all" && item.requested_by !== selectedVendor) return false;
    if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
    if (searchQuery && !item.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const uniqueVendors = Array.from(
    new Set(history.map((h) => h.requester_name).filter(Boolean))
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por vendedor" />
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Revisado Por</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customer_name}</TableCell>
                  <TableCell>{item.requester_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "approved" ? "default" : "destructive"}
                    >
                      {item.status === "approved" ? "Aprovado" : "Rejeitado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.reviewer_name}</TableCell>
                  <TableCell>
                    {item.reviewed_at
                      ? format(new Date(item.reviewed_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

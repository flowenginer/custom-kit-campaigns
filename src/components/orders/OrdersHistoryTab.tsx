import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, History, CheckCircle2, Clock, ExternalLink, Image } from "lucide-react";
import { format, startOfDay, subDays, subWeeks, subMonths, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";

interface ChangeRequestHistory {
  id: string;
  task_id: string;
  description: string;
  source: string;
  created_at: string;
  resolved_at: string | null;
  mockup_url: string | null;
  attachments: any;
  customer_name: string | null;
  creator_name: string | null;
}

type DateFilter = "today" | "yesterday" | "week" | "month" | "all";

export function OrdersHistoryTab() {
  const [history, setHistory] = useState<ChangeRequestHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ChangeRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const itemsPerPage = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("change_requests")
        .select(`
          id,
          task_id,
          description,
          source,
          created_at,
          resolved_at,
          mockup_url,
          attachments,
          creator:profiles!change_requests_created_by_fkey(full_name),
          task:design_tasks!change_requests_task_id_fkey(
            order:orders!design_tasks_order_id_fkey(customer_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: ChangeRequestHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        task_id: item.task_id,
        description: item.description,
        source: item.source,
        created_at: item.created_at,
        resolved_at: item.resolved_at,
        mockup_url: item.mockup_url,
        attachments: item.attachments,
        customer_name: item.task?.order?.customer_name || "N/A",
        creator_name: item.creator?.full_name || "Sistema",
      }));

      setHistory(formatted);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Apply filters
  useEffect(() => {
    let filtered = [...history];

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          break;
        case "week":
          startDate = startOfDay(subWeeks(now, 1));
          break;
        case "month":
          startDate = startOfDay(subMonths(now, 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.created_at);
        return isAfter(itemDate, startDate);
      });
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((item) => item.source === sourceFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "resolved") {
        filtered = filtered.filter((item) => item.resolved_at !== null);
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((item) => item.resolved_at === null);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.customer_name?.toLowerCase().includes(query) ||
          item.creator_name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
    setPage(1);
  }, [history, dateFilter, sourceFilter, statusFilter, searchQuery]);

  const paginatedHistory = filteredHistory.slice(0, page * itemsPerPage);
  const hasMore = paginatedHistory.length < filteredHistory.length;

  // Count by customer
  const customerCounts = filteredHistory.reduce((acc, item) => {
    const name = item.customer_name || "N/A";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, solicitante ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="internal">Interno</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{filteredHistory.length}</strong> solicitação(ões)
        </span>
        <span>•</span>
        <span>
          <strong className="text-foreground">{Object.keys(customerCounts).length}</strong> cliente(s)
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando histórico...
          </CardContent>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <History className="h-16 w-16 text-muted-foreground/50" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Nenhuma solicitação encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery || dateFilter !== "all"
                  ? "Tente ajustar os filtros para encontrar o que procura."
                  : "As solicitações de alteração aparecerão aqui."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Cliente</TableHead>
                  <TableHead className="w-[120px]">Solicitante</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Origem</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px]">Data</TableHead>
                  <TableHead className="w-[60px]">Anexo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]" title={item.customer_name || ""}>
                          {item.customer_name}
                        </span>
                        {customerCounts[item.customer_name || "N/A"] > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {customerCounts[item.customer_name || "N/A"]}x
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.creator_name}
                    </TableCell>
                    <TableCell>
                      <p className="truncate max-w-[300px] text-sm" title={item.description}>
                        {item.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.source === "internal" ? "secondary" : "default"}
                        className={
                          item.source === "internal"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        }
                      >
                        {item.source === "internal" ? "Interno" : "Cliente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.resolved_at ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolvido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {item.mockup_url ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setZoomImage(item.mockup_url)}
                        >
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                Carregar mais ({filteredHistory.length - paginatedHistory.length} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageUrl={zoomImage || ""}
        alt="Anexo da solicitação"
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
}

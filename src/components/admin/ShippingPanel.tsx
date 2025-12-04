import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, 
  Wallet, 
  Printer, 
  X, 
  Package, 
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Shipment {
  id: string;
  task_id: string;
  melhor_envio_id: string;
  service_name: string;
  carrier_name: string;
  price: number;
  tracking_code: string | null;
  label_url: string | null;
  status: string;
  status_history: any[];
  created_at: string;
  posted_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  design_tasks?: {
    id: string;
    order_number: string | null;
    orders?: {
      customer_name: string;
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando', color: 'bg-yellow-500/10 text-yellow-600', icon: <Clock className="h-3 w-3" /> },
  released: { label: 'Liberado', color: 'bg-blue-500/10 text-blue-600', icon: <Package className="h-3 w-3" /> },
  posted: { label: 'Postado', color: 'bg-purple-500/10 text-purple-600', icon: <Truck className="h-3 w-3" /> },
  in_transit: { label: 'Em Trânsito', color: 'bg-indigo-500/10 text-indigo-600', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Entregue', color: 'bg-green-500/10 text-green-600', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600', icon: <XCircle className="h-3 w-3" /> },
  undelivered: { label: 'Não Entregue', color: 'bg-orange-500/10 text-orange-600', icon: <XCircle className="h-3 w-3" /> },
};

export function ShippingPanel() {
  const [balance, setBalance] = useState<number | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [printingLabel, setPrintingLabel] = useState<string | null>(null);
  const [cancellingLabel, setCancellingLabel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBalance();
    fetchShipments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('shipment-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_history' },
        () => {
          fetchShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'get_balance', data: {} },
      });

      if (error) throw error;
      if (data.success) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'list_shipments', data: { limit: 100 } },
      });

      if (error) throw error;
      if (data.success) {
        setShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'sync_status', data: {} },
      });

      if (error) throw error;
      if (data.success) {
        toast.success(data.message);
        fetchShipments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handlePrintLabel = async (melhorEnvioId: string) => {
    setPrintingLabel(melhorEnvioId);
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'print_label', data: { melhor_envio_id: melhorEnvioId } },
      });

      if (error) throw error;
      if (data.success && data.label_url) {
        window.open(data.label_url, '_blank');
        toast.success('Etiqueta gerada com sucesso');
        fetchShipments();
      } else {
        throw new Error(data.error || 'Erro ao gerar etiqueta');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao imprimir etiqueta');
    } finally {
      setPrintingLabel(null);
    }
  };

  const handleCancelLabel = async (melhorEnvioId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta etiqueta? O valor será estornado para sua carteira.')) {
      return;
    }

    setCancellingLabel(melhorEnvioId);
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'cancel_label', data: { melhor_envio_id: melhorEnvioId } },
      });

      if (error) throw error;
      if (data.success) {
        toast.success('Etiqueta cancelada com sucesso');
        fetchShipments();
        fetchBalance();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar etiqueta');
    } finally {
      setCancellingLabel(null);
    }
  };

  const handleRefreshTracking = async (melhorEnvioId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: { action: 'get_tracking', data: { melhor_envio_id: melhorEnvioId } },
      });

      if (error) throw error;
      if (data.success) {
        toast.success('Status atualizado');
        fetchShipments();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar rastreamento');
    }
  };

  const filteredShipments = shipments.filter(s => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return ['pending', 'released'].includes(s.status);
    if (activeTab === 'transit') return ['posted', 'in_transit'].includes(s.status);
    if (activeTab === 'delivered') return s.status === 'delivered';
    if (activeTab === 'cancelled') return s.status === 'cancelled';
    return true;
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => ['pending', 'released'].includes(s.status)).length,
    transit: shipments.filter(s => ['posted', 'in_transit'].includes(s.status)).length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      {/* Balance and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Melhor Envio</p>
                {loadingBalance ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    R$ {balance?.toFixed(2) || '0.00'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Envios</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
                <p className="text-2xl font-bold">{stats.transit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Envios</CardTitle>
              <CardDescription>
                Gerencie e acompanhe todos os envios criados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBalance}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Saldo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncStatus}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar Status
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pendentes ({stats.pending})</TabsTrigger>
              <TabsTrigger value="transit">Em Trânsito ({stats.transit})</TabsTrigger>
              <TabsTrigger value="delivered">Entregues ({stats.delivered})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum envio encontrado</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Transportadora</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Rastreio</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => {
                        const statusInfo = statusConfig[shipment.status] || statusConfig.pending;
                        const customerName = shipment.design_tasks?.orders?.customer_name || '-';
                        const orderNumber = shipment.design_tasks?.order_number || '-';

                        return (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">
                              {orderNumber}
                            </TableCell>
                            <TableCell>{customerName}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{shipment.carrier_name}</p>
                                <p className="text-xs text-muted-foreground">{shipment.service_name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              R$ {shipment.price.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {shipment.tracking_code ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {shipment.tracking_code}
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusInfo.color} gap-1`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(shipment.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Atualizar rastreio"
                                  onClick={() => handleRefreshTracking(shipment.melhor_envio_id)}
                                >
                                  <MapPin className="h-4 w-4" />
                                </Button>

                                {shipment.label_url ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Abrir etiqueta"
                                    onClick={() => window.open(shipment.label_url!, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Imprimir etiqueta"
                                    disabled={printingLabel === shipment.melhor_envio_id || shipment.status === 'cancelled'}
                                    onClick={() => handlePrintLabel(shipment.melhor_envio_id)}
                                  >
                                    {printingLabel === shipment.melhor_envio_id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Printer className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}

                                {!['delivered', 'cancelled', 'posted', 'in_transit'].includes(shipment.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Cancelar etiqueta"
                                    disabled={cancellingLabel === shipment.melhor_envio_id}
                                    onClick={() => handleCancelLabel(shipment.melhor_envio_id)}
                                  >
                                    {cancellingLabel === shipment.melhor_envio_id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

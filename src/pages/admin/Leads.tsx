import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  quantity: string;
  custom_quantity: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  current_step: number;
  completed: boolean;
  created_at: string;
  customization_summary: any;
  campaigns: { name: string };
  orders: { id: string } | null;
  is_online: boolean;
  last_seen: string;
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, utmSourceFilter, onlineStatusFilter, leads]);

  // Subscription para atualizações em tempo real
  useEffect(() => {
    if (isLoading) return; // Só iniciar subscription após carregar dados iniciais

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'leads'
        },
        async (payload) => {
          console.log('Realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            // Novo lead - buscar dados completos com relations
            const { data: newLead } = await supabase
              .from('leads')
              .select(`
                *,
                campaigns(name),
                orders(id)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newLead) {
              setLeads(prev => [newLead, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Lead atualizado - buscar dados completos
            const { data: updatedLead } = await supabase
              .from('leads')
              .select(`
                *,
                campaigns(name),
                orders(id)
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedLead) {
              setLeads(prev => prev.map(lead => 
                lead.id === updatedLead.id ? updatedLead : lead
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            // Lead deletado
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup: remover subscription quando componente desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoading]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          campaigns(name),
          orders(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...leads];

    // Filtro por status
    if (statusFilter === "completed") {
      filtered = filtered.filter(lead => lead.completed);
    } else if (statusFilter === "incomplete") {
      filtered = filtered.filter(lead => !lead.completed);
    }

    // Filtro por UTM source
    if (utmSourceFilter !== "all") {
      filtered = filtered.filter(lead => lead.utm_source === utmSourceFilter);
    }

    // Filtro por status online
    if (onlineStatusFilter === "online") {
      filtered = filtered.filter(lead => lead.is_online);
    } else if (onlineStatusFilter === "offline") {
      filtered = filtered.filter(lead => !lead.is_online);
    }

    setFilteredLeads(filtered);
  };

  const getStepLabel = (step: number) => {
    const labels = [
      "Dados Iniciais",
      "Selecionar Modelo",
      "Personalizar Frente",
      "Personalizar Costas",
      "Manga Direita",
      "Manga Esquerda",
      "Revisão e Envio"
    ];
    return labels[step] || `Etapa ${step}`;
  };

  const getQuantityDisplay = (lead: Lead) => {
    if (lead.quantity === 'custom') {
      return `${lead.custom_quantity} unidades`;
    } else if (lead.quantity === '60+') {
      return '60 ou mais';
    } else {
      return `${lead.quantity} unidades`;
    }
  };

  // Extrair UTM sources únicos para o filtro
  const utmSources = Array.from(new Set(leads.map(lead => lead.utm_source).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Total de {leads.length} leads • {leads.filter(l => l.completed).length} convertidos
            <span className="flex items-center gap-1 text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Ao vivo
            </span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Convertidos</SelectItem>
                <SelectItem value="incomplete">Em Andamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Origem (UTM)</label>
            <Select value={utmSourceFilter} onValueChange={setUtmSourceFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {utmSources.map(source => (
                  <SelectItem key={source} value={source!}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Status Online</label>
            <Select value={onlineStatusFilter} onValueChange={setOnlineStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="online">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Online
                  </span>
                </SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card>
        <CardContent className="p-0">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Etapa Atual</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status Final</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      {lead.is_online ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-green-600 font-medium text-sm">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                          <span className="text-muted-foreground text-sm">Offline</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.campaigns?.name}</TableCell>
                    <TableCell>{getQuantityDisplay(lead)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStepLabel(lead.current_step)}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.utm_source ? (
                        <Badge variant="secondary">{lead.utm_source}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Direto</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {lead.completed ? (
                        <Badge className="bg-green-500">Convertido</Badge>
                      ) : (
                        <Badge variant="outline">Em Andamento</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Lead */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  Dados Pessoais
                  {selectedLead.is_online ? (
                    <Badge className="bg-green-500 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      Online Agora
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Offline (última atividade: {format(new Date(selectedLead.last_seen || selectedLead.created_at), "dd/MM HH:mm", { locale: ptBR })})
                    </Badge>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedLead.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">WhatsApp:</span>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  {selectedLead.email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedLead.email}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Quantidade:</span>
                    <p className="font-medium">{getQuantityDisplay(selectedLead)}</p>
                  </div>
                </div>
              </div>

              {/* Parâmetros UTM */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Origem do Lead</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fonte (Source):</span>
                    <p className="font-medium">{selectedLead.utm_source || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mídia (Medium):</span>
                    <p className="font-medium">{selectedLead.utm_medium || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campanha:</span>
                    <p className="font-medium">{selectedLead.utm_campaign || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Termo:</span>
                    <p className="font-medium">{selectedLead.utm_term || 'Não informado'}</p>
                  </div>
                  {selectedLead.utm_content && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Conteúdo:</span>
                      <p className="font-medium">{selectedLead.utm_content}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progresso */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Progresso no Funil</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Etapa Atual:</span>
                    <Badge>{getStepLabel(selectedLead.current_step)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    {selectedLead.completed ? (
                      <Badge className="bg-green-500">✓ Pedido Finalizado</Badge>
                    ) : (
                      <Badge variant="outline">Em Andamento</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data de Entrada:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo da Personalização */}
              {selectedLead.customization_summary && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Resumo da Personalização</h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>
                      <p className="font-medium">{selectedLead.customization_summary.model || 'Não selecionado'}</p>
                    </div>
                    
                    {selectedLead.customization_summary.front && (
                      <div>
                        <span className="text-muted-foreground font-medium">Frente:</span>
                        <p className="ml-2">Logo: {selectedLead.customization_summary.front.logoType || 'Nenhuma'}</p>
                      </div>
                    )}

                    {selectedLead.customization_summary.back && (
                      <div>
                        <span className="text-muted-foreground font-medium">Costas:</span>
                        <div className="ml-2 space-y-1">
                          {selectedLead.customization_summary.back.logoLarge && <p>• Logo grande</p>}
                          {selectedLead.customization_summary.back.name && (
                            <p>• Nome: {selectedLead.customization_summary.back.nameText}</p>
                          )}
                          {selectedLead.customization_summary.back.sponsors?.length > 0 && (
                            <p>• Patrocinadores: {selectedLead.customization_summary.back.sponsors.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedLead.customization_summary.sleeves && (
                      <div>
                        <span className="text-muted-foreground font-medium">Mangas:</span>
                        <div className="ml-2 space-y-1">
                          {selectedLead.customization_summary.sleeves.right?.text && (
                            <p>• Direita: {selectedLead.customization_summary.sleeves.right.textContent}</p>
                          )}
                          {selectedLead.customization_summary.sleeves.left?.text && (
                            <p>• Esquerda: {selectedLead.customization_summary.sleeves.left.textContent}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Link para Pedido */}
              {selectedLead.orders && (
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✓ Este lead gerou um pedido (ID: {selectedLead.orders.id.slice(0, 8)}...)
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;

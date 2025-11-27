import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Filter, Trash2, Plus, Trash, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

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
  deleted_at?: string | null;
  customization_summary: any;
  campaigns: { name: string };
  orders: { id: string } | null;
  is_online: boolean;
  last_seen: string;
  lead_group_identifier: string | null;
  attempt_number: number | null;
}

const Leads = () => {
  const { isSuperAdmin } = useUserRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<string>("all");
  const [showOnlyFirstAttempt, setShowOnlyFirstAttempt] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const refreshData = useCallback(async () => {
    await loadLeads();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, utmSourceFilter, onlineStatusFilter, showOnlyFirstAttempt, showDeleted, leads]);

  // Verificar status online baseado em last_seen (timeout de 30 segundos)
  useEffect(() => {
    const checkOnlineStatus = () => {
      setLeads(prevLeads => 
        prevLeads.map(lead => {
          const lastSeenDate = new Date(lead.last_seen);
          const now = new Date();
          const diffInSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;
          const isActuallyOnline = diffInSeconds < 30;
          
          // Atualizar apenas se o status mudou
          if (lead.is_online !== isActuallyOnline) {
            return { ...lead, is_online: isActuallyOnline };
          }
          return lead;
        })
      );
    };

    // Verificar a cada 5 segundos
    const intervalId = setInterval(checkOnlineStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

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
          toast.info('Lead atualizado em tempo real', { duration: 2000 });

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
      let query = supabase
        .from("leads")
        .select(`
          *,
          campaigns(name),
          orders(id)
        `)
        .order("created_at", { ascending: false });

      // Filter by deleted status
      if (!showDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // ✅ CALCULAR STATUS ONLINE ANTES DE SETAR NO ESTADO
      const leadsWithCorrectStatus = (data || []).map(lead => {
        const lastSeenDate = new Date(lead.last_seen);
        const now = new Date();
        const diffInSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;
        const isActuallyOnline = diffInSeconds < 30;
        
        return {
          ...lead,
          is_online: isActuallyOnline // Sobrescrever com valor calculado
        };
      });
      
      setLeads(leadsWithCorrectStatus);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...leads];

    // Filter deleted items based on showDeleted toggle
    if (!showDeleted) {
      filtered = filtered.filter(lead => !lead.deleted_at);
    }

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

    // Filtro de primeira tentativa
    if (showOnlyFirstAttempt) {
      filtered = filtered.filter(lead => lead.attempt_number === 1);
    }

    setFilteredLeads(filtered);
  };

  // Função para contar tentativas
  const getLeadAttempts = (groupId: string) => {
    return leads.filter(l => l.lead_group_identifier === groupId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  // Calcular estatísticas de conversão
  const conversionStats = {
    totalLeads: leads.length,
    uniqueLeads: new Set(leads.map(l => l.lead_group_identifier).filter(Boolean)).size,
    totalConversions: leads.filter(l => l.completed).length,
    convertedAtFirstAttempt: leads.filter(l => l.completed && l.attempt_number === 1).length,
    convertedAtSecondAttempt: leads.filter(l => l.completed && l.attempt_number === 2).length,
    convertedAtThirdOrMore: leads.filter(l => l.completed && l.attempt_number && l.attempt_number >= 3).length,
  };

  const getStepLabel = (step: number) => {
    const labels = [
      "Selecionar Tipo",          // 0
      "Informar Nome",             // 1
      "Informar Telefone",         // 2
      "Selecionar Quantidade",     // 3
      "Escolher Modelo",           // 4
      "Personalizar Frente",       // 5
      "Personalizar Costas",       // 6
      "Manga Esquerda",            // 7
      "Manga Direita",             // 8
      "Upload de Logos",           // 9
      "Revisão e Envio"            // 10
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

  const getUniformTypeDisplay = (customizationSummary: any) => {
    if (!customizationSummary || !customizationSummary.uniformType) {
      return '—';
    }
    
    const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
      'ziper': { label: 'Zíper', icon: '🧥', color: 'bg-blue-100 text-blue-700' },
      'manga_longa': { label: 'Manga Longa', icon: '👕', color: 'bg-green-100 text-green-700' },
      'manga_curta': { label: 'Manga Curta', icon: '👔', color: 'bg-purple-100 text-purple-700' },
      'regata': { label: 'Regata', icon: '🎽', color: 'bg-orange-100 text-orange-700' },
      'short': { label: 'Short', icon: '🩳', color: 'bg-yellow-100 text-yellow-700' }
    };
    
    const type = customizationSummary.uniformType;
    const config = typeLabels[type] || { label: type, icon: '👕', color: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o lead "${leadName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      toast.success(`Lead "${leadName}" deletado com sucesso`);
      
      // Reload to reflect changes
      loadLeads();
    } catch (error: any) {
      console.error('Error soft deleting lead:', error);
      toast.error(error.message || 'Erro ao deletar lead');
    }
  };

  const handleRestoreLead = async (leadId: string, leadName: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ deleted_at: null })
        .eq('id', leadId);

      if (error) throw error;

      toast.success(`Lead "${leadName}" restaurado com sucesso`);
      
      // Reload to reflect changes
      loadLeads();
    } catch (error: any) {
      console.error('Error restoring lead:', error);
      toast.error(error.message || 'Erro ao restaurar lead');
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Nenhum lead selecionado");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja deletar ${selectedLeads.length} lead(s)?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", selectedLeads);

      if (error) throw error;

      toast.success(`${selectedLeads.length} lead(s) deletado(s) com sucesso!`);
      setSelectedLeads([]);
      loadLeads();
    } catch (error: any) {
      console.error('Error deleting leads:', error);
      toast.error(error.message || 'Erro ao deletar leads');
    }
  };

  // Extrair UTM sources únicos para o filtro
  const utmSources = Array.from(new Set(leads.map(lead => lead.utm_source).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-40" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
            {leads.filter(l => l.is_online).length > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {leads.filter(l => l.is_online).length} online agora
              </span>
            )}
            <span className="flex items-center gap-1 text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Ao vivo
            </span>
          </p>
        </div>
        
        <RefreshIndicator 
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
      </div>

      {/* Analytics de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics de Conversão</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{conversionStats.uniqueLeads}</p>
            <p className="text-sm text-muted-foreground mt-1">Leads Únicos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{conversionStats.totalConversions}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Convertidos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{conversionStats.convertedAtFirstAttempt}</p>
            <p className="text-sm text-muted-foreground mt-1">1ª Tentativa</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{conversionStats.convertedAtSecondAttempt}</p>
            <p className="text-sm text-muted-foreground mt-1">2ª Tentativa</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {conversionStats.uniqueLeads > 0 
                ? ((conversionStats.totalConversions / conversionStats.uniqueLeads) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Taxa de Conversão</p>
          </div>
        </CardContent>
      </Card>

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

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tentativas</label>
            <Button
              variant={showOnlyFirstAttempt ? "default" : "outline"}
              className="w-full"
              onClick={() => setShowOnlyFirstAttempt(!showOnlyFirstAttempt)}
            >
              {showOnlyFirstAttempt ? "Mostrando apenas 1ª tentativa" : "Todas as tentativas"}
            </Button>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Itens Deletados</label>
            <Button
              variant={showDeleted ? "default" : "outline"}
              className="w-full"
              onClick={() => {
                setShowDeleted(!showDeleted);
                loadLeads();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {showDeleted ? "Mostrando deletados" : "Esconder deletados"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Seleção em Massa - Apenas Super Admin */}
      {filteredLeads.length > 0 && isSuperAdmin && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-leads"
              checked={selectedLeads.length === filteredLeads.length}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all-leads" className="cursor-pointer font-medium">
              Selecionar todos {selectedLeads.length > 0 && `(${selectedLeads.length} selecionados)`}
            </Label>
          </div>
          {selectedLeads.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar Selecionados ({selectedLeads.length})
            </Button>
          )}
        </div>
      )}

      {/* Tabela de Leads */}
      <Card>
        <CardContent className="p-0">
          <Table>
          <TableHeader>
            <TableRow>
              {isSuperAdmin && <TableHead className="w-12"></TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Tentativa</TableHead>
              <TableHead>Tipo de Uniforme</TableHead>
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
                  <TableCell colSpan={isSuperAdmin ? 13 : 12} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="text-5xl">📋</div>
                      {leads.length === 0 ? (
                        <>
                          <p className="font-semibold text-lg">Nenhum lead cadastrado ainda</p>
                          <p className="text-sm max-w-md">
                            Leads aparecerão aqui automaticamente quando alguém acessar o link da campanha e preencher os dados iniciais.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = '/admin/campaigns'}
                            className="mt-2"
                          >
                            Ir para Campanhas
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-lg">Nenhum lead encontrado com os filtros aplicados</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setStatusFilter("all");
                              setUtmSourceFilter("all");
                              setOnlineStatusFilter("all");
                            }}
                            className="mt-2"
                          >
                            Limpar Filtros
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    {isSuperAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {lead.is_online ? (
                        <div className="flex items-center gap-2 status-transition">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-green-600 font-medium text-sm">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 status-transition">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                          <span className="text-muted-foreground text-sm">Offline</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                      {lead.attempt_number && (
                        <Badge variant="secondary">
                          Tentativa #{lead.attempt_number}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getUniformTypeDisplay(lead.customization_summary)}
                    </TableCell>
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
                      <div className="flex items-center justify-end gap-2">
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
                        
                        {lead.deleted_at ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => handleRestoreLead(lead.id, lead.name)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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

              {/* Tipo de Uniforme */}
              {selectedLead.customization_summary?.uniformType && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Tipo de Uniforme Escolhido</h3>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    {getUniformTypeDisplay(selectedLead.customization_summary)}
                  </div>
                </div>
              )}

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

              {/* Histórico de Tentativas */}
              {selectedLead.lead_group_identifier && (() => {
                const attempts = getLeadAttempts(selectedLead.lead_group_identifier);
                return attempts.length > 1 ? (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Histórico de Tentativas ({attempts.length})</h3>
                    <div className="space-y-2">
                      {attempts.map((attempt) => (
                        <div key={attempt.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              Tentativa #{attempt.attempt_number}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {attempt.completed ? (
                              <Badge className="bg-green-500">✓ Convertido</Badge>
                            ) : (
                              <Badge variant="outline">
                                Parou em: {getStepLabel(attempt.current_step)}
                              </Badge>
                            )}
                            {attempt.id === selectedLead.id && (
                              <Badge variant="default">Atual</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

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

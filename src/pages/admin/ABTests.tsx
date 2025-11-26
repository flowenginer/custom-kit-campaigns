import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateABTestDialog } from "@/components/abtest/CreateABTestDialog";
import { ABTest } from "@/types/ab-test";
import { FlaskConical, Copy, Play, Pause, BarChart3, Trash2, ExternalLink } from "lucide-react";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

export default function ABTests() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const { toast } = useToast();

  const refreshData = useCallback(async () => {
    await fetchTests();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar testes",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setTests((data || []) as ABTest[]);
    }
    setLoading(false);
  };

  const copyLink = (uniqueLink: string) => {
    const url = `${window.location.origin}/t/${uniqueLink}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: url
    });
  };

  const toggleStatus = async (test: ABTest) => {
    const newStatus = test.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('ab_tests')
      .update({ 
        status: newStatus,
        paused_at: newStatus === 'paused' ? new Date().toISOString() : null
      })
      .eq('id', test.id);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: newStatus === 'active' ? "Teste reativado" : "Teste pausado"
      });
      fetchTests();
    }
  };

  const deleteTest = async () => {
    if (!deleteTestId) return;

    const { error } = await supabase
      .from('ab_tests')
      .delete()
      .eq('id', deleteTestId);

    if (error) {
      toast({
        title: "Erro ao deletar teste",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Teste deletado"
      });
      fetchTests();
    }
    setDeleteTestId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { label: "Ativo", className: "bg-green-500" },
      paused: { label: "Pausado", className: "bg-yellow-500" },
      completed: { label: "Concluído", className: "bg-blue-500" },
      archived: { label: "Arquivado", className: "bg-gray-500" }
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getProgress = (test: ABTest) => {
    const criteria = test.completion_criteria;
    let progress = 0;
    
    if (criteria.leads) {
      // Calcular baseado em leads (simplificado)
      progress = Math.min((test.total_visits / criteria.leads) * 100, 100);
    } else if (criteria.days) {
      const start = new Date(test.started_at);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      progress = Math.min((elapsed / criteria.days) * 100, 100);
    }
    
    return progress;
  };

  const filterTests = (status?: string) => {
    if (!status) return tests;
    return tests.filter(t => t.status === status);
  };

  const TestCard = ({ test }: { test: ABTest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{test.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>/t/{test.unique_link}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyLink(test.unique_link)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <a
                href={`/t/${test.unique_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </div>
          {getStatusBadge(test.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{getProgress(test).toFixed(0)}%</span>
          </div>
          <Progress value={getProgress(test)} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Visitas</div>
            <div className="text-xl font-bold">{test.total_visits}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Variantes</div>
            <div className="text-xl font-bold">{test.campaigns.length}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Distribuição Configurada</div>
          {test.campaigns.map((campaign: any) => (
            <div key={campaign.campaign_id} className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${campaign.percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {campaign.percentage}%
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {test.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={() => toggleStatus(test)}>
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </Button>
          ) : test.status === 'paused' ? (
            <Button variant="outline" size="sm" onClick={() => toggleStatus(test)}>
              <Play className="h-4 w-4 mr-1" />
              Retomar
            </Button>
          ) : null}
          
          <Button variant="outline" size="sm" disabled>
            <BarChart3 className="h-4 w-4 mr-1" />
            Ver Relatório
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTestId(test.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FlaskConical className="h-8 w-8" />
              Testes A/B
            </h1>
            <p className="text-muted-foreground">
              Compare campanhas e otimize suas conversões
            </p>
          </div>
          <div className="flex gap-2">
            <RefreshIndicator 
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Novo Teste A/B
            </Button>
          </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Testes Ativos</CardDescription>
              <CardTitle className="text-3xl">
                {filterTests('active').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Visitas</CardDescription>
              <CardTitle className="text-3xl">
                {tests.reduce((sum, t) => sum + t.total_visits, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taxa Média de Conversão</CardDescription>
              <CardTitle className="text-3xl">-</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({tests.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativos ({filterTests('active').length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Pausados ({filterTests('paused').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídos ({filterTests('completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Nenhum teste A/B criado</p>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro teste para comparar campanhas
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    Criar Primeiro Teste
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tests.map(test => <TestCard key={test.id} test={test} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterTests('active').map(test => <TestCard key={test.id} test={test} />)}
            </div>
          </TabsContent>

          <TabsContent value="paused" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterTests('paused').map(test => <TestCard key={test.id} test={test} />)}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterTests('completed').map(test => <TestCard key={test.id} test={test} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateABTestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTests}
      />

      <AlertDialog open={!!deleteTestId} onOpenChange={() => setDeleteTestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Teste A/B</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este teste? Esta ação não pode ser desfeita.
              Todos os dados e eventos relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTest} className="bg-destructive">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

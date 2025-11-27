import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, FileText, Zap, MessageSquare, Code2, Workflow, Webhook, Plus, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WebhookConfig {
  id: string;
  name: string;
  webhook_url: string;
  event_type: string;
  is_active: boolean;
  include_customization: boolean;
  created_at: string;
}

const Api = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    event_type: 'lead_abandoned',
    is_active: true,
    include_customization: true,
  });
  
  const BASE_URL = "https://sjznikaxsivaoytefagi.supabase.co/functions/v1";

  const eventTypes = [
    { value: 'lead_abandoned', label: 'Lead Abandonou (saiu sem completar)' },
    { value: 'lead_completed', label: 'Lead Completou (finalizou pedido)' },
    { value: 'lead_returning', label: 'Lead Retornou (segunda visita)' },
    { value: 'step_reached:1', label: 'Chegou no Step 1' },
    { value: 'step_reached:2', label: 'Chegou no Step 2' },
    { value: 'step_reached:3', label: 'Chegou no Step 3' },
    { value: 'step_reached:4', label: 'Chegou no Step 4' },
    { value: 'step_reached:5', label: 'Chegou no Step 5' },
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast.error('Erro ao carregar webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (webhook?: WebhookConfig) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setFormData({
        name: webhook.name,
        webhook_url: webhook.webhook_url,
        event_type: webhook.event_type,
        is_active: webhook.is_active,
        include_customization: webhook.include_customization,
      });
    } else {
      setEditingWebhook(null);
      setFormData({
        name: '',
        webhook_url: '',
        event_type: 'lead_abandoned',
        is_active: true,
        include_customization: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveWebhook = async () => {
    if (!formData.name || !formData.webhook_url) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      if (editingWebhook) {
        const { error } = await supabase
          .from('webhook_configs')
          .update(formData)
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast.success('Webhook atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('webhook_configs')
          .insert([formData]);

        if (error) throw error;
        toast.success('Webhook criado com sucesso!');
      }

      setIsDialogOpen(false);
      loadWebhooks();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error('Erro ao salvar webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Deseja realmente excluir este webhook?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Webhook excluído com sucesso!');
      loadWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Erro ao excluir webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;
      toast.success(`Webhook ${!webhook.is_active ? 'ativado' : 'desativado'}!`);
      loadWebhooks();
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Erro ao alterar status do webhook');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Documentação da API</h1>
          <Badge variant="outline">v1.0</Badge>
        </div>
        <p className="text-muted-foreground">
          API REST para integração com N8n e automação de tarefas de design
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-1">URL Base:</p>
            <div className="flex items-center gap-2">
              <code className="bg-secondary px-3 py-1 rounded text-sm flex-1">
                {BASE_URL}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(BASE_URL, 'base-url')}
              >
                {copiedId === 'base-url' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Autenticação:</p>
            <p className="text-sm text-muted-foreground">
              Não requer autenticação JWT (configurado para uso com N8n)
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="endpoints">
            <FileText className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="use-cases">
            <Zap className="h-4 w-4 mr-2" />
            Casos de Uso
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ENDPOINTS */}
        <TabsContent value="endpoints">
          <Accordion type="single" collapsible className="space-y-2">
            
            {/* ENDPOINT 1: LISTAR TAREFAS */}
            <AccordionItem value="list" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_get">GET</Badge>
                  <span className="font-semibold text-base">Listar Tarefas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      GET {BASE_URL}/task-operations?action=list
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=list`,
                        'url-list'
                      )}
                    >
                      {copiedId === 'url-list' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Retorna uma lista de todas as tarefas de design cadastradas no sistema, incluindo informações do pedido, cliente, modelo da camisa e campanha.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para visualizar todas as tarefas em um dashboard externo</li>
                        <li>Para sincronizar tarefas com outros sistemas</li>
                        <li>Para buscar tarefas com status específico</li>
                        <li>Para listar tarefas atribuídas a um designer específico</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Query String)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">status</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Filtra as tarefas por status.</p>
                          <div className="bg-muted p-3 rounded text-xs space-y-1">
                            <p className="font-semibold">Valores aceitos:</p>
                            <ul className="list-disc list-inside ml-2 space-y-0.5">
                              <li><code>pending</code> - Aguardando designer</li>
                              <li><code>in_progress</code> - Em desenvolvimento</li>
                              <li><code>awaiting_approval</code> - Aguardando aprovação do cliente</li>
                              <li><code>approved</code> - Aprovado pelo cliente</li>
                              <li><code>changes_requested</code> - Cliente solicitou alterações</li>
                              <li><code>completed</code> - Concluído e enviado para produção</li>
                            </ul>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">assigned_to</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Filtra as tarefas atribuídas a um designer específico.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Formato:</strong> UUID do usuário designer</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">📤 Exemplo de Resposta (Success)</h4>
                      <ScrollArea className="h-[300px]">
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
      "status": "pending",
      "priority": "normal",
      "assigned_to": null,
      "current_version": 0,
      "created_at": "2025-11-11T19:23:55.622962+00:00",
      "orders": {
        "customer_name": "João Silva",
        "customer_email": "joao@example.com",
        "customer_phone": "(11) 98765-4321",
        "quantity": 50,
        "shirt_models": {
          "name": "Camisa Futebol Pro"
        }
      },
      "campaigns": {
        "name": "Campanha Futebol 2025"
      }
    }
  ]
}`}
                        </pre>
                      </ScrollArea>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Listar todas as tarefas:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=list" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=list" -H "Content-Type: application/json"`,
                              'list-all'
                            )}
                          >
                            {copiedId === 'list-all' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">2. Filtrar apenas tarefas pendentes:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=list&status=pending" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=list&status=pending" -H "Content-Type: application/json"`,
                              'list-pending'
                            )}
                          >
                            {copiedId === 'list-pending' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">3. Filtrar tarefas de um designer específico:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=list&assigned_to=UUID-DO-DESIGNER" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=list&assigned_to=UUID-DO-DESIGNER" -H "Content-Type: application/json"`,
                              'list-designer'
                            )}
                          >
                            {copiedId === 'list-designer' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">4. Combinar filtros (status + designer):</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=list&status=in_progress&assigned_to=UUID-DO-DESIGNER" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=list&status=in_progress&assigned_to=UUID-DO-DESIGNER" -H "Content-Type: application/json"`,
                              'list-combined'
                            )}
                          >
                            {copiedId === 'list-combined' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 2: VER DETALHES */}
            <AccordionItem value="get" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_get">GET</Badge>
                  <span className="font-semibold text-base">Ver Detalhes de Tarefa (por ID ou Telefone)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      GET {BASE_URL}/task-operations?action=get&task_id=xxx
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=get&task_id=xxx`,
                        'url-get'
                      )}
                    >
                      {copiedId === 'url-get' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Retorna os detalhes completos de uma tarefa específica, incluindo dados do pedido, cliente e campanha. 
                        Pode buscar por <strong>ID da tarefa</strong> ou por <strong>telefone do cliente</strong>.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para verificar o status atual de uma tarefa específica</li>
                        <li>Para obter informações detalhadas antes de atualizar</li>
                        <li>Para validar se uma tarefa existe</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Query String)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">task_id</code>
                            <Badge variant="outline" className="text-xs">Opcional*</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da tarefa que deseja consultar.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Formato:</strong> UUID válido</p>
                            <p><strong>Exemplo:</strong> 7d274d4a-3f52-4e85-b594-ed927ca9f6c1</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">phone</code>
                            <Badge variant="outline" className="text-xs">Opcional*</Badge>
                          </div>
                          <p className="text-sm mb-2">
                            Número de telefone do cliente (com DDD, sem formatação).
                          </p>
                          <p className="text-xs text-muted-foreground italic mb-2">
                            * Use <strong>task_id</strong> OU <strong>phone</strong>, não ambos.
                          </p>
                          <div className="bg-muted p-3 rounded text-xs space-y-1">
                            <p className="font-semibold">Exemplos:</p>
                            <code className="block">?action=get&phone=5511999999999</code>
                            <code className="block">?action=get&phone=11999999999</code>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Ver detalhes de uma tarefa:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=get&task_id=7d274d4a-3f52-4e85-b594-ed927ca9f6c1" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=get&task_id=7d274d4a-3f52-4e85-b594-ed927ca9f6c1" -H "Content-Type: application/json"`,
                              'get-task'
                            )}
                          >
                            {copiedId === 'get-task' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">2. Buscar tarefa por telefone do cliente:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=get&phone=5511999999999" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=get&phone=5511999999999" -H "Content-Type: application/json"`,
                              'get-task-phone'
                            )}
                          >
                            {copiedId === 'get-task-phone' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                      <div>
                        <h4 className="font-semibold mb-2">⚠️ Possíveis Erros</h4>
                        <div className="space-y-2 text-xs">
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2 rounded">
                            <p className="font-semibold">400 - Parâmetros inválidos</p>
                            <p className="text-muted-foreground">É necessário fornecer task_id OU phone.</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2 rounded">
                            <p className="font-semibold">404 - Tarefa não encontrada</p>
                            <p className="text-muted-foreground">O task_id ou telefone fornecido não possui tarefa associada.</p>
                          </div>
                        </div>
                      </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 3: CRIAR TAREFA */}
            <AccordionItem value="create" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_post">POST</Badge>
                  <span className="font-semibold text-base">Criar Nova Tarefa</span>
                  <Badge variant="destructive" className="ml-2">Importante</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      POST {BASE_URL}/task-operations?action=create
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=create`,
                        'url-create'
                      )}
                    >
                      {copiedId === 'url-create' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Cria uma nova tarefa de design vinculada a um pedido existente. Ideal para criação automatizada via N8n quando recebe pedidos de fontes externas.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para criar tarefas a partir de pedidos manuais (Google Forms, planilhas)</li>
                        <li>Para importar pedidos de outros sistemas</li>
                        <li>Para criar tarefas urgentes com prioridade alta</li>
                        <li>Para automações que capturam pedidos de múltiplas fontes</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Body JSON)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">order_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID do pedido ao qual a tarefa será vinculada.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Tipo:</strong> string (UUID)</p>
                            <p><strong>Nota:</strong> O pedido deve existir previamente no sistema</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">campaign_id</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da campanha (se não fornecido, usa a campanha do pedido).</p>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">priority</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Nível de prioridade da tarefa.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Valores:</strong> low, normal, high, urgent</p>
                            <p><strong>Padrão:</strong> normal</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">deadline</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Data limite para conclusão da tarefa.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Formato:</strong> ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ)</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">notes</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Observações sobre a criação da tarefa.</p>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Criar tarefa básica (apenas order_id):</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=create" -H "Content-Type: application/json" -d '{"order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5"}'`,
                              'create-basic'
                            )}
                          >
                            {copiedId === 'create-basic' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">2. Criar tarefa com prioridade alta:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5",
    "priority": "high",
    "notes": "Cliente VIP - processar com urgência"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=create" -H "Content-Type: application/json" -d '{"order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5", "priority": "high", "notes": "Cliente VIP - processar com urgência"}'`,
                              'create-priority'
                            )}
                          >
                            {copiedId === 'create-priority' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">3. Criar tarefa com deadline:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5",
    "campaign_id": "16515e3c-3797-4b23-8e28-eeddb2dab46e",
    "priority": "urgent",
    "deadline": "2025-12-31T23:59:59Z",
    "notes": "Pedido urgente - prazo 3 dias"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=create" -H "Content-Type: application/json" -d '{"order_id": "d1ed5031-9a57-4f5d-8413-9d69177042c5", "campaign_id": "16515e3c-3797-4b23-8e28-eeddb2dab46e", "priority": "urgent", "deadline": "2025-12-31T23:59:59Z", "notes": "Pedido urgente - prazo 3 dias"}'`,
                              'create-deadline'
                            )}
                          >
                            {copiedId === 'create-deadline' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">⚠️ Possíveis Erros</h4>
                      <div className="space-y-2 text-xs">
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2 rounded">
                          <p className="font-semibold">400 - order_id é obrigatório</p>
                          <p className="text-muted-foreground">Você precisa fornecer o order_id no body da requisição.</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2 rounded">
                          <p className="font-semibold">404 - Pedido não encontrado</p>
                          <p className="text-muted-foreground">O order_id fornecido não existe no banco de dados.</p>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 4: ATUALIZAR STATUS */}
            <AccordionItem value="update_status" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_patch">PATCH</Badge>
                  <span className="font-semibold text-base">Atualizar Status</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      PATCH {BASE_URL}/task-operations?action=update_status
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=update_status`,
                        'url-update-status'
                      )}
                    >
                      {copiedId === 'url-update-status' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Atualiza o status de uma tarefa e registra a mudança no histórico. Essencial para workflows de aprovação automatizados.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para mover tarefas entre etapas do workflow</li>
                        <li>Para marcar aprovação ou rejeição do cliente</li>
                        <li>Para automatizar transições de status via N8n</li>
                        <li>Para atualizar status após eventos externos (WhatsApp, email)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Body JSON)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">task_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da tarefa a ser atualizada.</p>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">new_status</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">Novo status da tarefa.</p>
                          <div className="bg-muted p-3 rounded text-xs space-y-1">
                            <p className="font-semibold">Valores aceitos:</p>
                            <ul className="list-disc list-inside ml-2 space-y-0.5">
                              <li><code>pending</code> - Aguardando designer</li>
                              <li><code>in_progress</code> - Em desenvolvimento</li>
                              <li><code>awaiting_approval</code> - Aguardando aprovação do cliente</li>
                              <li><code>approved</code> - Aprovado pelo cliente</li>
                              <li><code>changes_requested</code> - Cliente solicitou alterações</li>
                              <li><code>completed</code> - Concluído e enviado para produção</li>
                            </ul>
                          </div>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">notes</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Observações sobre a mudança de status.</p>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Mover para "Em Progresso":</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "new_status": "in_progress",
    "notes": "Designer iniciou o trabalho"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "new_status": "in_progress", "notes": "Designer iniciou o trabalho"}'`,
                              'status-progress'
                            )}
                          >
                            {copiedId === 'status-progress' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">2. Enviar para aprovação do cliente:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "new_status": "awaiting_approval",
    "notes": "Mockup enviado ao cliente via WhatsApp"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "new_status": "awaiting_approval", "notes": "Mockup enviado ao cliente via WhatsApp"}'`,
                              'status-approval'
                            )}
                          >
                            {copiedId === 'status-approval' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">3. Marcar como "Cliente Pediu Alterações":</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "new_status": "changes_requested",
    "notes": "Cliente solicitou alterações via WhatsApp"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "new_status": "changes_requested", "notes": "Cliente solicitou alterações via WhatsApp"}'`,
                              'status-changes'
                            )}
                          >
                            {copiedId === 'status-changes' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">4. Aprovar e enviar para produção:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "new_status": "approved",
    "notes": "Cliente aprovou por WhatsApp"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "new_status": "approved", "notes": "Cliente aprovou por WhatsApp"}'`,
                              'status-approved'
                            )}
                          >
                            {copiedId === 'status-approved' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 5: ATRIBUIR DESIGNER */}
            <AccordionItem value="assign_designer" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_patch">PATCH</Badge>
                  <span className="font-semibold text-base">Atribuir Designer</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      PATCH {BASE_URL}/task-operations?action=assign_designer
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=assign_designer`,
                        'url-assign'
                      )}
                    >
                      {copiedId === 'url-assign' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Atribui ou reatribui um designer a uma tarefa específica.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para distribuir tarefas automaticamente entre designers</li>
                        <li>Para balancear carga de trabalho</li>
                        <li>Para reatribuir tarefas quando necessário</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Body JSON)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">task_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da tarefa.</p>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">designer_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID do usuário designer.</p>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Atribuir designer a uma tarefa:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=assign_designer" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "designer_id": "2cc01be3-7374-41c3-9a89-a8618cac5cb7"
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X PATCH "${BASE_URL}/task-operations?action=assign_designer" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "designer_id": "2cc01be3-7374-41c3-9a89-a8618cac5cb7"}'`,
                              'assign-designer'
                            )}
                          >
                            {copiedId === 'assign-designer' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 6: ADICIONAR COMENTÁRIO */}
            <AccordionItem value="add_comment" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_post">POST</Badge>
                  <span className="font-semibold text-base">Adicionar Comentário</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      POST {BASE_URL}/task-operations?action=add_comment
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=add_comment`,
                        'url-comment'
                      )}
                    >
                      {copiedId === 'url-comment' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Adiciona um comentário a uma tarefa. Pode ser usado para registrar feedback do cliente ou notas internas da equipe.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para registrar feedback do cliente (WhatsApp, email)</li>
                        <li>Para adicionar notas internas da equipe</li>
                        <li>Para documentar alterações solicitadas</li>
                        <li>Para manter histórico de comunicação</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Body JSON)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">task_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da tarefa.</p>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">comment</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">Texto do comentário.</p>
                        </div>

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">is_internal</code>
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          </div>
                          <p className="text-sm mb-2">Se true, o comentário é visível apenas para a equipe interna.</p>
                          <div className="bg-muted p-3 rounded text-xs">
                            <p><strong>Tipo:</strong> boolean</p>
                            <p><strong>Padrão:</strong> false</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Adicionar feedback do cliente:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=add_comment" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "comment": "Cliente pediu: Aumentar logo e mudar cor para azul",
    "is_internal": false
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=add_comment" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "comment": "Cliente pediu: Aumentar logo e mudar cor para azul", "is_internal": false}'`,
                              'comment-client'
                            )}
                          >
                            {copiedId === 'comment-client' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">2. Adicionar nota interna:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=add_comment" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "comment": "Verificar estoque de tecido azul antes de aprovar",
    "is_internal": true
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=add_comment" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "comment": "Verificar estoque de tecido azul antes de aprovar", "is_internal": true}'`,
                              'comment-internal'
                            )}
                          >
                            {copiedId === 'comment-internal' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">3. Registrar alteração do WhatsApp:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=add_comment" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1",
    "comment": "Via WhatsApp: Perfeito! Só aumentar um pouco o número nas costas",
    "is_internal": false
  }'`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X POST "${BASE_URL}/task-operations?action=add_comment" -H "Content-Type: application/json" -d '{"task_id": "7d274d4a-3f52-4e85-b594-ed927ca9f6c1", "comment": "Via WhatsApp: Perfeito! Só aumentar um pouco o número nas costas", "is_internal": false}'`,
                              'comment-whatsapp'
                            )}
                          >
                            {copiedId === 'comment-whatsapp' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 7: VER HISTÓRICO */}
            <AccordionItem value="get_history" className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Badge variant="http_get">GET</Badge>
                  <span className="font-semibold text-base">Ver Histórico</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Endpoint:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded border flex-1 text-sm font-mono">
                      GET {BASE_URL}/task-operations?action=get_history&task_id=xxx
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        `${BASE_URL}/task-operations?action=get_history&task_id=xxx`,
                        'url-history'
                      )}
                    >
                      {copiedId === 'url-history' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Descrição
                      </h4>
                      <p className="text-sm">
                        Retorna o histórico completo de mudanças de uma tarefa, incluindo todas as alterações de status e quando foram feitas.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quando usar esta API?
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Para auditar mudanças em uma tarefa</li>
                        <li>Para gerar relatórios de produtividade</li>
                        <li>Para calcular tempo médio por etapa</li>
                        <li>Para backup de histórico</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Parâmetros (Query String)
                      </h4>
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">task_id</code>
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          </div>
                          <p className="text-sm mb-2">UUID da tarefa.</p>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Exemplos de Uso (CURL)
                      </h4>
                      
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">1. Ver histórico completo de uma tarefa:</p>
                        <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                          <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=get_history&task_id=7d274d4a-3f52-4e85-b594-ed927ca9f6c1" \\
  -H "Content-Type: application/json"`}</pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                            onClick={() => copyToClipboard(
                              `curl -X GET "${BASE_URL}/task-operations?action=get_history&task_id=7d274d4a-3f52-4e85-b594-ed927ca9f6c1" -H "Content-Type: application/json"`,
                              'history-get'
                            )}
                          >
                            {copiedId === 'history-get' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                    </div>

                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </TabsContent>

        {/* TAB 2: CASOS DE USO */}
        <TabsContent value="use-cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Casos de Uso Práticos com N8n
              </CardTitle>
              <CardDescription>
                Exemplos reais de como usar a API em workflows automatizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* CASO 1 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  🔄 Caso 1: Automação de Aprovação via WhatsApp
                </h3>
                <p className="text-sm text-muted-foreground">
                  Workflow completo para enviar mockup ao cliente e processar resposta automaticamente.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Designer finaliza mockup → atualiza status para <code>awaiting_approval</code></li>
                    <li>Sistema dispara webhook (ver tab Webhook)</li>
                    <li>N8n recebe webhook e envia mockup para cliente via WhatsApp</li>
                    <li>Cliente responde "APROVAR" ou "ALTERAR: [feedback]"</li>
                    <li>N8n captura resposta do WhatsApp</li>
                    <li>Se APROVAR: API <code>update_status → approved</code></li>
                    <li>Se ALTERAR: API <code>add_comment</code> + <code>update_status → changes_requested</code></li>
                  </ol>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">🔧 Nodes N8n Necessários:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Webhook Trigger (recebe aprovação/rejeição)</li>
                    <li>Switch Node (APROVAR vs ALTERAR)</li>
                    <li>HTTP Request (chamadas à API)</li>
                    <li>WhatsApp Business API (enviar mensagens)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplos de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <p className="text-gray-400 mb-2"># Cliente aprovou:</p>
                    <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "TASK_ID",
    "new_status": "approved",
    "notes": "Cliente aprovou via WhatsApp"
  }'`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "TASK_ID", "new_status": "approved", "notes": "Cliente aprovou via WhatsApp"}'`,
                        'usecase1-approve'
                      )}
                    >
                      {copiedId === 'usecase1-approve' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>

                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <p className="text-gray-400 mb-2"># Cliente pediu alteração - Passo 1: Adicionar comentário:</p>
                    <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=add_comment" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "TASK_ID",
    "comment": "Cliente pediu: Aumentar logo e mudar para azul",
    "is_internal": false
  }'`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X POST "${BASE_URL}/task-operations?action=add_comment" -H "Content-Type: application/json" -d '{"task_id": "TASK_ID", "comment": "Cliente pediu: Aumentar logo e mudar para azul", "is_internal": false}'`,
                        'usecase1-comment'
                      )}
                    >
                      {copiedId === 'usecase1-comment' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>

                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <p className="text-gray-400 mb-2"># Passo 2: Atualizar status:</p>
                    <pre className="whitespace-pre-wrap break-all">{`curl -X PATCH "${BASE_URL}/task-operations?action=update_status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "TASK_ID",
    "new_status": "changes_requested",
    "notes": "Cliente solicitou alterações"
  }'`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X PATCH "${BASE_URL}/task-operations?action=update_status" -H "Content-Type: application/json" -d '{"task_id": "TASK_ID", "new_status": "changes_requested", "notes": "Cliente solicitou alterações"}'`,
                        'usecase1-status'
                      )}
                    >
                      {copiedId === 'usecase1-status' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* CASO 2 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  ➕ Caso 2: Criar Tarefa de Pedido Manual (Google Forms)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Capturar pedidos de Google Forms e criar tarefas automaticamente no sistema.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Cliente preenche Google Forms com personalização</li>
                    <li>N8n recebe webhook do Google Forms</li>
                    <li>N8n formata dados e cria pedido (order) no sistema</li>
                    <li>N8n chama API <code>create</code> para criar tarefa automaticamente</li>
                    <li>Sistema notifica designers disponíveis</li>
                  </ol>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">🔧 Nodes N8n Necessários:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Google Forms Trigger</li>
                    <li>Function Node (formatar dados)</li>
                    <li>HTTP Request (criar order e task)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplo de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORDER_ID_CRIADO",
    "campaign_id": "CAMPAIGN_ID",
    "priority": "normal",
    "notes": "Pedido criado via Google Forms"
  }'`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X POST "${BASE_URL}/task-operations?action=create" -H "Content-Type: application/json" -d '{"order_id": "ORDER_ID_CRIADO", "campaign_id": "CAMPAIGN_ID", "priority": "normal", "notes": "Pedido criado via Google Forms"}'`,
                        'usecase2-create'
                      )}
                    >
                      {copiedId === 'usecase2-create' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* CASO 3 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  📊 Caso 3: Dashboard de Tarefas em Tempo Real
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enviar resumo de tarefas para Slack/Discord a cada 5 minutos.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>N8n Schedule Trigger executa a cada 5 minutos</li>
                    <li>Chama API <code>list</code> para obter todas as tarefas</li>
                    <li>Function Node processa e agrupa dados por status</li>
                    <li>Envia mensagem formatada para Slack/Discord</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplo de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap break-all">{`curl -X GET "${BASE_URL}/task-operations?action=list" \\
  -H "Content-Type: application/json"

# Processar resposta para contar por status:
# - X tarefas em pending
# - Y tarefas em awaiting_approval
# - Z tarefas concluídas hoje`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X GET "${BASE_URL}/task-operations?action=list" -H "Content-Type: application/json"`,
                        'usecase3-list'
                      )}
                    >
                      {copiedId === 'usecase3-list' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* CASO 4 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  ⏰ Caso 4: Escalar Tarefas Atrasadas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verificar diariamente tarefas com deadline vencido e escalar prioridade.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>N8n Schedule Trigger executa diariamente (8h da manhã)</li>
                    <li>Lista todas as tarefas</li>
                    <li>Function Node filtra tarefas com deadline {'<'} hoje</li>
                    <li>Para cada tarefa atrasada: adiciona comentário interno e notifica gerente</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplo de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap break-all">{`curl -X POST "${BASE_URL}/task-operations?action=add_comment" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "TASK_ID_ATRASADA",
    "comment": "⚠️ TAREFA ATRASADA! Deadline foi ontem. Escalar para gerente.",
    "is_internal": true
  }'`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X POST "${BASE_URL}/task-operations?action=add_comment" -H "Content-Type: application/json" -d '{"task_id": "TASK_ID_ATRASADA", "comment": "⚠️ TAREFA ATRASADA! Deadline foi ontem. Escalar para gerente.", "is_internal": true}'`,
                        'usecase4-escalate'
                      )}
                    >
                      {copiedId === 'usecase4-escalate' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* CASO 5 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  💾 Caso 5: Backup Semanal de Histórico
                </h3>
                <p className="text-sm text-muted-foreground">
                  Exportar histórico de todas as tarefas para Google Sheets semanalmente.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>N8n Schedule Trigger executa toda segunda-feira</li>
                    <li>Lista todas as tarefas</li>
                    <li>Para cada tarefa, busca histórico completo</li>
                    <li>Formata dados e salva em Google Sheets</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplo de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap break-all">{`# Primeiro, listar todas as tarefas:
curl -X GET "${BASE_URL}/task-operations?action=list" \\
  -H "Content-Type: application/json"

# Para cada task_id retornado, buscar histórico:
curl -X GET "${BASE_URL}/task-operations?action=get_history&task_id=TASK_ID" \\
  -H "Content-Type: application/json"`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X GET "${BASE_URL}/task-operations?action=list" -H "Content-Type: application/json"`,
                        'usecase5-backup'
                      )}
                    >
                      {copiedId === 'usecase5-backup' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* CASO 6 */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  💬 Caso 6: Consultar Status por WhatsApp
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cliente envia mensagem perguntando sobre o pedido → N8n busca por telefone e responde automaticamente.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">📊 Fluxo do Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Cliente envia WhatsApp: "Qual o status do meu pedido?"</li>
                    <li>N8n captura mensagem via WhatsApp Webhook</li>
                    <li>Extrai número do telefone do cliente</li>
                    <li>Consulta tarefa usando o parâmetro <code>phone</code></li>
                    <li>Responde com status atual: "Olá! Seu pedido está: {`{status}`}"</li>
                  </ol>
                </div>

                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">✨ Benefícios:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Cliente não precisa saber o ID da tarefa</li>
                    <li>Atendimento instantâneo 24/7</li>
                    <li>Reduz carga de atendimento manual</li>
                    <li>Melhora experiência do cliente</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Exemplo de CURL:</h4>
                  
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap break-all">{`# Buscar tarefa pelo telefone do cliente:
curl -X GET "${BASE_URL}/task-operations?action=get&phone={{$json.from}}" \\
  -H "Content-Type: application/json"

# Responder no WhatsApp:
# "Olá! Seu pedido está: {{$json.data.status}}"`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `curl -X GET "${BASE_URL}/task-operations?action=get&phone=5511999999999" -H "Content-Type: application/json"`,
                        'usecase6-whatsapp'
                      )}
                    >
                      {copiedId === 'usecase6-whatsapp' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">🔧 Nodes N8n Necessários:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>WhatsApp Trigger (receber mensagens)</li>
                    <li>HTTP Request (buscar por phone)</li>
                    <li>WhatsApp Business API (enviar resposta)</li>
                  </ul>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: WEBHOOK */}
        <TabsContent value="webhook" className="space-y-4">
          {/* Card de Configuração de Webhooks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhooks Configuráveis por Evento
                  </CardTitle>
                  <CardDescription>
                    Configure webhooks para disparar automaticamente em eventos específicos do sistema
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum webhook configurado ainda.</p>
                  <p className="text-sm">Clique em "Adicionar Webhook" para começar.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {eventTypes.find(e => e.value === webhook.event_type)?.label || webhook.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {webhook.webhook_url}
                        </TableCell>
                        <TableCell>
                          {webhook.is_active ? (
                            <Badge variant="default" className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(webhook)}
                              disabled={isLoading}
                            >
                              {webhook.is_active ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(webhook)}
                              disabled={isLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteWebhook(webhook.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card de Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Documentação dos Eventos
              </CardTitle>
              <CardDescription>
                Entenda cada tipo de evento e o payload enviado ao seu webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <h3 className="font-semibold mb-2">📌 Como Funciona?</h3>
                <p className="text-sm">
                  Configure webhooks para disparar automaticamente quando eventos específicos acontecem no sistema.
                  O sistema enviará um HTTP POST para a URL configurada com todas as informações do lead.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">📦 Estrutura do Payload</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
{`{
  "event": "lead_abandoned",
  "timestamp": "2025-11-27T14:30:00Z",
  "lead": {
    "id": "uuid",
    "name": "João Silva",
    "phone": "(11) 98765-4321",
    "email": "joao@email.com",
    "current_step": 4,
    "quantity": "50",
    "customization_summary": {...}
  },
  "campaign": {
    "id": "uuid",
    "name": "Campanha Futebol 2025"
  },
  "session": {
    "id": "session_xxx",
    "visit_count": 1,
    "first_visit": "2025-11-27T14:00:00Z",
    "last_event": "step_4"
  },
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "blackfriday",
    "content": "ad1",
    "term": "uniforme"
  }
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">🎯 Tipos de Eventos Disponíveis</h3>
                <div className="space-y-3">
                  {eventTypes.map((event) => (
                    <div key={event.value} className="border rounded-lg p-3">
                      <Badge variant="outline" className="mb-2">{event.value}</Badge>
                      <p className="text-sm">{event.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">🔧 Como Configurar no N8n</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Abra o N8n e crie um novo workflow</li>
                  <li>Adicione um node "Webhook"</li>
                  <li>Configure o método como <code>POST</code></li>
                  <li>Copie a URL gerada pelo webhook</li>
                  <li>Cole a URL nas configurações do sistema (em desenvolvimento)</li>
                  <li>Ative o workflow</li>
                  <li>Teste enviando uma tarefa para aprovação</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-3">💬 Exemplo: Enviar via WhatsApp</h3>
                <p className="text-sm mb-3">
                  Node Function no N8n para formatar mensagem e enviar ao cliente:
                </p>
                <ScrollArea className="h-[300px]">
                  <div className="bg-gray-900 p-4 rounded-lg text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap">{`// Node: Function (processar webhook)
const payload = $input.item.json;

return {
  json: {
    to: payload.customer_phone,
    message: \`Olá \${payload.customer_name}! 👋

Seu mockup da \${payload.campaign_name} está pronto! 🎉

Quantidade: \${payload.quantity} unidades
Modelo: \${payload.model_name}

Veja o design: \${payload.mockup_url}

Responda:
✅ APROVAR - para confirmar o design
🔄 ALTERAR: [suas observações] - para solicitar mudanças\`,
    media_url: payload.mockup_url
  }
};

// Próximo Node: WhatsApp Business API
// Configurar com os dados retornados acima`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `const payload = $input.item.json;\n\nreturn {\n  json: {\n    to: payload.customer_phone,\n    message: \`Olá \${payload.customer_name}! 👋\n\nSeu mockup da \${payload.campaign_name} está pronto! 🎉\n\nQuantidade: \${payload.quantity} unidades\nModelo: \${payload.model_name}\n\nVeja o design: \${payload.mockup_url}\n\nResponda:\n✅ APROVAR - para confirmar o design\n🔄 ALTERAR: [suas observações] - para solicitar mudanças\`,\n    media_url: payload.mockup_url\n  }\n};`,
                        'webhook-whatsapp'
                      )}
                    >
                      {copiedId === 'webhook-whatsapp' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </ScrollArea>
              </div>

              <div>
                <h3 className="font-semibold mb-3">📧 Exemplo: Enviar via Email</h3>
                <p className="text-sm mb-3">
                  Node Function para formatar email com imagem:
                </p>
                <ScrollArea className="h-[300px]">
                  <div className="bg-gray-900 p-4 rounded-lg text-xs text-gray-100 overflow-x-auto relative">
                    <pre className="whitespace-pre-wrap">{`// Node: Function (processar webhook)
const payload = $input.item.json;

return {
  json: {
    to: payload.customer_email,
    subject: \`Mockup Pronto - \${payload.campaign_name}\`,
    html: \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá \${payload.customer_name}!</h2>
        <p>Seu mockup está pronto para aprovação.</p>
        
        <div style="margin: 20px 0;">
          <img src="\${payload.mockup_url}" style="max-width: 100%; border-radius: 8px;" />
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <p><strong>Campanha:</strong> \${payload.campaign_name}</p>
          <p><strong>Modelo:</strong> \${payload.model_name}</p>
          <p><strong>Quantidade:</strong> \${payload.quantity} unidades</p>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="[LINK_APROVAR]" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
            ✅ APROVAR
          </a>
          <a href="[LINK_ALTERAR]" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            🔄 SOLICITAR ALTERAÇÕES
          </a>
        </div>
      </div>
    \`
  }
};

// Próximo Node: Email (Gmail, SendGrid, etc)
// Configurar com os dados retornados acima`}</pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(
                        `const payload = $input.item.json;\n\nreturn {\n  json: {\n    to: payload.customer_email,\n    subject: \`Mockup Pronto - \${payload.campaign_name}\`,\n    html: '... [código HTML do email]'\n  }\n};`,
                        'webhook-email'
                      )}
                    >
                      {copiedId === 'webhook-email' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </ScrollArea>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">💡 Dica Pro:</h4>
                <p className="text-sm">
                  Combine o webhook com o Caso de Uso 1 (tab "Casos de Uso") para criar um fluxo completo: 
                  webhook envia mockup → cliente responde → N8n processa resposta → API atualiza status automaticamente.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialog para Criar/Editar Webhook */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? 'Editar Webhook' : 'Adicionar Webhook'}
            </DialogTitle>
            <DialogDescription>
              Configure um webhook para disparar automaticamente em eventos específicos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Webhook *</Label>
              <Input
                id="name"
                placeholder="Ex: Notificar Lead Abandonado"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">URL do Webhook *</Label>
              <Input
                id="webhook_url"
                placeholder="https://n8n.example.com/webhook/..."
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cole aqui a URL do seu webhook (N8n, Zapier, Make, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_type">Tipo de Evento *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Webhook Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar temporariamente sem excluir
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <Label htmlFor="include_customization">Incluir Dados de Customização</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar customization_summary no payload
                </p>
              </div>
              <Switch
                id="include_customization"
                checked={formData.include_customization}
                onCheckedChange={(checked) => setFormData({ ...formData, include_customization: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveWebhook} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Api;
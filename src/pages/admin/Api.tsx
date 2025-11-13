import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Api = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const BASE_URL = "https://sjznikaxsivaoytefagi.supabase.co/functions/v1";
  
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Documentação da API</h1>
          <Badge variant="outline">v1.0</Badge>
        </div>
        <p className="text-muted-foreground">
          API REST para integração com N8n e automação de tarefas de design
        </p>
      </div>

      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-1">URL Base:</p>
            <code className="bg-secondary px-3 py-1 rounded text-sm">
              {BASE_URL}
            </code>
          </div>
          <div>
            <p className="font-semibold mb-1">Autenticação:</p>
            <p className="text-sm text-muted-foreground">
              Não requer autenticação JWT (configurado para uso com N8n)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Endpoints e Webhook */}
      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints da API</TabsTrigger>
          <TabsTrigger value="webhook">Webhook de Aprovação</TabsTrigger>
        </TabsList>

        {/* TAB 1: ENDPOINTS */}
        <TabsContent value="endpoints" className="space-y-4">
          <Accordion type="single" collapsible className="space-y-2">
            
            {/* ENDPOINT 1: Listar Tarefas */}
            <AccordionItem value="list">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge>GET</Badge>
                  <span className="font-mono text-sm">/task-operations?action=list</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Lista todas as tarefas de design com informações do pedido, cliente e campanha.</p>
                    
                    <div>
                      <p className="font-semibold mb-2">Parâmetros (Opcionais):</p>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li><code>status</code> - Filtrar por status (pending, in_progress, awaiting_approval, etc.)</li>
                        <li><code>assigned_to</code> - Filtrar por UUID do designer atribuído</li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`${BASE_URL}/task-operations?action=list&status=pending`, 'list')}
                        >
                          {copiedId === 'list' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`GET ${BASE_URL}/task-operations?action=list&status=pending`}
                      </pre>
                    </div>

                    <div>
                      <p className="font-semibold mb-2">Exemplo de Response:</p>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "pending",
      "priority": "normal",
      "orders": {
        "customer_name": "João Silva",
        "customer_email": "joao@email.com",
        "quantity": 50
      },
      "campaigns": {
        "name": "Campanha Verão"
      }
    }
  ]
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 2: Ver Detalhes */}
            <AccordionItem value="get">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge>GET</Badge>
                  <span className="font-mono text-sm">/task-operations?action=get</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Obtém detalhes completos de uma tarefa específica.</p>
                    
                    <div>
                      <p className="font-semibold mb-2">Parâmetros (Obrigatórios):</p>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li><code>task_id</code> - UUID da tarefa</li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`${BASE_URL}/task-operations?action=get&task_id=UUID`, 'get')}
                        >
                          {copiedId === 'get' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`GET ${BASE_URL}/task-operations?action=get&task_id=UUID`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 3: Atualizar Status */}
            <AccordionItem value="update_status">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">PATCH</Badge>
                  <span className="font-mono text-sm">/task-operations?action=update_status</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Atualiza o status de uma tarefa e registra no histórico.</p>
                    
                    <div>
                      <p className="font-semibold mb-2">Status Válidos:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">pending</Badge>
                        <Badge variant="outline">in_progress</Badge>
                        <Badge variant="outline">awaiting_approval</Badge>
                        <Badge variant="outline">approved</Badge>
                        <Badge variant="outline">changes_requested</Badge>
                        <Badge variant="outline">completed</Badge>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`PATCH ${BASE_URL}/task-operations?action=update_status\n\nBody:\n${JSON.stringify({task_id: "UUID", new_status: "approved", notes: "Aprovado via N8n"}, null, 2)}`, 'update_status')}
                        >
                          {copiedId === 'update_status' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`PATCH ${BASE_URL}/task-operations?action=update_status

Body:
{
  "task_id": "UUID",
  "new_status": "approved",
  "notes": "Aprovado via N8n"
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 4: Atribuir Designer */}
            <AccordionItem value="assign_designer">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">PATCH</Badge>
                  <span className="font-mono text-sm">/task-operations?action=assign_designer</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Atribui um designer a uma tarefa.</p>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`PATCH ${BASE_URL}/task-operations?action=assign_designer\n\nBody:\n${JSON.stringify({task_id: "UUID", designer_id: "UUID_DO_DESIGNER"}, null, 2)}`, 'assign')}
                        >
                          {copiedId === 'assign' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`PATCH ${BASE_URL}/task-operations?action=assign_designer

Body:
{
  "task_id": "UUID",
  "designer_id": "UUID_DO_DESIGNER"
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 5: Adicionar Comentário */}
            <AccordionItem value="add_comment">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="destructive">POST</Badge>
                  <span className="font-mono text-sm">/task-operations?action=add_comment</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Adiciona um comentário a uma tarefa.</p>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`POST ${BASE_URL}/task-operations?action=add_comment\n\nBody:\n${JSON.stringify({task_id: "UUID", comment: "Cliente solicitou alteração na cor", is_internal: false}, null, 2)}`, 'comment')}
                        >
                          {copiedId === 'comment' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`POST ${BASE_URL}/task-operations?action=add_comment

Body:
{
  "task_id": "UUID",
  "comment": "Cliente solicitou alteração na cor",
  "is_internal": false
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* ENDPOINT 6: Ver Histórico */}
            <AccordionItem value="get_history">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge>GET</Badge>
                  <span className="font-mono text-sm">/task-operations?action=get_history</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm">Obtém todo o histórico de mudanças de uma tarefa.</p>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Exemplo de Request:</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`${BASE_URL}/task-operations?action=get_history&task_id=UUID`, 'history')}
                        >
                          {copiedId === 'history' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
{`GET ${BASE_URL}/task-operations?action=get_history&task_id=UUID`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </TabsContent>

        {/* TAB 2: WEBHOOK */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook de Aprovação Automático</CardTitle>
              <CardDescription>
                Este webhook é disparado automaticamente quando o designer clica em "Enviar para Aprovação"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">URL do Webhook:</p>
                <code className="bg-secondary px-3 py-1 rounded text-sm block">
                  https://nwh.chelsan.com.br/webhook/criacao-aprovacao
                </code>
              </div>

              <div>
                <p className="font-semibold mb-2">Quando é disparado:</p>
                <p className="text-sm text-muted-foreground">
                  Automaticamente quando o status da tarefa muda para <Badge variant="outline">awaiting_approval</Badge>
                </p>
              </div>

              <div>
                <p className="font-semibold mb-2">Método:</p>
                <Badge variant="destructive">POST</Badge>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Payload Enviado:</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`{
  "event": "design_awaiting_approval",
  "timestamp": "2025-11-13T20:30:00.000Z",
  "task": {
    "id": "uuid-da-tarefa",
    "status": "awaiting_approval",
    "priority": "normal",
    "current_version": 1
  },
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999"
  },
  "order": {
    "quantity": 50,
    "customization_data": {}
  },
  "campaign": {
    "name": "Campanha X"
  },
  "mockups": [
    {
      "url": "https://...",
      "version": 1,
      "uploaded_at": "2025-11-13T19:36:31.801Z",
      "notes": null
    }
  ],
  "designer_id": "uuid-do-designer"
}`, 'webhook')}
                  >
                    {copiedId === 'webhook' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto max-h-96">
{`{
  "event": "design_awaiting_approval",
  "timestamp": "2025-11-13T20:30:00.000Z",
  "task": {
    "id": "uuid-da-tarefa",
    "status": "awaiting_approval",
    "priority": "normal",
    "current_version": 1,
    "created_at": "2025-11-13T19:00:00.000Z",
    "assigned_at": "2025-11-13T19:15:00.000Z"
  },
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999"
  },
  "order": {
    "quantity": 50,
    "customization_data": { /* dados da personalização */ }
  },
  "campaign": {
    "name": "Campanha X"
  },
  "mockups": [
    {
      "url": "https://sjznikaxsivaoytefagi.supabase.co/storage/v1/object/public/...",
      "version": 1,
      "uploaded_at": "2025-11-13T19:36:31.801Z",
      "notes": null
    },
    {
      "url": "https://sjznikaxsivaoytefagi.supabase.co/storage/v1/object/public/...",
      "version": 1,
      "uploaded_at": "2025-11-13T19:36:32.846Z",
      "notes": null
    }
  ],
  "designer_id": "uuid-do-designer"
}`}
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Logs:</p>
                <p className="text-sm text-muted-foreground">
                  Todos os disparos de webhook são registrados na tabela <code className="bg-secondary px-1 rounded">webhook_logs</code> para auditoria.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Api;

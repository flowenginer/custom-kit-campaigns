import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, FileText, Zap, MessageSquare } from "lucide-react";
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
            <MessageSquare className="h-4 w-4 mr-2" />
            Webhook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <p className="text-sm text-muted-foreground mb-4">
            Documentação completa em desenvolvimento. Use os casos de uso práticos para começar.
          </p>
        </TabsContent>

        <TabsContent value="use-cases">
          <Card>
            <CardHeader>
              <CardTitle>Casos de Uso Práticos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Webhook de Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Documentação em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Api;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Loader2 } from "lucide-react";
import { DesignTask } from "@/types/design-task";

interface RequestCustomerRegistrationButtonProps {
  taskId: string;
  leadId?: string | null;
  variant?: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link";
  label?: string;
  className?: string;
  taskData?: DesignTask | null;
}

export const RequestCustomerRegistrationButton = ({
  taskId,
  leadId,
  variant = "outline",
  label = "Solicitar Cadastro",
  className = "w-full",
  taskData,
}: RequestCustomerRegistrationButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const loadCustomDomain = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("custom_domain")
        .single();

      if (error) throw error;
      if (data?.custom_domain) {
        setCustomDomain(data.custom_domain);
      }
    } catch (error) {
      console.error("Erro ao carregar domínio personalizado:", error);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const token = generateToken();
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("customer_registration_links")
        .insert({
          token,
          task_id: taskId,
          lead_id: leadId,
          created_by: user.user.id,
        });

      if (error) throw error;

      // Usar domínio personalizado se configurado, senão usar origin atual
      const baseUrl = customDomain 
        ? `https://${customDomain}` 
        : window.location.origin;
      
      const link = `${baseUrl}/customer-register/${token}`;
      setGeneratedLink(link);
      toast.success("Link gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar link:", error);
      toast.error("Erro ao gerar link: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!generatedLink) return;
    
    setSendingWhatsApp(true);
    
    try {
      // Prepare webhook payload with all card data
      const webhookPayload = {
        event: "cadastro",
        message_icon: '📝',
        message_type: 'registration',
        suggested_title: '📝 Formulário de Cadastro',
        registration_url: generatedLink,
        card_data: {
          id: taskId,
          customer_name: taskData?.customer_name || null,
          status: taskData?.status || "approved",
          product: taskData?.campaign_name || null,
          segment: taskData?.segment_tag || null,
          model: taskData?.model_name || null,
          quantity: taskData?.quantity ? `${taskData.quantity} un.` : null,
          version: taskData?.current_version ? `v${taskData.current_version}` : null,
          designer: taskData?.designer_name || null,
          salesperson: taskData?.creator_name || null,
          created_at: taskData?.created_at || null,
          updated_at: taskData?.updated_at || null,
          column: "Aprovado",
          order_id: taskData?.order_id || null,
          order_number: taskData?.order_number || null,
          customer_phone: taskData?.customer_phone || null,
          customer_email: taskData?.customer_email || null,
          notes: taskData?.changes_notes || null,
          lead_id: leadId || taskData?.lead_id || null,
          business_segment: taskData?.business_segment_name || null,
        },
        timestamp: new Date().toISOString()
      };

      console.log('[WEBHOOK] Sending cadastro event:', {
        url: 'https://nwh.techspacesports.com.br/webhook/events_criacao',
        payload: webhookPayload
      });

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://nwh.techspacesports.com.br/webhook/events_criacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[WEBHOOK] Failed:', {
          status: response.status,
          cardId: taskId
        });
        
        if (response.status >= 500) {
          throw new Error('SERVER_ERROR');
        } else if (response.status === 400) {
          throw new Error('VALIDATION_ERROR');
        } else {
          throw new Error('REQUEST_FAILED');
        }
      }

      console.log('[WEBHOOK] Success:', {
        status: response.status,
        cardId: taskId
      });

      toast.success('Dados enviados com sucesso! O cliente será notificado.');
      
      // Close modal after success (NO WhatsApp redirect - webhook handles messaging)
      setTimeout(() => setOpen(false), 1000);
      
    } catch (error: any) {
      console.error('[WEBHOOK] Error:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Tempo esgotado. Tente novamente.');
      } else if (error.message === 'SERVER_ERROR') {
        toast.error('Serviço temporariamente indisponível. Tente em alguns minutos.');
      } else if (error.message === 'VALIDATION_ERROR') {
        toast.error('Dados inválidos. Contate o suporte.');
      } else {
        toast.error('Erro ao enviar via WhatsApp. Tente novamente.');
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    loadCustomDomain();
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Cadastro do Cliente</DialogTitle>
            <DialogDescription>
              Gere um link único para o cliente preencher seus dados de cadastro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!generatedLink ? (
              <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Link de Cadastro
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Link Gerado</Label>
                  <div className="flex gap-2">
                    <Input value={generatedLink} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleWhatsAppShare}
                    disabled={sendingWhatsApp}
                    className="flex-1"
                  >
                    {sendingWhatsApp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "📱 Enviar via WhatsApp"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  O link expira em 7 dias
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
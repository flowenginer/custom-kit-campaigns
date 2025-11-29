import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Loader2 } from "lucide-react";

interface RequestCustomerRegistrationButtonProps {
  taskId: string;
  leadId?: string | null;
}

export const RequestCustomerRegistrationButton = ({
  taskId,
  leadId,
}: RequestCustomerRegistrationButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

      const link = `${window.location.origin}/customer-register/${token}`;
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

  const handleWhatsAppShare = () => {
    if (generatedLink) {
      const message = encodeURIComponent(
        `Olá! Para finalizar seu pedido, precisamos que você complete seu cadastro através deste link: ${generatedLink}`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Solicitar Cadastro
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
                    className="flex-1"
                  >
                    📱 Enviar via WhatsApp
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
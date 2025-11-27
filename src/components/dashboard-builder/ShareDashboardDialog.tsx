import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
  isPublic: boolean;
  onPublicToggle: (isPublic: boolean) => void;
}

export const ShareDashboardDialog = ({
  open,
  onOpenChange,
  dashboardId,
  dashboardName,
  isPublic,
  onPublicToggle,
}: ShareDashboardDialogProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/admin/dashboard/${dashboardId}`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartilhar Dashboard</DialogTitle>
          <DialogDescription>
            Configure as opções de compartilhamento para "{dashboardName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dashboard Público</Label>
              <p className="text-sm text-muted-foreground">
                Permitir acesso sem autenticação
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={onPublicToggle}
            />
          </div>

          {/* Share Link */}
          {isPublic && (
            <>
              <div className="space-y-2">
                <Label>Link de Compartilhamento</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => copyToClipboard(shareUrl, "Link")}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => window.open(shareUrl, "_blank")}
                    variant="outline"
                    size="icon"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Embed Code */}
              <div className="space-y-2">
                <Label>Código de Incorporação</Label>
                <div className="flex gap-2">
                  <Input
                    value={embedCode}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    onClick={() => copyToClipboard(embedCode, "Código")}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole este código em seu site para incorporar o dashboard
                </p>
              </div>
            </>
          )}

          {!isPublic && (
            <div className="rounded-lg border border-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ative a opção "Dashboard Público" para gerar links de compartilhamento
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

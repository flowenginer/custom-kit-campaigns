import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QuotePreviewModal } from "./QuotePreviewModal";
import { 
  FileText, 
  Eye, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RefreshCcw,
  CreditCard,
  Copy,
  Loader2
} from "lucide-react";

interface Quote {
  id: string;
  task_id: string;
  token: string;
  status: string;
  items: any[];
  total_amount: number;
  valid_until: string;
  correction_notes: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  sent_at: string | null;
  created_at: string;
}

interface QuoteSectionProps {
  taskId: string;
  customerName: string;
  customerPhone?: string;
  isSalesperson?: boolean;
  isAdmin?: boolean;
}

export const QuoteSection = ({
  taskId,
  customerName,
  customerPhone,
  isSalesperson,
  isAdmin
}: QuoteSectionProps) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadQuote();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`quote-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          loadQuote();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const loadQuote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Check if expired
      if (data && isPast(new Date(data.valid_until)) && data.status === 'sent') {
        await supabase
          .from("quotes")
          .update({ status: 'expired' })
          .eq("id", data.id);
        data.status = 'expired';
      }

      if (data) {
        setQuote({
          ...data,
          items: (data.items || []) as unknown as any[]
        } as Quote);
      } else {
        setQuote(null);
      }
    } catch (err) {
      console.error("Error loading quote:", err);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCopyLink = () => {
    if (quote?.token) {
      const url = `${window.location.origin}/quote/${quote.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const handleGenerateNewQuote = async () => {
    // If there's an existing quote in certain states, delete it first
    if (quote && ['draft', 'expired', 'correction_requested'].includes(quote.status)) {
      await supabase
        .from("quotes")
        .delete()
        .eq("id", quote.id);
    }
    setShowPreviewModal(true);
  };

  const canGenerateQuote = isSalesperson || isAdmin;
  const canViewQuote = quote !== null;
  const isApproved = quote?.status === 'approved';
  const isCorrectionRequested = quote?.status === 'correction_requested';
  const isExpired = quote?.status === 'expired';
  const isSent = quote?.status === 'sent';

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status display */}
          {quote ? (
            <div className="space-y-3">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant={
                    isApproved ? "default" : 
                    isCorrectionRequested ? "secondary" : 
                    isExpired ? "destructive" : 
                    "outline"
                  }
                  className={isApproved ? "bg-green-600" : ""}
                >
                  {isApproved && (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprovado
                    </>
                  )}
                  {isCorrectionRequested && (
                    <>
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      Correção Solicitada
                    </>
                  )}
                  {isExpired && (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Expirado
                    </>
                  )}
                  {isSent && (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Enviado
                    </>
                  )}
                  {quote.status === 'draft' && "Rascunho"}
                </Badge>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(Number(quote.total_amount))}
                </span>
              </div>

              {/* Approval Info */}
              {isApproved && quote.approved_at && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Orçamento Aprovado</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Por {quote.approved_by_name} em{" "}
                    {format(new Date(quote.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              {/* Correction Request Info */}
              {isCorrectionRequested && quote.correction_notes && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Cliente solicitou correção</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    "{quote.correction_notes}"
                  </p>
                </div>
              )}

              {/* Validity Info */}
              {!isApproved && !isExpired && quote.valid_until && (
                <p className="text-xs text-muted-foreground">
                  Válido até: {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Orçamento
                </Button>

                {isSent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Link
                  </Button>
                )}

                {(isExpired || isCorrectionRequested) && canGenerateQuote && (
                  <Button
                    size="sm"
                    onClick={handleGenerateNewQuote}
                  >
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    Novo Orçamento
                  </Button>
                )}

                {isApproved && (
                  <Button
                    size="sm"
                    className="bg-primary"
                    disabled
                    title="Em breve: Integração com Rede"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Cobrar Cliente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // No quote exists yet
            <div className="text-center py-4">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum orçamento gerado ainda
              </p>
              {canGenerateQuote && (
                <Button onClick={() => setShowPreviewModal(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Orçamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Preview Modal */}
      <QuotePreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        taskId={taskId}
        customerName={customerName}
        customerPhone={customerPhone}
        onQuoteSent={loadQuote}
      />
    </>
  );
};

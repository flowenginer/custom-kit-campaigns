import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QuoteEditorModal } from "./QuoteEditorModal";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RefreshCcw,
  CreditCard,
  Copy,
  Loader2,
  Send,
  Pencil
} from "lucide-react";

interface QuoteItem {
  layout_id: string;
  product_name: string;
  segment_tag: string;
  model_tag: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

interface Quote {
  id: string;
  task_id: string;
  token: string;
  status: string;
  items: QuoteItem[];
  total_amount: number;
  subtotal_before_discount: number;
  discount_type: string | null;
  discount_value: number;
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
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
    loadCustomDomain();
    
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

  const loadCustomDomain = async () => {
    try {
      const { data } = await supabase
        .from("company_settings")
        .select("custom_domain")
        .single();
      setCustomDomain(data?.custom_domain || null);
    } catch (error) {
      setCustomDomain(null);
    }
  };

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
          items: (data.items || []) as unknown as QuoteItem[],
          discount_type: data.discount_type || null,
          discount_value: Number(data.discount_value) || 0,
          subtotal_before_discount: Number(data.subtotal_before_discount) || Number(data.total_amount)
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
      const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
      const url = `${baseUrl}/quote/${quote.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const canManageQuote = isSalesperson || isAdmin;
  const isApproved = quote?.status === 'approved';
  const isCorrectionRequested = quote?.status === 'correction_requested';
  const isExpired = quote?.status === 'expired';
  const isSent = quote?.status === 'sent';
  const isDraft = quote?.status === 'draft';
  const hasDiscount = quote?.discount_type && quote.discount_value > 0;

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
          {quote ? (
            <div className="space-y-3">
              {/* Status Badge and Total */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant={
                    isApproved ? "default" : 
                    isCorrectionRequested ? "secondary" : 
                    isExpired ? "destructive" : 
                    isDraft ? "outline" :
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
                  {isDraft && "Rascunho"}
                </Badge>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(Number(quote.total_amount))}
                </span>
              </div>

              {/* Discount Info */}
              {hasDiscount && (
                <p className="text-xs text-green-600">
                  Desconto aplicado: {quote.discount_type === 'percentage' 
                    ? `${quote.discount_value}%` 
                    : formatCurrency(quote.discount_value)}
                </p>
              )}

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
                  onClick={() => setShowEditorModal(true)}
                >
                  {canManageQuote && !isApproved ? (
                    <>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Orçamento
                    </>
                  )}
                </Button>

                {(isSent || isDraft) && quote.token && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Link
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
            <div className="text-center py-4">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum orçamento gerado ainda
              </p>
              {canManageQuote && (
                <Button onClick={() => setShowEditorModal(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteEditorModal
        open={showEditorModal}
        onOpenChange={setShowEditorModal}
        taskId={taskId}
        customerName={customerName}
        customerPhone={customerPhone}
        existingQuote={quote}
        onQuoteUpdated={loadQuote}
      />
    </>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Pencil,
  Plus,
  Trash2,
  EyeOff
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuoteItem {
  layout_id: string;
  product_name: string;
  segment_tag: string;
  model_tag: string;
  product_image: string;
  approved_mockup_url?: string;
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
  quote_number: number;
  is_active: boolean;
}

interface QuoteSectionProps {
  taskId: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string | null;
  isSalesperson?: boolean;
  isAdmin?: boolean;
}

export const QuoteSection = ({
  taskId,
  customerName,
  customerPhone,
  customerId,
  isSalesperson,
  isAdmin
}: QuoteSectionProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadQuotes();
    loadCustomDomain();
    
    const channel = supabase
      .channel(`quotes-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          loadQuotes();
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

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("task_id", taskId)
        .eq("is_active", true)
        .order("quote_number", { ascending: false });

      if (error) throw error;

      const processedQuotes: Quote[] = [];
      
      for (const quoteData of (data || [])) {
        // Check if expired
        if (isPast(new Date(quoteData.valid_until)) && quoteData.status === 'sent') {
          await supabase
            .from("quotes")
            .update({ status: 'expired' })
            .eq("id", quoteData.id);
          quoteData.status = 'expired';
        }

        processedQuotes.push({
          ...quoteData,
          items: (quoteData.items || []) as unknown as QuoteItem[],
          discount_type: quoteData.discount_type || null,
          discount_value: Number(quoteData.discount_value) || 0,
          subtotal_before_discount: Number(quoteData.subtotal_before_discount) || Number(quoteData.total_amount),
          quote_number: quoteData.quote_number || 1,
          is_active: quoteData.is_active ?? true
        } as Quote);
      }

      setQuotes(processedQuotes);
    } catch (err) {
      console.error("Error loading quotes:", err);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCopyLink = (quote: Quote) => {
    if (quote.token) {
      const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
      const url = `${baseUrl}/quote/${quote.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowEditorModal(true);
  };

  const handleNewQuote = () => {
    setSelectedQuote(null);
    setShowEditorModal(true);
  };

  const handleDeleteClick = (quote: Quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return;

    setDeleting(true);
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("quotes")
        .update({ is_active: false })
        .eq("id", quoteToDelete.id);

      if (error) throw error;

      toast.success("Orçamento excluído!");
      loadQuotes();
    } catch (err) {
      console.error("Error deleting quote:", err);
      toast.error("Erro ao excluir orçamento");
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setQuoteToDelete(null);
  };

  const canManageQuote = isSalesperson || isAdmin;

  const getStatusBadge = (quote: Quote) => {
    const isApproved = quote.status === 'approved';
    const isCorrectionRequested = quote.status === 'correction_requested';
    const isExpired = quote.status === 'expired';
    const isSent = quote.status === 'sent';
    const isDraft = quote.status === 'draft';

    return (
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
            Correção
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
    );
  };

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Orçamentos
            </CardTitle>
            {canManageQuote && (
              <Button size="sm" onClick={handleNewQuote}>
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotes.length > 0 ? (
            quotes.map((quote) => {
              const isApproved = quote.status === 'approved';
              const hasDiscount = quote.discount_type && quote.discount_value > 0;

              return (
                <div 
                  key={quote.id} 
                  className={`p-3 rounded-lg border ${
                    isApproved 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  {/* Header: Number + Status + Value */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{quote.quote_number}</span>
                      {getStatusBadge(quote)}
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(Number(quote.total_amount))}
                    </span>
                  </div>

                  {/* Discount Info */}
                  {hasDiscount && (
                    <p className="text-xs text-green-600 mb-2">
                      Desconto: {quote.discount_type === 'percentage' 
                        ? `${quote.discount_value}%` 
                        : formatCurrency(quote.discount_value)}
                    </p>
                  )}

                  {/* Approval Info */}
                  {isApproved && quote.approved_at && (
                    <p className="text-xs text-green-600 mb-2">
                      ✓ Por {quote.approved_by_name} em{" "}
                      {format(new Date(quote.approved_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}

                  {/* Correction Notes */}
                  {quote.status === 'correction_requested' && quote.correction_notes && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs mb-2">
                      <strong>Correção:</strong> "{quote.correction_notes}"
                    </div>
                  )}

                  {/* Date Info */}
                  <p className="text-xs text-muted-foreground mb-2">
                    Criado em {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    {quote.valid_until && !isApproved && (
                      <> • Válido até {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}</>
                    )}
                  </p>

                  <Separator className="my-2" />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuote(quote)}
                    >
                      {canManageQuote && !isApproved ? (
                        <>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </>
                      )}
                    </Button>

                    {quote.token && (quote.status === 'sent' || quote.status === 'draft') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(quote)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Link
                      </Button>
                    )}

                    {canManageQuote && !isApproved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(quote)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    )}

                    {isApproved && (
                      <Button
                        size="sm"
                        className="bg-primary"
                        disabled
                        title="Em breve: Integração com Rede"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Cobrar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum orçamento gerado ainda
              </p>
              {canManageQuote && (
                <Button onClick={handleNewQuote}>
                  <FileText className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Editor Modal */}
      <QuoteEditorModal
        open={showEditorModal}
        onOpenChange={setShowEditorModal}
        taskId={taskId}
        customerName={customerName}
        customerPhone={customerPhone}
        customerId={customerId}
        existingQuote={selectedQuote}
        onQuoteUpdated={loadQuotes}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Orçamento #{quoteToDelete?.quote_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              O orçamento será desativado e não aparecerá mais na lista. 
              Esta ação pode ser revertida pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
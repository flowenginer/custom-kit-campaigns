import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Package, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  RefreshCcw,
  Clock,
  FileText
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
  created_at: string;
}

const Quote = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadQuote();
    }
  }, [token]);

  const loadQuote = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("quotes")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Orçamento não encontrado");
        setLoading(false);
        return;
      }

      // Check if expired
      if (isPast(new Date(data.valid_until)) && data.status === 'sent') {
        await supabase
          .from("quotes")
          .update({ status: 'expired' })
          .eq("id", data.id);
        data.status = 'expired';
      }

      // Get customer name from task
      const { data: task } = await supabase
        .from("design_tasks")
        .select("order_id")
        .eq("id", data.task_id)
        .maybeSingle();

      if (task?.order_id) {
        const { data: order } = await supabase
          .from("orders")
          .select("customer_name")
          .eq("id", task.order_id)
          .maybeSingle();

        if (order) {
          setCustomerName(order.customer_name || "");
        }
      }

      setQuote({
        ...data,
        items: (data.items || []) as unknown as QuoteItem[],
        subtotal_before_discount: Number(data.subtotal_before_discount) || Number(data.total_amount),
        discount_type: data.discount_type || null,
        discount_value: Number(data.discount_value) || 0
      } as Quote);
    } catch (err) {
      console.error("Error loading quote:", err);
      setError("Erro ao carregar orçamento");
    }
    setLoading(false);
  };

  const handleRequestCorrection = async () => {
    if (!correctionNotes.trim()) {
      toast.error("Por favor, descreva as alterações necessárias");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          status: 'correction_requested',
          correction_notes: correctionNotes
        })
        .eq("id", quote!.id);

      if (updateError) throw updateError;

      toast.success("Solicitação enviada!", {
        description: "O vendedor será notificado sobre sua solicitação"
      });
      
      setQuote(prev => prev ? { ...prev, status: 'correction_requested', correction_notes: correctionNotes } : null);
      setShowCorrectionForm(false);
    } catch (err) {
      console.error("Error requesting correction:", err);
      toast.error("Erro ao enviar solicitação");
    }
    setSubmitting(false);
  };

  const handleApprove = async () => {
    const approverName = prompt("Por favor, informe seu nome para confirmar a aprovação:");
    
    if (!approverName?.trim()) {
      toast.error("Nome é obrigatório para aprovar");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_name: approverName.trim()
        })
        .eq("id", quote!.id);

      if (updateError) throw updateError;

      toast.success("Orçamento aprovado!", {
        description: "Obrigado! O vendedor será notificado"
      });
      
      setQuote(prev => prev ? { 
        ...prev, 
        status: 'approved', 
        approved_at: new Date().toISOString(),
        approved_by_name: approverName.trim()
      } : null);
    } catch (err) {
      console.error("Error approving quote:", err);
      toast.error("Erro ao aprovar orçamento");
    }
    setSubmitting(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Orçamento não encontrado</h2>
            <p className="text-muted-foreground">
              O link do orçamento pode estar incorreto ou expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quote.status === 'expired' || isPast(new Date(quote.valid_until));
  const isApproved = quote.status === 'approved';
  const isCorrectionRequested = quote.status === 'correction_requested';
  const canTakeAction = !isExpired && !isApproved && !isCorrectionRequested;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <FileText className="h-12 w-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold">Orçamento</h1>
          <p className="text-muted-foreground">#{quote.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Status Banner */}
        {isApproved && (
          <Card className="mb-6 border-green-500/50 bg-green-500/10">
            <CardContent className="py-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold text-green-700 dark:text-green-400">
                Orçamento Aprovado
              </h3>
              <p className="text-sm text-muted-foreground">
                Aprovado por {quote.approved_by_name} em{" "}
                {format(new Date(quote.approved_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        )}

        {isExpired && !isApproved && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="py-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-destructive mb-2" />
              <h3 className="font-semibold text-destructive">Orçamento Expirado</h3>
              <p className="text-sm text-muted-foreground">
                Este orçamento expirou em{" "}
                {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        )}

        {isCorrectionRequested && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="py-4 text-center">
              <RefreshCcw className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                Correção Solicitada
              </h3>
              <p className="text-sm text-muted-foreground">
                Aguardando ajustes do vendedor
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quote Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{customerName || "Cliente"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Criado em: {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={isExpired ? "destructive" : isApproved ? "default" : "secondary"}>
                  {isApproved && "Aprovado"}
                  {isExpired && !isApproved && "Expirado"}
                  {isCorrectionRequested && "Em Revisão"}
                  {canTakeAction && "Aguardando Resposta"}
                </Badge>
                {!isExpired && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Válido até: {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quote Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(quote.items as QuoteItem[]).map((item, index) => (
              <div key={index}>
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço unitário:</span>
                        <p className="font-medium">{formatCurrency(item.unit_price)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantidade:</span>
                        <p className="font-medium">{item.quantity} un.</p>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
                {index < (quote.items as QuoteItem[]).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-6 space-y-3">
            {quote.discount_type && quote.discount_value > 0 && (
              <>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quote.subtotal_before_discount)}</span>
                </div>
                <div className="flex items-center justify-between text-green-600">
                  <span>
                    Desconto ({quote.discount_type === 'percentage' 
                      ? `${quote.discount_value}%` 
                      : formatCurrency(quote.discount_value)})
                  </span>
                  <span>-{formatCurrency(quote.subtotal_before_discount - Number(quote.total_amount))}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">TOTAL</span>
              </div>
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(Number(quote.total_amount))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canTakeAction && (
          <div className="space-y-4">
            {showCorrectionForm ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label>Descreva as alterações necessárias</Label>
                    <Textarea
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      placeholder="Ex: Gostaria de alterar a quantidade de camisas regata de 10 para 15..."
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowCorrectionForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleRequestCorrection}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Enviar Solicitação"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16"
                  onClick={() => setShowCorrectionForm(true)}
                >
                  <RefreshCcw className="h-5 w-5 mr-2" />
                  Solicitar Correção
                </Button>
                <Button
                  size="lg"
                  className="h-16 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Aprovar Orçamento
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Dúvidas? Entre em contato com seu vendedor.</p>
        </div>
      </div>
    </div>
  );
};

export default Quote;

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, FileText, Package, DollarSign } from "lucide-react";

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
  valid_until: string;
  created_at: string;
}

interface QuotePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  customerName: string;
  customerPhone?: string;
  onQuoteSent?: () => void;
}

export const QuotePreviewModal = ({
  open,
  onOpenChange,
  taskId,
  customerName,
  customerPhone,
  onQuoteSent
}: QuotePreviewModalProps) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (open && taskId) {
      loadOrGenerateQuote();
    }
  }, [open, taskId]);

  const loadOrGenerateQuote = async () => {
    setLoading(true);
    try {
      // Check if quote already exists for this task
      const { data: existingQuote, error: fetchError } = await supabase
        .from("quotes")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingQuote && existingQuote.status !== 'expired') {
        setQuote({
          ...existingQuote,
          items: (existingQuote.items || []) as unknown as QuoteItem[]
        } as Quote);
        setQuoteItems((existingQuote.items || []) as unknown as QuoteItem[]);
        setTotalAmount(Number(existingQuote.total_amount));
        setLoading(false);
        return;
      }

      // Generate new quote from task layouts
      await generateQuoteFromLayouts();
    } catch (error) {
      console.error("Error loading quote:", error);
      toast.error("Erro ao carregar orçamento");
    }
    setLoading(false);
  };

  const generateQuoteFromLayouts = async () => {
    // Fetch task layouts
    const { data: layouts, error: layoutsError } = await supabase
      .from("design_task_layouts")
      .select("*")
      .eq("task_id", taskId);

    if (layoutsError || !layouts || layouts.length === 0) {
      toast.error("Nenhum layout encontrado para gerar orçamento");
      return;
    }

    const items: QuoteItem[] = [];

    for (const layout of layouts) {
      let productName = layout.campaign_name || "Produto";
      let productImage = "";
      let unitPrice = 0;

      // Try to get product info from shirt_models
      if (layout.model_id) {
        const { data: model } = await supabase
          .from("shirt_models")
          .select("name, photo_main, base_price, segment_tag, model_tag")
          .eq("id", layout.model_id)
          .maybeSingle();

        if (model) {
          productName = model.name;
          productImage = model.photo_main || "";
          unitPrice = Number(model.base_price) || 0;
        }
      } else if (layout.model_name) {
        // Search by model_name in shirt_models
        const { data: models } = await supabase
          .from("shirt_models")
          .select("name, photo_main, base_price, segment_tag, model_tag")
          .ilike("name", `%${layout.model_name}%`)
          .limit(1);

        if (models && models.length > 0) {
          productName = models[0].name;
          productImage = models[0].photo_main || "";
          unitPrice = Number(models[0].base_price) || 0;
        }
      }

      // If still no price, try to find by segment and model tags
      if (unitPrice === 0) {
        const campaignName = layout.campaign_name?.toLowerCase() || "";
        const uniformType = layout.uniform_type?.toLowerCase() || "";
        
        // Try finding product by tags
        const { data: matchedModels } = await supabase
          .from("shirt_models")
          .select("name, photo_main, base_price, segment_tag, model_tag")
          .limit(5);

        if (matchedModels) {
          for (const model of matchedModels) {
            const modelName = model.name?.toLowerCase() || "";
            if (
              (campaignName && modelName.includes(campaignName.split(" ")[0])) ||
              (uniformType && modelName.includes(uniformType))
            ) {
              productName = model.name;
              productImage = model.photo_main || "";
              unitPrice = Number(model.base_price) || 0;
              break;
            }
          }
        }
      }

      // Include uniform type in product name if available
      if (layout.uniform_type && !productName.toLowerCase().includes(layout.uniform_type.toLowerCase())) {
        productName = `${productName} - ${layout.uniform_type}`;
      }

      const quantity = layout.quantity || 1;
      const subtotal = unitPrice * quantity;

      items.push({
        layout_id: layout.id,
        product_name: productName,
        segment_tag: layout.campaign_name || "",
        model_tag: layout.uniform_type || "",
        product_image: productImage,
        unit_price: unitPrice,
        quantity,
        subtotal
      });
    }

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    
    setQuoteItems(items);
    setTotalAmount(total);
  };

  const handleSendQuote = async () => {
    setSending(true);
    try {
      const token = crypto.randomUUID();
      const validUntil = addDays(new Date(), 7);

      // Create or update quote in database
      const { data: newQuote, error: createError } = await supabase
        .from("quotes")
        .insert({
          task_id: taskId,
          token,
          status: 'sent',
          items: quoteItems as unknown as any,
          total_amount: totalAmount,
          valid_until: validUntil.toISOString(),
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get webhook config for quote sending
      const { data: webhookConfig } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("event_type", "orcamento_enviado")
        .eq("is_active", true)
        .maybeSingle();

      if (webhookConfig?.webhook_url) {
        const quoteUrl = `${window.location.origin}/quote/${token}`;
        
        // Send webhook
        await fetch(webhookConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: "orcamento_enviado",
            quote_id: newQuote.id,
            task_id: taskId,
            customer: {
              name: customerName,
              phone: customerPhone
            },
            quote_url: quoteUrl,
            total_amount: totalAmount,
            valid_until: validUntil.toISOString(),
            items: quoteItems,
            timestamp: new Date().toISOString()
          })
        });
      }

      setQuote({
        ...newQuote,
        items: (newQuote.items || []) as unknown as QuoteItem[]
      } as Quote);
      toast.success("Orçamento enviado com sucesso!", {
        description: "O cliente receberá o link para visualizar"
      });
      onQuoteSent?.();
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Erro ao enviar orçamento");
    }
    setSending(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    Data: {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={quote?.status === 'approved' ? 'default' : 'secondary'}>
                    {quote?.status === 'draft' && 'Rascunho'}
                    {quote?.status === 'sent' && 'Enviado'}
                    {quote?.status === 'approved' && 'Aprovado'}
                    {quote?.status === 'correction_requested' && 'Correção Solicitada'}
                    {!quote && 'Novo'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Válido até: {format(addDays(new Date(), 7), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Quote Items */}
              <div className="space-y-3">
                {quoteItems.map((item, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.product_name}</h4>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <p>Preço unitário: {formatCurrency(item.unit_price)}</p>
                            <p>Quantidade: {item.quantity} unidade(s)</p>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-muted-foreground">Subtotal</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {quoteItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item encontrado para o orçamento</p>
                  <p className="text-sm">Verifique se os layouts possuem quantidade definida</p>
                </div>
              )}

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-semibold">TOTAL DO ORÇAMENTO</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {(!quote || quote.status === 'draft') && quoteItems.length > 0 && (
            <Button onClick={handleSendQuote} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Orçamento
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

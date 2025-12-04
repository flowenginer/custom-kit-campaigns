import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Send, 
  FileText, 
  Package, 
  DollarSign, 
  Trash2, 
  Copy, 
  Check,
  Link2,
  Percent,
  Edit2,
  Save,
  RefreshCw,
  ExternalLink,
  Truck
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
  created_at: string;
  sent_at: string | null;
  shipping_options?: ShippingOption[];
  shipping_value?: number;
}

interface ShippingOption {
  id: string;
  name: string;
  company: { name: string; picture: string };
  price: number;
  delivery_time: number;
  currency: string;
}

interface QuoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string | null;
  existingQuote?: Quote | null;
  onQuoteUpdated?: () => void;
}

export const QuoteEditorModal = ({
  open,
  onOpenChange,
  taskId,
  customerName,
  customerPhone,
  customerId,
  existingQuote,
  onQuoteUpdated
}: QuoteEditorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(existingQuote || null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [discountType, setDiscountType] = useState<string>("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [quotingShipping, setQuotingShipping] = useState(false);

  useEffect(() => {
    if (open) {
      loadCustomDomain();
      if (existingQuote) {
        setQuote(existingQuote);
        setQuoteItems(existingQuote.items || []);
        setDiscountType(existingQuote.discount_type || "none");
        setDiscountValue(existingQuote.discount_value || 0);
        setShippingOptions((existingQuote.shipping_options || []) as ShippingOption[]);
        if (existingQuote.token) {
          const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
          setGeneratedLink(`${baseUrl}/quote/${existingQuote.token}`);
        }
      } else {
        generateQuoteFromLayouts();
        setShippingOptions([]);
      }
    }
  }, [open, existingQuote]);

  useEffect(() => {
    if (quote?.token && customDomain !== null) {
      const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
      setGeneratedLink(`${baseUrl}/quote/${quote.token}`);
    }
  }, [customDomain, quote?.token]);

  const loadCustomDomain = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("custom_domain")
        .single();

      if (error) throw error;
      setCustomDomain(data?.custom_domain || null);
    } catch (error) {
      console.error("Erro ao carregar domínio:", error);
      setCustomDomain(null);
    }
  };

  const generateQuoteFromLayouts = async () => {
    setLoading(true);
    try {
      const { data: layouts, error: layoutsError } = await supabase
        .from("design_task_layouts")
        .select("*")
        .eq("task_id", taskId);

      if (layoutsError || !layouts || layouts.length === 0) {
        toast.error("Nenhum layout encontrado para gerar orçamento");
        setLoading(false);
        return;
      }

      const items: QuoteItem[] = [];

      for (const layout of layouts) {
        let productName = layout.campaign_name || "Produto";
        let productImage = "";
        let unitPrice = 0;

        if (layout.model_id) {
          const { data: model } = await supabase
            .from("shirt_models")
            .select("name, photo_main, base_price")
            .eq("id", layout.model_id)
            .maybeSingle();

          if (model) {
            productName = model.name;
            productImage = model.photo_main || "";
            unitPrice = Number(model.base_price) || 0;
          }
        } else if (layout.model_name) {
          const { data: models } = await supabase
            .from("shirt_models")
            .select("name, photo_main, base_price")
            .ilike("name", `%${layout.model_name}%`)
            .limit(1);

          if (models && models.length > 0) {
            productName = models[0].name;
            productImage = models[0].photo_main || "";
            unitPrice = Number(models[0].base_price) || 0;
          }
        }

        if (layout.uniform_type && !productName.toLowerCase().includes(layout.uniform_type.toLowerCase())) {
          productName = `${productName} - ${layout.uniform_type}`;
        }

        const quantity = layout.quantity || 1;

        items.push({
          layout_id: layout.id,
          product_name: productName,
          segment_tag: layout.campaign_name || "",
          model_tag: layout.uniform_type || "",
          product_image: productImage,
          unit_price: unitPrice,
          quantity,
          subtotal: unitPrice * quantity
        });
      }

      setQuoteItems(items);
    } catch (error) {
      console.error("Error generating quote:", error);
      toast.error("Erro ao gerar orçamento");
    }
    setLoading(false);
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + item.subtotal, 0);
    let total = subtotal;
    
    if (discountType === "percentage" && discountValue > 0) {
      total = subtotal * (1 - discountValue / 100);
    } else if (discountType === "fixed" && discountValue > 0) {
      total = subtotal - discountValue;
    }
    
    return { subtotal, total: Math.max(0, total) };
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unit_price', value: number) => {
    const newItems = [...quoteItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      subtotal: field === 'quantity' 
        ? value * newItems[index].unit_price 
        : newItems[index].quantity * value
    };
    setQuoteItems(newItems);
  };

  const handleQuoteShipping = async () => {
    if (!customerId) {
      toast.error("Cliente não possui cadastro com endereço");
      return;
    }

    setQuotingShipping(true);
    try {
      // Calculate total quantity
      const totalQuantity = quoteItems.reduce((sum, item) => sum + item.quantity, 0);

      const { data, error } = await supabase.functions.invoke('melhor-envio-integration', {
        body: {
          action: 'calculate',
          taskId,
          customerId,
          quantity: totalQuantity
        }
      });

      if (error) throw error;

      if (data?.options && data.options.length > 0) {
        setShippingOptions(data.options);
        toast.success(`${data.options.length} opções de frete encontradas!`);
      } else {
        toast.warning("Nenhuma opção de frete disponível");
      }
    } catch (error) {
      console.error("Error quoting shipping:", error);
      toast.error("Erro ao cotar frete");
    }
    setQuotingShipping(false);
  };

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      const { subtotal, total } = calculateTotals();
      const token = quote?.token || crypto.randomUUID();
      const validUntil = addDays(new Date(), 7);

      const quoteData = {
        task_id: taskId,
        token,
        status: 'draft',
        items: quoteItems as unknown as any,
        total_amount: total,
        subtotal_before_discount: subtotal,
        discount_type: discountType === "none" ? null : discountType,
        discount_value: discountType === "none" ? 0 : discountValue,
        valid_until: validUntil.toISOString(),
        shipping_options: shippingOptions.length > 0 ? (shippingOptions as unknown as any) : null
      };

      let savedQuote;

      if (quote?.id) {
        const { data, error } = await supabase
          .from("quotes")
          .update(quoteData)
          .eq("id", quote.id)
          .select()
          .single();

        if (error) throw error;
        savedQuote = data;
      } else {
        const { data, error } = await supabase
          .from("quotes")
          .insert(quoteData)
          .select()
          .single();

        if (error) throw error;
        savedQuote = data;
      }

      setQuote({
        ...savedQuote,
        items: (savedQuote.items || []) as unknown as QuoteItem[]
      } as Quote);

      const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
      setGeneratedLink(`${baseUrl}/quote/${token}`);
      
      toast.success("Orçamento salvo!");
      onQuoteUpdated?.();
    } catch (error) {
      console.error("Error saving quote:", error);
      toast.error("Erro ao salvar orçamento");
    }
    setSaving(false);
  };

  const handleSendQuote = async () => {
    if (!quote?.id) {
      toast.error("Salve o orçamento primeiro");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq("id", quote.id);

      if (error) throw error;

      // Send webhook
      const { data: webhookConfig } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("event_type", "orcamento_enviado")
        .eq("is_active", true)
        .maybeSingle();

      if (webhookConfig?.webhook_url) {
        const { subtotal, total } = calculateTotals();
        
        await fetch(webhookConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: "orcamento_enviado",
            quote_id: quote.id,
            task_id: taskId,
            customer: { name: customerName, phone: customerPhone },
            quote_url: generatedLink,
            total_amount: total,
            discount_type: discountType,
            discount_value: discountValue,
            valid_until: quote.valid_until,
            items: quoteItems,
            timestamp: new Date().toISOString()
          })
        });
      }

      setQuote({ ...quote, status: 'sent', sent_at: new Date().toISOString() });
      toast.success("Orçamento enviado com sucesso!");
      onQuoteUpdated?.();
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Erro ao enviar orçamento");
    }
    setSending(false);
  };

  const handleDeleteQuote = async () => {
    if (!quote?.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quote.id);

      if (error) throw error;

      toast.success("Orçamento excluído!");
      setQuote(null);
      setGeneratedLink(null);
      onQuoteUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting quote:", error);
      toast.error("Erro ao excluir orçamento");
    }
    setDeleting(false);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!generatedLink || !quote) return;
    
    setSendingWhatsApp(true);
    
    try {
      const { subtotal, total } = calculateTotals();
      
      const webhookPayload = {
        event: 'quote_whatsapp',
        quote_url: generatedLink,
        card_data: {
          id: quote.id,
          task_id: taskId,
          customer_name: customerName,
          customer_phone: customerPhone || '',
          status: quote.status
        },
        quote: {
          id: quote.id,
          token: quote.token,
          total_amount: total,
          subtotal_before_discount: subtotal,
          discount_type: discountType === "none" ? null : discountType,
          discount_value: discountValue,
          valid_until: quote.valid_until,
          items: quoteItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal
          }))
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://nwh.techspacesports.com.br/webhook/events_criacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) throw new Error('REQUEST_FAILED');

      toast.success('Orçamento enviado via WhatsApp com sucesso!');
      
      // Close modal after success
      setTimeout(() => onOpenChange(false), 1000);
      
    } catch (error) {
      console.error('Erro ao enviar via WhatsApp:', error);
      toast.error('Erro ao enviar via WhatsApp. Tente novamente.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const { subtotal, total } = calculateTotals();
  const hasDiscount = discountType !== "none" && discountValue > 0;
  const isSent = quote?.status === 'sent';
  const isApproved = quote?.status === 'approved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {quote?.id ? "Editar Orçamento" : "Criar Orçamento"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-4 p-1">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                {quote && (
                  <Badge variant={isApproved ? "default" : isSent ? "secondary" : "outline"}>
                    {quote.status === 'draft' && 'Rascunho'}
                    {quote.status === 'sent' && 'Enviado'}
                    {quote.status === 'approved' && 'Aprovado'}
                    {quote.status === 'correction_requested' && 'Correção'}
                    {quote.status === 'expired' && 'Expirado'}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Quote Items */}
              <div className="space-y-3">
                {quoteItems.map((item, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.product_name}</h4>
                          
                          {editingItemIndex === index ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Preço Unit.</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Qtd.</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <span>{formatCurrency(item.unit_price)} × {item.quantity}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                          <p className="font-semibold text-primary text-sm">
                            {formatCurrency(item.subtotal)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 mt-1"
                            onClick={() => setEditingItemIndex(editingItemIndex === index ? null : index)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {quoteItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item encontrado</p>
                </div>
              )}

              <Separator />

              {/* Discount Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Desconto
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de desconto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem desconto</SelectItem>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {discountType !== "none" && (
                    <Input
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      max={discountType === "percentage" ? "100" : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === "percentage" ? "%" : "R$"}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Shipping Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Opções de Frete
                  </Label>
                  {customerId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleQuoteShipping}
                      disabled={quotingShipping}
                    >
                      {quotingShipping ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Truck className="h-4 w-4 mr-2" />
                      )}
                      Cotar Frete
                    </Button>
                  )}
                </div>
                
                {!customerId && (
                  <p className="text-xs text-muted-foreground">
                    Cliente sem cadastro. Cadastre o cliente para cotar frete.
                  </p>
                )}
                
                {shippingOptions.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {shippingOptions.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          {option.company.picture && (
                            <img src={option.company.picture} alt={option.company.name} className="h-5 w-8 object-contain" />
                          )}
                          <span>{option.company.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(option.price)}</span>
                          <span className="text-xs text-muted-foreground ml-2">{option.delivery_time}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                {hasDiscount && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto ({discountType === "percentage" ? `${discountValue}%` : formatCurrency(discountValue)})</span>
                      <span>-{formatCurrency(subtotal - total)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold">TOTAL</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Generated Link */}
              {generatedLink && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Link do Orçamento
                    </Label>
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="text-xs" />
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
                    <p className="text-xs text-muted-foreground">
                      Válido até: {format(addDays(new Date(), 7), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    
                    {/* WhatsApp Button */}
                    <Button 
                      variant="outline" 
                      className="w-full text-green-700 border-green-500/50 hover:bg-green-500/10"
                      onClick={handleShareWhatsApp}
                      disabled={sendingWhatsApp}
                    >
                      {sendingWhatsApp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Enviar via WhatsApp
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {quote?.id && (
            <Button
              variant="destructive"
              onClick={handleDeleteQuote}
              disabled={deleting || isApproved}
              className="w-full sm:w-auto"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Excluir
            </Button>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Fechar
            </Button>
            
            <Button 
              onClick={handleSaveQuote} 
              disabled={saving || quoteItems.length === 0}
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {quote?.id ? "Salvar" : "Gerar Link"}
            </Button>

            {generatedLink && !isApproved && (
              <Button 
                onClick={handleSendQuote} 
                disabled={sending}
                className="flex-1 sm:flex-none"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                {isSent ? "Reenviar" : "Enviar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
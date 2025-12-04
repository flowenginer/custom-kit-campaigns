import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Truck,
  Plus,
  TrendingUp
} from "lucide-react";
import { SizeGridSelector, SizeGrid, createEmptySizeGrid, calculateGridTotal, calculatePlusSizeCount } from "@/components/quotes/SizeGridSelector";
import logoSS from "@/assets/logo-ss.png";

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

interface ShippingOption {
  id: string;
  name: string;
  company: { name: string; picture: string };
  price: number;
  delivery_time: number;
  currency: string;
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
  shipping_options?: ShippingOption[];
  selected_shipping?: ShippingOption | null;
  shipping_value?: number;
}

const PLUS_SIZE_ADDITIONAL = 10; // R$10 por peça plus size

const Quote = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sizeSelections, setSizeSelections] = useState<Record<number, SizeGrid>>({});
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);

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

      const quoteData = {
        ...data,
        items: (data.items || []) as unknown as QuoteItem[],
        subtotal_before_discount: Number(data.subtotal_before_discount) || Number(data.total_amount),
        discount_type: data.discount_type || null,
        discount_value: Number(data.discount_value) || 0,
        shipping_options: (data.shipping_options || []) as unknown as ShippingOption[],
        selected_shipping: data.selected_shipping as unknown as ShippingOption | null,
        shipping_value: Number(data.shipping_value) || 0
      } as Quote;

      setQuote(quoteData);
      
      // Set selected shipping if exists
      if (quoteData.selected_shipping?.id) {
        setSelectedShippingId(quoteData.selected_shipping.id);
      }

      // Se o status é 'sent' (orçamento novo/atualizado), limpar grades antigas
      if (data.status === 'sent') {
        // Deletar seleções antigas para este orçamento
        await supabase
          .from("quote_size_selections")
          .delete()
          .eq("quote_id", data.id);
        
        // Inicializar com grades vazias
        const initialSelections: Record<number, SizeGrid> = {};
        quoteData.items.forEach((_, index) => {
          initialSelections[index] = createEmptySizeGrid();
        });
        setSizeSelections(initialSelections);
      } else {
        // Para outros status, carregar seleções existentes
        const { data: existingSelections } = await supabase
          .from("quote_size_selections")
          .select("*")
          .eq("quote_id", data.id);

        const initialSelections: Record<number, SizeGrid> = {};
        quoteData.items.forEach((_, index) => {
          const existing = existingSelections?.find(s => s.item_index === index);
          initialSelections[index] = existing?.size_grid 
            ? (existing.size_grid as unknown as SizeGrid)
            : createEmptySizeGrid();
        });
        setSizeSelections(initialSelections);
      }

    } catch (err) {
      console.error("Error loading quote:", err);
      setError("Erro ao carregar orçamento");
    }
    setLoading(false);
  };

  // Dynamic calculations
  const dynamicTotals = useMemo(() => {
    if (!quote) return { plusSizeCount: 0, plusSizeTotal: 0, extraQuantity: 0, extraQuantityTotal: 0, totalSelectedQuantity: 0 };
    
    let totalPlusSizeCount = 0;
    let totalExtraQuantity = 0;
    let totalSelectedQuantity = 0;
    
    quote.items.forEach((item, index) => {
      const grid = sizeSelections[index];
      if (!grid) return;
      
      const gridTotal = calculateGridTotal(grid);
      const plusCount = calculatePlusSizeCount(grid);
      
      totalSelectedQuantity += gridTotal;
      totalPlusSizeCount += plusCount;
      
      // Quantidade excedente para este item
      if (gridTotal > item.quantity) {
        totalExtraQuantity += gridTotal - item.quantity;
      }
    });
    
    // Usar o preço unitário do primeiro item para unidades extras
    const unitPrice = quote.items[0]?.unit_price || 0;
    
    return {
      plusSizeCount: totalPlusSizeCount,
      plusSizeTotal: totalPlusSizeCount * PLUS_SIZE_ADDITIONAL,
      extraQuantity: totalExtraQuantity,
      extraQuantityTotal: totalExtraQuantity * unitPrice,
      totalSelectedQuantity
    };
  }, [quote, sizeSelections]);

  const handleSizeGridChange = async (itemIndex: number, grid: SizeGrid) => {
    setSizeSelections(prev => ({ ...prev, [itemIndex]: grid }));
    
    if (!quote) return;

    const totalQuantity = calculateGridTotal(grid);
    const item = quote.items[itemIndex];

    // Upsert size selection - first try to find existing
    const { data: existing } = await supabase
      .from("quote_size_selections")
      .select("id")
      .eq("quote_id", quote.id)
      .eq("item_index", itemIndex)
      .maybeSingle();

    const gridJson = JSON.parse(JSON.stringify(grid));

    if (existing) {
      await supabase
        .from("quote_size_selections")
        .update({
          size_grid: gridJson,
          total_quantity: totalQuantity
        })
        .eq("id", existing.id);
    } else {
      const insertData = {
        quote_id: quote.id,
        item_index: itemIndex,
        layout_id: item.layout_id || null,
        size_grid: gridJson,
        total_quantity: totalQuantity
      };
      await supabase
        .from("quote_size_selections")
        .insert(insertData as any);
    }
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

  const validateSizeGrids = (): boolean => {
    if (!quote) return false;
    
    for (let i = 0; i < quote.items.length; i++) {
      const item = quote.items[i];
      const grid = sizeSelections[i];
      
      if (!grid) {
        toast.error(`Por favor, preencha a grade de tamanhos do Layout ${i + 1}`);
        return false;
      }
      
      const total = calculateGridTotal(grid);
      // Agora permite exceder, mas não pode ser menor
      if (total < item.quantity) {
        toast.error(`O Layout ${i + 1} precisa ter pelo menos ${item.quantity} unidades (atual: ${total})`);
        return false;
      }
    }
    return true;
  };

  const handleShippingSelect = async (shippingId: string) => {
    if (!quote) return;
    
    const selectedOption = quote.shipping_options?.find(opt => opt.id === shippingId);
    if (!selectedOption) return;
    
    setSelectedShippingId(shippingId);
    
    // Update quote in database
    await supabase
      .from("quotes")
      .update({
        selected_shipping: selectedOption as any,
        shipping_value: selectedOption.price
      })
      .eq("id", quote.id);
    
    setQuote(prev => prev ? {
      ...prev,
      selected_shipping: selectedOption,
      shipping_value: selectedOption.price
    } : null);
  };

  const getSelectedShipping = (): ShippingOption | null => {
    if (!quote || !selectedShippingId) return null;
    return quote.shipping_options?.find(opt => opt.id === selectedShippingId) || null;
  };

  const calculateFinalTotal = (): number => {
    if (!quote) return 0;
    const selectedShipping = getSelectedShipping();
    const baseTotal = Number(quote.total_amount);
    const shippingValue = selectedShipping?.price || 0;
    
    return baseTotal + dynamicTotals.plusSizeTotal + dynamicTotals.extraQuantityTotal + shippingValue;
  };

  const hasShippingOptions = quote?.shipping_options && quote.shipping_options.length > 0;

  const handleApprove = async () => {
    // Validate size grids
    if (!validateSizeGrids()) {
      return;
    }

    // Validate shipping selection if options exist
    if (hasShippingOptions && !selectedShippingId) {
      toast.error("Por favor, selecione uma opção de frete antes de aprovar");
      return;
    }

    const approverName = prompt("Por favor, informe seu nome para confirmar a aprovação:");
    
    if (!approverName?.trim()) {
      toast.error("Nome é obrigatório para aprovar");
      return;
    }

    setSubmitting(true);
    try {
      const selectedShipping = getSelectedShipping();
      const finalTotal = calculateFinalTotal();
      
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_name: approverName.trim(),
          selected_shipping: selectedShipping as any,
          shipping_value: selectedShipping?.price || 0,
          total_amount: finalTotal // Atualizar com valor final
        })
        .eq("id", quote!.id);

      if (updateError) throw updateError;

      // Update design_tasks with shipping info and final value
      await supabase
        .from("design_tasks")
        .update({
          shipping_option: selectedShipping as any,
          shipping_value: selectedShipping?.price || 0,
          order_value: finalTotal
        })
        .eq("id", quote!.task_id);

      // Send webhook with complete data
      const webhookPayload = {
        event: 'quote_approved',
        quote: {
          id: quote!.id,
          task_id: quote!.task_id,
          customer_name: customerName,
          original_quantity: quote!.items.reduce((acc, item) => acc + item.quantity, 0),
          final_quantity: dynamicTotals.totalSelectedQuantity,
          extra_quantity: dynamicTotals.extraQuantity,
          extra_quantity_total: dynamicTotals.extraQuantityTotal,
          plus_size_count: dynamicTotals.plusSizeCount,
          plus_size_total: dynamicTotals.plusSizeTotal,
          products_total: quote!.total_amount,
          shipping_value: selectedShipping?.price || 0,
          shipping_option: selectedShipping,
          final_total: finalTotal,
          approved_by: approverName.trim(),
          approved_at: new Date().toISOString()
        },
        items: quote!.items.map((item, index) => ({
          layout_id: item.layout_id,
          product_name: item.product_name,
          original_quantity: item.quantity,
          selected_quantity: calculateGridTotal(sizeSelections[index] || createEmptySizeGrid()),
          plus_size_count: calculatePlusSizeCount(sizeSelections[index] || createEmptySizeGrid()),
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          size_grid: sizeSelections[index] || {}
        })),
        timestamp: new Date().toISOString()
      };

      try {
        await fetch('https://nwh.techspacesports.com.br/webhook/events_criacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
      }

      toast.success("Orçamento aprovado!", {
        description: "Obrigado! O vendedor será notificado"
      });
      
      setQuote(prev => prev ? { 
        ...prev, 
        status: 'approved', 
        approved_at: new Date().toISOString(),
        approved_by_name: approverName.trim(),
        total_amount: finalTotal
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

  // Check if all size grids meet minimum quantity (>= not ==)
  const areAllGridsComplete = () => {
    if (!quote) return false;
    
    for (let i = 0; i < quote.items.length; i++) {
      const item = quote.items[i];
      const grid = sizeSelections[i];
      
      // Se não tem grid ou está vazio, não está completo
      if (!grid) return false;
      
      const total = calculateGridTotal(grid);
      
      // Precisa ter pelo menos a quantidade mínima
      if (total < item.quantity) return false;
    }
    
    return true;
  };

  const allGridsComplete = areAllGridsComplete();
  const originalQuantity = quote.items.reduce((acc, item) => acc + item.quantity, 0);
  const unitPrice = quote.items[0]?.unit_price || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <img 
            src={logoSS} 
            alt="Space Sports" 
            className="h-12 w-12 object-contain"
          />
          <div className="text-right">
            <h1 className="text-xl font-bold">Orçamento</h1>
            <p className="text-sm text-muted-foreground">#{quote.id.slice(0, 8).toUpperCase()}</p>
          </div>
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
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{customerName || "Cliente"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Criado em: {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge 
                  variant={isExpired ? "destructive" : isApproved ? "default" : "secondary"}
                  className="text-[10px] sm:text-xs whitespace-nowrap px-2"
                >
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
              <div key={index} className="space-y-4">
                {/* Mobile-optimized item layout */}
                <div className="flex gap-3">
                  {/* Product Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
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

                  {/* Product Info - Container 1: Name + Subtotal */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/30 rounded-lg p-3 h-full flex flex-col justify-between">
                      <h4 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">
                        {item.product_name}
                      </h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">Subtotal</span>
                        <p className="text-base sm:text-lg font-bold text-primary">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Container 2: Details - Price & Quantity */}
                <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Preço Unitário</span>
                    <p className="font-semibold text-sm sm:text-base">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Qtd. Mínima</span>
                    <p className="font-semibold text-sm sm:text-base">{item.quantity} un.</p>
                  </div>
                </div>

                {/* Size Grid Selector */}
                {canTakeAction && (
                  <SizeGridSelector
                    itemIndex={index}
                    productName={item.product_name}
                    requiredQuantity={item.quantity}
                    sizeGrid={sizeSelections[index] || createEmptySizeGrid()}
                    onChange={(grid) => handleSizeGridChange(index, grid)}
                    allowOverflow={true}
                  />
                )}

                {/* Show filled grid for approved/correction requested quotes */}
                {(isApproved || isCorrectionRequested) && sizeSelections[index] && calculateGridTotal(sizeSelections[index]) > 0 && (
                  <SizeGridSelector
                    itemIndex={index}
                    productName={item.product_name}
                    requiredQuantity={item.quantity}
                    sizeGrid={sizeSelections[index]}
                    onChange={() => {}}
                    disabled
                  />
                )}

                {index < (quote.items as QuoteItem[]).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Shipping Options */}
        {hasShippingOptions && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Opções de Entrega
                {!selectedShippingId && canTakeAction && (
                  <Badge variant="destructive" className="ml-2">Obrigatório</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedShippingId || ""}
                onValueChange={handleShippingSelect}
                disabled={!canTakeAction}
                className="space-y-3"
              >
                {quote.shipping_options?.map((option) => (
                  <div 
                    key={option.id} 
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedShippingId === option.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    } ${!canTakeAction ? 'opacity-70' : 'cursor-pointer'}`}
                    onClick={() => canTakeAction && handleShippingSelect(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <div className="flex items-center gap-3 flex-1">
                      {option.company.picture && (
                        <img 
                          src={option.company.picture} 
                          alt={option.company.name}
                          className="h-8 w-12 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{option.company.name}</p>
                        <p className="text-sm text-muted-foreground">{option.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatCurrency(option.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.delivery_time} {option.delivery_time === 1 ? 'dia útil' : 'dias úteis'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {/* Show selected shipping in approved state */}
              {(isApproved || isCorrectionRequested) && quote.selected_shipping && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    {quote.selected_shipping.company.picture && (
                      <img 
                        src={quote.selected_shipping.company.picture} 
                        alt={quote.selected_shipping.company.name}
                        className="h-8 w-12 object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Frete Selecionado: {quote.selected_shipping.company.name}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        {quote.selected_shipping.name} - {quote.selected_shipping.delivery_time} dias úteis
                      </p>
                    </div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(quote.selected_shipping.price)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dynamic Total with Breakdown */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-6 space-y-3">
            {/* Subtotal dos produtos base */}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Produtos ({originalQuantity} un)</span>
              <span>{formatCurrency(quote.subtotal_before_discount)}</span>
            </div>
            
            {/* Unidades Adicionais */}
            {dynamicTotals.extraQuantity > 0 && canTakeAction && (
              <div className="flex items-center justify-between text-blue-600">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Unidades Adicionais ({dynamicTotals.extraQuantity} un × {formatCurrency(unitPrice)})
                </span>
                <span>+{formatCurrency(dynamicTotals.extraQuantityTotal)}</span>
              </div>
            )}
            
            {/* Adicional Plus Size */}
            {dynamicTotals.plusSizeCount > 0 && canTakeAction && (
              <div className="flex items-center justify-between text-purple-600">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Plus Size ({dynamicTotals.plusSizeCount} un × R$ 10,00)
                </span>
                <span>+{formatCurrency(dynamicTotals.plusSizeTotal)}</span>
              </div>
            )}
            
            {/* Desconto */}
            {quote.discount_type && quote.discount_value > 0 && (
              <div className="flex items-center justify-between text-green-600">
                <span>
                  Desconto ({quote.discount_type === 'percentage' 
                    ? `${quote.discount_value}%` 
                    : formatCurrency(quote.discount_value)})
                </span>
                <span>-{formatCurrency(quote.subtotal_before_discount - Number(quote.total_amount))}</span>
              </div>
            )}
            
            {/* Frete */}
            {(getSelectedShipping() || quote.selected_shipping) && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Frete ({(getSelectedShipping() || quote.selected_shipping)?.company.name})
                </span>
                <span>{formatCurrency((getSelectedShipping() || quote.selected_shipping)?.price || 0)}</span>
              </div>
            )}
            
            {hasShippingOptions && !selectedShippingId && canTakeAction && (
              <div className="flex items-center justify-between text-orange-600">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Frete
                </span>
                <span className="text-sm">Selecione uma opção acima</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">TOTAL</span>
              </div>
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(calculateFinalTotal())}
              </span>
            </div>
            
            {/* Summary of extras when taking action */}
            {canTakeAction && (dynamicTotals.extraQuantity > 0 || dynamicTotals.plusSizeCount > 0) && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Total de peças: {dynamicTotals.totalSelectedQuantity} 
                {dynamicTotals.extraQuantity > 0 && ` (+${dynamicTotals.extraQuantity} extras)`}
                {dynamicTotals.plusSizeCount > 0 && ` • ${dynamicTotals.plusSizeCount} plus size`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warnings - Só mostra se realmente falta algo */}
        {canTakeAction && (hasShippingOptions && !selectedShippingId) && (
          <Card className="mb-6 border-orange-500/50 bg-orange-500/10">
            <CardContent className="py-4 text-center">
              <AlertCircle className="h-6 w-6 mx-auto text-orange-500 mb-2" />
              <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-sm">
                Ação Necessária
              </h3>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>• Selecione uma opção de frete</p>
              </div>
            </CardContent>
          </Card>
        )}

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
                  className={`h-16 ${allGridsComplete && (!hasShippingOptions || selectedShippingId) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  onClick={handleApprove}
                  disabled={submitting || !allGridsComplete || (hasShippingOptions && !selectedShippingId)}
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

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DesignTask } from "@/types/design-task";
import { useDraggable } from '@dnd-kit/core';
import { Shirt, User, ChevronDown, ChevronUp, Truck, Package, UserPlus, Pencil, Check, X } from "lucide-react";
import { ElapsedTimer } from "./ElapsedTimer";
import { CardFontSizes } from "@/hooks/useCardFontSizes";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShippingQuoteDialog } from "../orders/ShippingQuoteDialog";
import { BlingExportButton } from "../orders/BlingExportButton";
import { RequestCustomerRegistrationButton } from "../orders/RequestCustomerRegistrationButton";
import { abbreviateProductName } from "@/lib/productNameAbbreviator";
import { Input } from "@/components/ui/input";

interface TaskCardProps {
  task: DesignTask;
  onClick: () => void;
  fontSizes?: CardFontSizes;
  showAcceptButton?: boolean;
  currentUserId?: string;
  onTaskAccepted?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOrderNumberUpdate?: (taskId: string, orderNumber: string) => void;
  canEditCustomerName?: boolean;
  onCustomerNameUpdate?: (taskId: string, newName: string) => void;
  isDesigner?: boolean;
}

const getCreatorType = (task: DesignTask): string => {
  if (task.created_by_salesperson) return 'Vendedor';
  return 'Admin';
};

const getPriorityConfig = (priority: string) => {
  const configs = {
    urgent: { label: 'Urgente', variant: 'destructive' as const, color: 'bg-red-500' },
    normal: { label: 'Normal', variant: 'secondary' as const, color: 'bg-yellow-500' },
  };
  return configs[priority as keyof typeof configs] || configs.normal;
};

export const TaskCard = ({ 
  task, 
  onClick, 
  fontSizes, 
  isCollapsed = false, 
  onToggleCollapse, 
  onOrderNumberUpdate,
  canEditCustomerName = false,
  onCustomerNameUpdate,
  isDesigner = false
}: TaskCardProps) => {
  const [localOrderNumber, setLocalOrderNumber] = useState(task.order_number || '');
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(task.customer_name || '');
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const priorityConfig = getPriorityConfig(task.priority);

  const handleOrderNumberBlur = async () => {
    if (!localOrderNumber.trim() || localOrderNumber === task.order_number) return;
    
    // Verificar se já existe outro card com esse número
    const { data: existingTasks, error } = await supabase
      .from("design_tasks")
      .select("id, orders(customer_name)")
      .eq("order_number", localOrderNumber.trim())
      .is("deleted_at", null)
      .neq("id", task.id)
      .limit(1);
    
    if (existingTasks && existingTasks.length > 0) {
      const customerName = (existingTasks[0] as any).orders?.customer_name || "Desconhecido";
      toast.error(`Este número de pedido já existe! Pertence ao cliente: ${customerName}`);
      setLocalOrderNumber(task.order_number || ''); // Reverter
      return;
    }
    
    if (onOrderNumberUpdate) {
      onOrderNumberUpdate(task.id, localOrderNumber);
    }
  };

  const handleSaveCustomerName = async () => {
    if (!editedName.trim() || editedName === task.customer_name) {
      setIsEditingName(false);
      setEditedName(task.customer_name || '');
      return;
    }

    try {
      // Update orders table
      const { error } = await supabase
        .from("orders")
        .update({ customer_name: editedName.trim() })
        .eq("id", task.order_id);

      if (error) throw error;

      // Also update the lead if exists
      if (task.lead_id) {
        await supabase
          .from("leads")
          .update({ name: editedName.trim() })
          .eq("id", task.lead_id);
      }

      toast.success("Nome do cliente atualizado!");
      setIsEditingName(false);
      
      if (onCustomerNameUpdate) {
        onCustomerNameUpdate(task.id, editedName.trim());
      }
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      toast.error("Erro ao atualizar nome do cliente");
      setEditedName(task.customer_name || '');
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName(task.customer_name || '');
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card 
        className="border-2 border-amber-400 rounded-xl hover:shadow-lg transition-shadow bg-card"
      >
        <Collapsible open={!isCollapsed}>
          {/* Badge flutuante do tipo de criador */}
          <CollapsibleContent>
            <div className="flex justify-center -mt-3 relative z-10 gap-2 flex-wrap">
              <Badge className="bg-amber-500 text-white rounded-full px-4 py-1 font-semibold shadow-md" style={{ fontSize: `${fontSizes?.badge || 12}px` }}>
                {getCreatorType(task)}
              </Badge>
              {/* Badge de Cliente Cadastrado */}
              {task.customer_id && (
                <Badge className="bg-green-500 text-white rounded-full px-4 py-1 font-semibold shadow-md" style={{ fontSize: `${fontSizes?.badge || 12}px` }}>
                  ✓ Cliente Cadastrado
                </Badge>
              )}
              {/* Badge de Criação do Zero */}
              {task.customization_data?.fromScratch && (
                <Badge className="bg-green-600 text-white rounded-full px-4 py-1 font-semibold shadow-md" style={{ fontSize: `${fontSizes?.badge || 12}px` }}>
                  🎨 Criação do Zero
                </Badge>
              )}
            </div>
          </CollapsibleContent>

          <CardContent className="p-3 space-y-2.5">
            {/* Nome do Cliente - largura total com botão de toggle */}
            <div className="relative">
              <div 
                className="border-2 border-border rounded-lg px-3 py-2 bg-card text-center shadow-sm cursor-pointer"
                onClick={isEditingName ? undefined : onClick}
              >
                {isEditingName ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-center font-bold"
                      style={{ fontSize: `${fontSizes?.customerName || 14}px` }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomerName();
                        if (e.key === 'Escape') handleCancelEditName();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700"
                      onClick={handleSaveCustomerName}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={handleCancelEditName}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold text-card-foreground" style={{ fontSize: `${fontSizes?.customerName || 14}px` }}>{task.customer_name}</span>
                    {canEditCustomerName && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingName(true);
                          setEditedName(task.customer_name || '');
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
                {/* Campo de número do pedido quando status = approved */}
                {task.status === 'approved' && onOrderNumberUpdate && !isEditingName && (
                  <div className="mt-2 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">📝 Pedido:</span>
                    <input
                      type="text"
                      placeholder="Digite nº..."
                      value={localOrderNumber}
                      onChange={(e) => setLocalOrderNumber(e.target.value)}
                      onBlur={handleOrderNumberBlur}
                      className="border border-border rounded px-2 py-0.5 text-xs w-24 text-center bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                {/* Exibir número do pedido quando preenchido (fora do status approved) */}
                {task.order_number && task.status !== 'approved' && !isEditingName && (
                  <div className="mt-2 flex items-center justify-center">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-medium">
                      📝 Pedido: {task.order_number}
                    </Badge>
                  </div>
                )}
              </div>
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse();
                  }}
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {/* GRID 3 COLUNAS */}
            <CollapsibleContent className="animate-accordion-down">
              <div className="flex gap-2">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-1.5 shrink-0 w-auto max-w-[90px]">
                  {/* Segmento/Campanha - prioriza segmento real do cliente */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-medium text-card-foreground truncate" style={{ fontSize: `${fontSizes?.segment || 12}px` }}>
                      {task.business_segment_icon && `${task.business_segment_icon} `}
                      {task.business_segment_name || task.business_segment_other || task.campaign_name || task.segment_tag || 'N/A'}
                    </span>
                  </div>

                  {/* Quantidade */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card flex items-center justify-center gap-1 min-h-[36px]">
                    <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-card-foreground" style={{ fontSize: `${fontSizes?.quantity || 12}px` }}>{task.quantity} un.</span>
                  </div>

                  {/* Designer */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card flex items-center justify-center gap-1.5 min-h-[36px]">
                    {task.designer_name ? (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                            {task.designer_initials || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-card-foreground truncate flex-1" style={{ fontSize: `${fontSizes?.designer || 12}px` }}>
                          {task.designer_name.split(' ')[0]}
                        </span>
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground" style={{ fontSize: `${fontSizes?.designer || 12}px` }}>N/A</span>
                      </>
                    )}
                  </div>

                  {/* Status/Prioridade */}
                  <div className={`${priorityConfig.color} text-white rounded px-2 py-1.5 text-center min-h-[36px] flex items-center justify-center`}>
                    <span className="font-bold" style={{ fontSize: `${fontSizes?.priority || 12}px` }}>{priorityConfig.label}</span>
                  </div>
                </div>

                {/* COLUNA CENTRAL */}
                <div className="space-y-1.5 flex flex-col items-center flex-1 min-w-0">
                {/* Modelo */}
                  <div 
                    className="border border-border rounded px-2 py-1.5 bg-card flex items-center gap-1 w-full justify-center min-h-[32px]"
                    title={task.model_name || 'N/A'}
                  >
                    <span className="text-base">🎽</span>
                    <span className="font-medium text-card-foreground truncate" style={{ fontSize: `${fontSizes?.model || 10}px` }}>
                      {abbreviateProductName(task.model_name) || 'N/A'}
                    </span>
                  </div>

                  {/* Imagem - proporcional */}
                  {task.model_image_front ? (
                    <div className="flex-1 flex items-center justify-center w-full">
                      <img 
                        src={task.model_image_front} 
                        alt="Modelo" 
                        className="h-auto max-h-28 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-muted rounded w-full">
                      <Shirt className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-1.5 shrink-0 w-auto max-w-[90px]">
                  {/* Nome do Vendedor */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-bold text-teal-600 truncate" style={{ fontSize: `${fontSizes?.salesperson || 12}px` }}>
                      {task.creator_name || 'Sistema'}
                    </span>
                  </div>

                  {/* Versão */}
                  <div className="border border-border rounded px-2 py-1.5 bg-muted text-center min-h-[36px] flex items-center justify-center">
                    <span className="font-bold text-card-foreground" style={{ fontSize: `${fontSizes?.version || 12}px` }}>v{task.current_version || 1}</span>
                  </div>

                  {/* Timer 1 - Tempo total */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card text-center min-h-[36px] flex items-center justify-center">
                    <ElapsedTimer since={task.created_at} label="Timer 1" fontSize={fontSizes?.timer} />
                  </div>

                  {/* Timer 2 - Tempo no container */}
                  <div className="border border-border rounded px-2 py-1.5 bg-card text-center min-h-[36px] flex items-center justify-center">
                    <ElapsedTimer since={task.status_changed_at} label="Timer 2" fontSize={fontSizes?.timer} />
                  </div>
                </div>
              </div>
            </CollapsibleContent>

            {/* Botões de Ação - Apenas para status approved E não designers */}
            {!isCollapsed && !isDesigner && task.status === 'approved' && (
              <div className="px-3 pb-3 space-y-2">
                {/* Cliente SEM cadastro: apenas Solicitar Cadastro */}
                {!task.customer_id && (
                  <RequestCustomerRegistrationButton
                    taskId={task.id}
                    leadId={task.lead_id}
                    taskData={task}
                  />
                )}

                {/* Cliente COM cadastro: Cotar Frete + Novo Cadastro lado a lado */}
                {task.customer_id && (
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShippingDialog(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Cotar Frete
                    </Button>
                    
                    <RequestCustomerRegistrationButton
                      taskId={task.id}
                      leadId={task.lead_id}
                      variant="outline"
                      label="Novo Cadastro"
                      taskData={task}
                    />
                  </div>
                )}

                {/* Exportar Bling */}
                <BlingExportButton
                  taskId={task.id}
                  orderId={task.order_id}
                  onExportSuccess={() => {
                    toast.success("Pedido exportado com sucesso!");
                  }}
                />
              </div>
            )}
          </CardContent>
        </Collapsible>

        <ShippingQuoteDialog
          open={showShippingDialog}
          onOpenChange={setShowShippingDialog}
          taskId={task.id}
          customerId={task.customer_id || null}
          onShippingSelected={() => {
            toast.success("Frete selecionado!");
          }}
        />
      </Card>
    </div>
  );
};

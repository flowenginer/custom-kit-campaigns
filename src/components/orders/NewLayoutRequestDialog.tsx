import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, AlertTriangle, Check, Search, X, Megaphone, Edit, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "use-debounce";
import { FrontEditor } from "@/components/customization/FrontEditor";
import { BackEditor } from "@/components/customization/BackEditor";
import { SleeveEditor } from "@/components/customization/SleeveEditor";
import { UrgentReasonDialog } from "@/components/orders/UrgentReasonDialog";
import { TaskPriority } from "@/types/design-task";
import { useUniformTypes } from "@/hooks/useUniformTypes";

// Importar imagens dos uniformes
import mangaCurtaImg from "@/assets/uniforms/manga-curta.png";
import mangaLongaImg from "@/assets/uniforms/manga-longa.png";
import regataImg from "@/assets/uniforms/regata.png";
import ziperMangaLongaImg from "@/assets/uniforms/ziper-manga-longa.png";

const UNIFORM_IMAGES: Record<string, string> = {
  'ziper': ziperMangaLongaImg,
  'manga_longa': mangaLongaImg,
  'manga_curta': mangaCurtaImg,
  'regata': regataImg,
};


interface LayoutConfig {
  id: string;
  campaignId: string;
  campaignName: string;
  uniformType: string;
  model: any;
  isFromScratch: boolean;
  quantity: string;
  customQuantity: string;
  frontCustomization: any;
  backCustomization: any;
  leftSleeveCustomization: any;
  rightSleeveCustomization: any;
  hasLogo: "sim" | "depois" | "sem_logo" | "criar_logo" | null;
  logoFiles: File[];
  logoDescription: string;
}

interface NewLayoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewLayoutRequestDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: NewLayoutRequestDialogProps) => {
  const { types: uniformTypes, getIcon, getLabel } = useUniformTypes();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [filteredModels, setFilteredModels] = useState<any[]>([]);

  // Multi-layout states
  const [layoutCount, setLayoutCount] = useState(1);
  const [layouts, setLayouts] = useState<LayoutConfig[]>([]);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);

  // Form states
  const [isFromScratch, setIsFromScratch] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedUniformType, setSelectedUniformType] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [customQuantity, setCustomQuantity] = useState<string>("");
  
  // Customer search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(customerSearchTerm, 300);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [hasLogo, setHasLogo] = useState<"sim" | "depois" | "sem_logo" | "criar_logo" | null>(null);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>("normal");
  const [urgentReasonId, setUrgentReasonId] = useState<string>("");
  const [urgentReasonText, setUrgentReasonText] = useState<string>("");
  const [urgentReasonDialogOpen, setUrgentReasonDialogOpen] = useState(false);
  const [logoDescription, setLogoDescription] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<
    | "quantity_layouts"
    | "setup_layout"
    | "campaign"
    | "uniform"
    | "model"
    | "customer"
    | "review_layouts"
    | "front"
    | "back"
    | "sleeves_left"
    | "sleeves_right"
    | "logo_layout"
    | "copy_customization"
    | "logo"
    | "notes"
  >("quantity_layouts");

  // Customization states
  const [frontCustomization, setFrontCustomization] = useState<{
    logoType: 'none' | 'selected';
    hasSmallLogo: boolean;
    hasLargeLogo: boolean;
    hasCustom: boolean;
    textColor: string;
    text: string;
    logoUrl: string;
    customDescription?: string;
    customFile?: File | null;
  }>({
    logoType: "none",
    hasSmallLogo: false,
    hasLargeLogo: false,
    hasCustom: false,
    textColor: "#000000",
    text: "",
    logoUrl: "",
    customDescription: "",
    customFile: null,
  });

  const [backCustomization, setBackCustomization] = useState<{
    logoLarge: boolean;
    logoUrl: string;
    logoNeck: boolean;
    name: boolean;
    nameText: string;
    whatsapp: boolean;
    whatsappText: string;
    instagram: boolean;
    instagramText: string;
    email: boolean;
    emailText: string;
    website: boolean;
    websiteText: string;
    hasSponsors?: boolean;
    sponsorsLocation?: string;
    sponsors: { name: string; logoFile?: File | null; logoUrl?: string }[];
    sponsorsLogosUrls?: string[];
    noCustomization: boolean;
    hasCustomDescription: boolean;
    customDescription?: string;
    customFile?: File | null;
  }>({
    logoLarge: false,
    logoUrl: "",
    logoNeck: false,
    name: false,
    nameText: "",
    whatsapp: false,
    whatsappText: "",
    instagram: false,
    instagramText: "",
    email: false,
    emailText: "",
    website: false,
    websiteText: "",
    hasSponsors: false,
    sponsorsLocation: "",
    sponsors: [],
    sponsorsLogosUrls: [],
    noCustomization: false,
    hasCustomDescription: false,
    customDescription: "",
    customFile: null,
  });

  const [leftSleeveCustomization, setLeftSleeveCustomization] = useState({
    flag: false,
    flagState: undefined as string | undefined,
    flagUrl: "",
    logoSmall: false,
    logoFile: null as File | null,
    logoUrl: "",
    text: false,
    textContent: "",
  });

  const [rightSleeveCustomization, setRightSleeveCustomization] = useState({
    flag: false,
    flagState: undefined as string | undefined,
    flagUrl: "",
    logoSmall: false,
    logoFile: null as File | null,
    logoUrl: "",
    text: false,
    textContent: "",
  });

  // Load campaigns on mount
  useEffect(() => {
    if (open) {
      loadCampaigns();
    }
  }, [open]);

  // Load models when campaign is selected
  useEffect(() => {
    if (selectedCampaignId) {
      loadModels();
    }
  }, [selectedCampaignId]);

  // Filter models by uniform type
  useEffect(() => {
    if (selectedUniformType && models.length > 0) {
      const filtered = models.filter((m) => m.model_tag === selectedUniformType);
      setFilteredModels(filtered);
    } else {
      setFilteredModels([]);
    }
  }, [selectedUniformType, models]);

  // Search customers
  useEffect(() => {
    if (debouncedSearchTerm.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    const searchCustomers = async () => {
      setIsSearchingCustomer(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .or(`name.ilike.%${debouncedSearchTerm}%,cpf.ilike.%${debouncedSearchTerm}%,cnpj.ilike.%${debouncedSearchTerm}%,company_name.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%`)
          .limit(5);

        if (error) throw error;
        setCustomerSearchResults(data || []);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
      } finally {
        setIsSearchingCustomer(false);
      }
    };

    searchCustomers();
  }, [debouncedSearchTerm]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, unique_link, segment_tag")
        .is('deleted_at', null)
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    }
  };

  const loadModels = async () => {
    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    if (!campaign?.segment_tag) return;

    try {
      const { data, error } = await supabase
        .from("shirt_models")
        .select("*")
        .eq("segment_tag", campaign.segment_tag)
        .order("name");

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      toast.error("Erro ao carregar modelos");
    }
  };

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/\D/g, "").slice(0, 11);
    let formatted = cleaned;

    if (cleaned.length > 0) {
      formatted = `(${cleaned.slice(0, 2)}`;
      if (cleaned.length > 2) {
        formatted += `) ${cleaned.slice(2, 7)}`;
      }
      if (cleaned.length > 7) {
        formatted += `-${cleaned.slice(7, 11)}`;
      }
    }

    setCustomerPhone(formatted);
  };

  const uploadLogoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("customer-logos")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da logo:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    // Validações
    if (layoutCount === 0 || layouts.length === 0) {
      toast.error("Configure pelo menos um layout");
      return;
    }

    if (!customerName.trim() || !customerPhone) {
      toast.error("Preencha nome e WhatsApp do cliente");
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Informe um WhatsApp válido com DDD");
      return;
    }

    // Validar que todos os layouts tenham configuração de logo
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i];
      if (!layout.hasLogo) {
        toast.error(`Configure a logo do Layout ${i + 1}`);
        return;
      }
      if (layout.hasLogo === "sim" && (!layout.logoFiles || layout.logoFiles.length === 0)) {
        toast.error(`Faça upload da logo do Layout ${i + 1}`);
        return;
      }
      if (layout.hasLogo === "criar_logo" && !layout.logoDescription?.trim()) {
        toast.error(`Descreva a logo para o Layout ${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      // Calcular quantidade total somando todos os layouts
      const totalQuantity = layouts.reduce((sum, layout) => {
        const qty = layout.quantity === "custom" ? parseInt(layout.customQuantity) : parseInt(layout.quantity);
        return sum + (qty || 0);
      }, 0);

      // Processar uploads de logos para cada layout
      const layoutsWithUploadedLogos = await Promise.all(
        layouts.map(async (layout) => {
          let uploadedLogoUrls: string[] = [];
          
          if (layout.hasLogo === "sim" && layout.logoFiles && layout.logoFiles.length > 0) {
            for (const file of layout.logoFiles) {
              const url = await uploadLogoToStorage(file);
              if (!url) {
                throw new Error(`Erro ao fazer upload da logo do Layout ${layout.id}`);
              }
              uploadedLogoUrls.push(url);
            }
          }
          
          return {
            ...layout,
            uploadedLogoUrls,
          };
        })
      );

      // Obter user ID atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Usar o primeiro layout como base para campaign e model (para o order)
      const firstLayout = layoutsWithUploadedLogos[0];
      const isFromScratch = firstLayout.isFromScratch;
      const selectedCampaignId = firstLayout.campaignId;
      const selectedModel = firstLayout.model;
      const selectedUniformType = firstLayout.uniformType;

      // Preparar dados de customização simplificados (para manter compatibilidade)
      const customizationData = {
        layouts: layoutsWithUploadedLogos.length,
        fromScratch: isFromScratch,
        uniformType: selectedUniformType,
        model: isFromScratch ? null : selectedModel?.name,
        internalNotes,
      };

      // Se prioridade é URGENTE, criar solicitação de aprovação
      if (selectedPriority === "urgent") {
        if (!urgentReasonId) {
          toast.error("Selecione o motivo da urgência");
          setLoading(false);
          return;
        }

        const requestData = {
          campaignId: selectedCampaignId,
          model: selectedModel,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
          },
          quantity: totalQuantity,
          customization: customizationData,
          layouts: layoutsWithUploadedLogos.map(l => ({
            id: l.id,
            campaignId: l.campaignId,
            campaignName: l.campaignName,
            uniformType: l.uniformType,
            model: l.model,
            isFromScratch: l.isFromScratch,
            quantity: l.quantity,
            customQuantity: l.customQuantity,
            hasLogo: l.hasLogo,
            uploadedLogoUrls: l.uploadedLogoUrls,
            logoDescription: l.logoDescription,
          })),
          hasLogo: firstLayout.hasLogo !== "sem_logo" && firstLayout.hasLogo !== "depois",
          logoUrls: firstLayout.uploadedLogoUrls || [],
          internalNotes,
        };

        const { error: pendingError } = await supabase
          .from("pending_urgent_requests")
          .insert([{
            request_data: requestData,
            requested_priority: "urgent" as const,
            requested_by: user.id,
            urgent_reason_id: urgentReasonId,
            urgent_reason_text: urgentReasonText || null,
          }]);

        if (pendingError) throw pendingError;

        // Notificar admins
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["super_admin", "admin"]);

        if (adminRoles && adminRoles.length > 0) {
          const notifications = adminRoles.map((r) => ({
            user_id: r.user_id,
            title: "🔴 Solicitação de Urgência",
            message: `${customerName} - Aguardando aprovação de prioridade urgente`,
            type: "urgent_approval_request",
          }));

          await supabase.from("notifications").insert(notifications);
        }

        toast.info("Solicitação de urgência enviada para aprovação!");
        resetForm();
        onOpenChange(false);
        onSuccess();
        setLoading(false);
        return;
      }

      // Fluxo normal - criar diretamente
      const sessionId = `salesperson_${user.id}_${Date.now()}`;

      // 1. Criar ORDER primeiro (com quantidade total)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([{
          campaign_id: isFromScratch ? null : selectedCampaignId,
          session_id: sessionId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          quantity: totalQuantity,
          model_id: isFromScratch ? null : selectedModel?.id,
          customization_data: customizationData,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 1.5. Se um cliente existente foi selecionado, vincular ao design_task
      let finalCustomerId = selectedCustomerId;

      // 2. Criar LEAD com order_id (usando dados do primeiro layout)
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert([{
          campaign_id: isFromScratch ? null : selectedCampaignId,
          session_id: sessionId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          quantity: totalQuantity.toString(),
          order_id: orderData.id,
          created_by: user.id,
          created_by_salesperson: true,
          needs_logo: firstLayout.hasLogo === "depois" || firstLayout.hasLogo === "sem_logo",
          logo_action: firstLayout.hasLogo === "depois" ? "waiting_client" : (firstLayout.hasLogo === "criar_logo" ? "designer_create" : null),
          logo_description: firstLayout.hasLogo === "criar_logo" ? firstLayout.logoDescription : null,
          uploaded_logo_url: firstLayout.uploadedLogoUrls && firstLayout.uploadedLogoUrls.length > 0 ? firstLayout.uploadedLogoUrls[0] : null,
          customization_summary: customizationData,
          completed: true,
        }])
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Buscar o design_task criado pelo trigger
      const { data: taskData, error: taskFetchError } = await supabase
        .from('design_tasks')
        .select('id')
        .eq('order_id', orderData.id)
        .single();

      if (taskFetchError) throw taskFetchError;

      // 4. Atualizar lead_id, customer_id e prioridade no design_task
      const { error: updateTaskError } = await supabase
        .from('design_tasks')
        .update({ 
          lead_id: leadData.id,
          customer_id: finalCustomerId,
          priority: selectedPriority,
          created_by: user.id,
          created_by_salesperson: true,
        })
        .eq('id', taskData.id);

      if (updateTaskError) throw updateTaskError;

      // 5. Criar design_task_layouts para cada layout configurado
      const layoutsToInsert = layoutsWithUploadedLogos.map((layout, index) => ({
        task_id: taskData.id,
        layout_number: index + 1,
        campaign_id: layout.isFromScratch ? null : layout.campaignId,
        campaign_name: layout.campaignName,
        uniform_type: layout.uniformType,
        model_id: layout.isFromScratch ? null : layout.model?.id,
        model_name: layout.isFromScratch ? null : layout.model?.name,
        status: 'pending',
        quantity: layout.quantity === "custom" ? parseInt(layout.customQuantity) : parseInt(layout.quantity),
        customization_data: {
          fromScratch: layout.isFromScratch,
          uniformType: layout.uniformType,
          model: layout.isFromScratch ? null : layout.model?.name,
          front: layout.frontCustomization,
          back: layout.backCustomization,
          sleeves: {
            left: layout.leftSleeveCustomization,
            right: layout.rightSleeveCustomization,
          },
          logo: {
            hasLogo: layout.hasLogo,
            logoUrls: layout.uploadedLogoUrls || [],
            logoDescription: layout.logoDescription || null,
          },
        },
      }));

      const { error: layoutsError } = await supabase
        .from('design_task_layouts')
        .insert(layoutsToInsert);

      if (layoutsError) {
        console.error('Erro ao criar layouts:', layoutsError);
        throw layoutsError;
      }

      toast.success("Requisição criada com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar requisição:", error);
      toast.error("Erro ao criar requisição");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLayoutCount(1);
    setLayouts([]);
    setCurrentLayoutIndex(0);
    setIsFromScratch(false);
    setSelectedCampaignId("");
    setSelectedUniformType("");
    setSelectedModel(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setQuantity("");
    setCustomQuantity("");
    setHasLogo(null);
    setLogoFiles([]);
    setInternalNotes("");
    setSelectedPriority("normal");
    setUrgentReasonId("");
    setUrgentReasonText("");
    setLogoDescription("");
    setCurrentStep("quantity_layouts");
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
    setSelectedCustomerId(null);
    setFrontCustomization({
      logoType: "none",
      hasSmallLogo: false,
      hasLargeLogo: false,
      hasCustom: false,
      textColor: "#000000",
      text: "",
      logoUrl: "",
      customDescription: "",
      customFile: null,
    });
    setBackCustomization({
      logoLarge: false,
      logoUrl: "",
      logoNeck: false,
      name: false,
      nameText: "",
      whatsapp: false,
      whatsappText: "",
      instagram: false,
      instagramText: "",
      email: false,
      emailText: "",
      website: false,
      websiteText: "",
      hasSponsors: false,
      sponsorsLocation: "",
      sponsors: [],
      sponsorsLogosUrls: [],
      noCustomization: false,
      hasCustomDescription: false,
      customDescription: "",
      customFile: null,
    });
    setLeftSleeveCustomization({
      flag: false,
      flagState: undefined,
      flagUrl: "",
      logoSmall: false,
      logoFile: null,
      logoUrl: "",
      text: false,
      textContent: "",
    });
    setRightSleeveCustomization({
      flag: false,
      flagState: undefined,
      flagUrl: "",
      logoSmall: false,
      logoFile: null,
      logoUrl: "",
      text: false,
      textContent: "",
    });
  };

  const getStepTitle = () => {
    if (currentStep === "quantity_layouts") return "Quantos mockups este cliente precisa?";
    if (currentStep === "setup_layout") return `Configurar Layout ${currentLayoutIndex + 1} de ${layoutCount}`;
    if (currentStep === "review_layouts") return "Revisar Todos os Layouts";
    if (currentStep === "copy_customization") return "Copiar Configuração Completa?";
    if (currentStep === "logo_layout") return `Layout ${currentLayoutIndex + 1}/${layoutCount} - Logo`;
    if (currentStep === "customer") return "Dados do Cliente";
    if (layoutCount > 1 && ["front", "back", "sleeves_left", "sleeves_right"].includes(currentStep)) {
      return `Layout ${currentLayoutIndex + 1}/${layoutCount} - ${currentStep === "front" ? "Frente" : currentStep === "back" ? "Costas" : "Mangas"}`;
    }
    return "";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "quantity_layouts":
        return (
          <div className="space-y-4">
            <Label className="text-lg">Quantos mockups/layouts este cliente precisa?</Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <Card
                  key={num}
                  className={`p-6 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    layoutCount === num ? "border-primary ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setLayoutCount(num);
                    setLayouts([]);
                    setCurrentLayoutIndex(0);
                    setCurrentStep("setup_layout");
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl font-bold text-primary">{num}</span>
                    <span className="text-sm font-medium text-center">
                      {num === 1 ? "Layout" : "Layouts"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "setup_layout":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Layout {currentLayoutIndex + 1} de {layoutCount}</h3>
              <Badge variant="outline">{currentLayoutIndex + 1}/{layoutCount}</Badge>
            </div>

            {/* Campaign Selection com botão Layout do Zero */}
            <div className="space-y-2">
              <Label>Segmento/Campanha *</Label>
              
              {(selectedCampaignId || isFromScratch) ? (
                // Modo colapsado - mostra apenas o selecionado
                <div className="flex items-center gap-2">
                  <Card className="p-3 flex-1 border-primary ring-2 ring-primary">
                    <div className="flex items-center gap-2">
                      {isFromScratch ? (
                        <>
                          <Plus className="h-5 w-5 text-green-500" />
                          <span className="font-medium text-green-700 dark:text-green-300">Layout do Zero</span>
                        </>
                      ) : (
                        <>
                          <Megaphone className="h-5 w-5 text-primary" />
                          <span className="font-medium">{campaigns.find(c => c.id === selectedCampaignId)?.name}</span>
                        </>
                      )}
                    </div>
                  </Card>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedCampaignId("");
                      setIsFromScratch(false);
                      setSelectedUniformType("");
                      setSelectedModel(null);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Alterar
                  </Button>
                </div>
              ) : (
                // Modo expandido - mostra grid completo
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Botão Layout do Zero - estilo verde */}
                  <Card
                    className={`p-3 cursor-pointer transition-all hover:border-green-500 hover:shadow-md border-2 border-green-500 bg-green-50 dark:bg-green-950`}
                    onClick={() => {
                      setIsFromScratch(true);
                      setSelectedCampaignId("");
                      setSelectedModel(null);
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="h-6 w-6 text-green-500" />
                      <span className="text-xs font-medium text-center text-green-700 dark:text-green-300">
                        Layout do Zero
                      </span>
                    </div>
                  </Card>

                  {/* Campanhas/Segmentos */}
                  {campaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className="p-3 cursor-pointer transition-all hover:border-primary"
                      onClick={() => {
                        setIsFromScratch(false);
                        setSelectedCampaignId(campaign.id);
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Megaphone className="h-6 w-6 text-primary" />
                        <span className="text-xs font-medium text-center">{campaign.name}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Uniform Type Selection - mostrar se campanha selecionada OU se for do zero */}
            {(selectedCampaignId || isFromScratch) && (
              <div className="space-y-2">
                <Label>Tipo de Uniforme *</Label>
                
                {selectedUniformType ? (
                  // Modo colapsado
                  <div className="flex items-center gap-2">
                    <Card className="p-3 flex-1 border-primary ring-2 ring-primary">
                      <div className="flex items-center gap-2">
                        <img 
                          src={UNIFORM_IMAGES[selectedUniformType] || mangaCurtaImg} 
                          alt={getLabel(selectedUniformType)}
                          className="w-10 h-10 object-contain" 
                        />
                        <span className="font-medium">{getIcon(selectedUniformType)} {getLabel(selectedUniformType)}</span>
                      </div>
                    </Card>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedUniformType("");
                        setSelectedModel(null);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Alterar
                    </Button>
                  </div>
                ) : (
                  // Modo expandido
                  <div className="grid grid-cols-2 gap-2">
                    {uniformTypes.map((type) => (
                      <Card
                        key={type.tag_value}
                        className="p-3 cursor-pointer transition-all hover:border-primary"
                        onClick={() => setSelectedUniformType(type.tag_value)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <img
                            src={UNIFORM_IMAGES[type.tag_value] || mangaCurtaImg}
                            alt={getLabel(type.tag_value)}
                            className="w-16 h-16 object-contain"
                          />
                          <span className="text-xs font-medium text-center">
                            {getIcon(type.tag_value)} {getLabel(type.tag_value)}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Model Selection - mostrar apenas se NÃO for do zero */}
            {!isFromScratch && selectedUniformType && (
              <div className="space-y-2">
                <Label>Modelo *</Label>
                
                {selectedModel ? (
                  // Modo colapsado
                  <div className="flex items-center gap-2">
                    <Card className="p-3 flex-1 border-primary ring-2 ring-primary">
                      <div className="flex items-center gap-2">
                        <img 
                          src={selectedModel.photo_main} 
                          alt={selectedModel.name}
                          className="w-12 h-12 object-contain rounded" 
                        />
                        <span className="font-medium">{selectedModel.name}</span>
                      </div>
                    </Card>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedModel(null)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Alterar
                    </Button>
                  </div>
                ) : (
                  // Modo expandido
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {filteredModels.map((model) => (
                      <Card
                        key={model.id}
                        className="p-2 cursor-pointer transition-all hover:border-primary"
                        onClick={() => setSelectedModel(model)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <img
                            src={model.photo_main}
                            alt={model.name}
                            className="w-full aspect-square object-contain rounded"
                          />
                          <span className="text-xs font-medium text-center">{model.name}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Badge informativo se for do zero */}
            {isFromScratch && selectedUniformType && (
              <Alert className="bg-primary/5 border-primary">
                <AlertDescription className="text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <span>Criação do Zero - Designer criará layout sem modelo base</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Seletor de Quantidade - mostrar se tipo de uniforme selecionado (e modelo selecionado se NÃO for do zero) */}
            {((isFromScratch && selectedUniformType) || (!isFromScratch && selectedModel)) && (
              <div className="space-y-2">
                <Label>Quantidade deste Layout *</Label>
                <RadioGroup value={quantity} onValueChange={setQuantity}>
                  <div className="grid grid-cols-3 gap-2">
                    {["10", "20", "30", "40", "50", "60"].map((q) => (
                      <div key={q} className="flex items-center space-x-2">
                        <RadioGroupItem value={q} id={`qty-${q}`} />
                        <Label htmlFor={`qty-${q}`} className="cursor-pointer">
                          {q}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <RadioGroupItem value="custom" id="qty-custom" />
                    <Label htmlFor="qty-custom" className="cursor-pointer">
                      Outro
                    </Label>
                  </div>
                </RadioGroup>
                {quantity === "custom" && (
                  <Input
                    type="number"
                    min="10"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="Quantidade (mínimo 10)"
                    className="mt-2"
                  />
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentLayoutIndex > 0) {
                    setCurrentLayoutIndex(currentLayoutIndex - 1);
                    // Carregar dados do layout anterior
                    const prevLayout = layouts[currentLayoutIndex - 1];
                    if (prevLayout) {
                      setIsFromScratch(prevLayout.isFromScratch || false);
                      setSelectedCampaignId(prevLayout.campaignId);
                      setSelectedUniformType(prevLayout.uniformType);
                      setSelectedModel(prevLayout.model);
                    }
                  } else {
                    setCurrentStep("quantity_layouts");
                  }
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={() => {
                  // Validar se tem as informações necessárias
                  if (isFromScratch) {
                    // Para layout do zero, só precisa do tipo de uniforme e quantidade
                    if (!selectedUniformType) {
                      toast.error("Selecione o tipo de uniforme");
                      return;
                    }
                  } else {
                    // Para layout baseado em campanha, precisa de tudo
                    if (!selectedCampaignId || !selectedUniformType || !selectedModel) {
                      toast.error("Selecione campanha, tipo e modelo");
                      return;
                    }
                  }

                  // Validar quantidade
                  if (!quantity) {
                    toast.error("Selecione a quantidade deste layout");
                    return;
                  }

                  if (quantity === "custom" && (!customQuantity || parseInt(customQuantity) < 10)) {
                    toast.error("A quantidade mínima é 10 unidades");
                    return;
                  }

                  // Salvar configuração do layout atual
                  const campaign = campaigns.find(c => c.id === selectedCampaignId);
                  const newLayout: LayoutConfig = {
                    id: `layout_${currentLayoutIndex}`,
                    campaignId: isFromScratch ? "" : selectedCampaignId,
                    campaignName: isFromScratch ? "Layout do Zero" : (campaign?.name || ""),
                    uniformType: selectedUniformType,
                    model: isFromScratch ? null : selectedModel,
                    isFromScratch: isFromScratch,
                    quantity: quantity,
                    customQuantity: customQuantity,
                    frontCustomization: {},
                    backCustomization: {},
                    leftSleeveCustomization: {},
                    rightSleeveCustomization: {},
                    hasLogo: null,
                    logoFiles: [],
                    logoDescription: "",
                  };

                  const updatedLayouts = [...layouts];
                  updatedLayouts[currentLayoutIndex] = newLayout;
                  setLayouts(updatedLayouts);

                  // Resetar quantidade para o próximo layout
                  setQuantity("");
                  setCustomQuantity("");

                  // Avançar para próximo layout ou ir para dados do cliente
                  if (currentLayoutIndex + 1 < layoutCount) {
                    setCurrentLayoutIndex(currentLayoutIndex + 1);
                    setSelectedCampaignId("");
                    setSelectedUniformType("");
                    setSelectedModel(null);
                    setIsFromScratch(false);
                  } else {
                    setCurrentStep("customer");
                  }
                }}
                className="flex-1"
              >
                {currentLayoutIndex + 1 < layoutCount ? "Próximo Layout" : "Ir para Dados do Cliente"}
              </Button>
            </div>
          </div>
        );

      case "review_layouts":
        const totalQuantity = layouts.reduce((sum, layout) => {
          const qty = layout.quantity === "custom" ? parseInt(layout.customQuantity) : parseInt(layout.quantity);
          return sum + (qty || 0);
        }, 0);

        return (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary">
              <AlertDescription className="font-semibold text-lg flex items-center justify-between">
                <span>Total Geral:</span>
                <span className="text-2xl text-primary">{totalQuantity} peças</span>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              {layouts.map((layout, idx) => {
                const layoutQty = layout.quantity === "custom" ? parseInt(layout.customQuantity) : parseInt(layout.quantity);
                return (
                  <Card key={layout.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {layout.isFromScratch ? (
                        <div className="w-20 h-20 flex items-center justify-center bg-primary/10 rounded">
                          <Plus className="h-10 w-10 text-primary" />
                        </div>
                      ) : (
                        <img
                          src={layout.model?.photo_main}
                          alt={layout.model?.name}
                          className="w-20 h-20 object-contain rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Layout {idx + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentLayoutIndex(idx);
                              setCurrentStep("setup_layout");
                              setIsFromScratch(layout.isFromScratch || false);
                              setSelectedCampaignId(layout.campaignId);
                              setSelectedUniformType(layout.uniformType);
                              setSelectedModel(layout.model);
                              setQuantity(layout.quantity);
                              setCustomQuantity(layout.customQuantity);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs space-y-1">
                          <p><strong>Segmento:</strong> {layout.campaignName}</p>
                          <p><strong>Tipo:</strong> {getLabel(layout.uniformType)}</p>
                          {!layout.isFromScratch && layout.model && (
                            <p><strong>Modelo:</strong> {layout.model.name}</p>
                          )}
                          <p className="text-primary font-bold"><strong>Quantidade:</strong> {layoutQty} peças</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("customer")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => {
                  setCurrentLayoutIndex(0);
                  setCurrentStep("front");
                }}
                className="flex-1"
              >
                Iniciar Personalização
              </Button>
            </div>
          </div>
        );

      case "copy_customization":
        return (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">
                Deseja aplicar a mesma configuração completa ao Layout {currentLayoutIndex + 1}?
              </h3>
              <p className="text-sm text-muted-foreground">
                Você pode copiar toda a configuração (personalização + logo) do Layout {currentLayoutIndex} ou começar do zero.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Copiar TUDO do layout anterior (personalização + logo)
                    const prevLayout = layouts[currentLayoutIndex - 1];
                    setFrontCustomization(prevLayout.frontCustomization);
                    setBackCustomization(prevLayout.backCustomization);
                    setLeftSleeveCustomization(prevLayout.leftSleeveCustomization);
                    setRightSleeveCustomization(prevLayout.rightSleeveCustomization);
                    
                    // Copiar dados de logo
                    setHasLogo(prevLayout.hasLogo);
                    setLogoFiles(prevLayout.logoFiles || []);
                    setLogoDescription(prevLayout.logoDescription || "");
                    
                    // Salvar no layout atual
                    const updatedLayouts = [...layouts];
                    updatedLayouts[currentLayoutIndex] = {
                      ...updatedLayouts[currentLayoutIndex],
                      frontCustomization: prevLayout.frontCustomization,
                      backCustomization: prevLayout.backCustomization,
                      leftSleeveCustomization: prevLayout.leftSleeveCustomization,
                      rightSleeveCustomization: prevLayout.rightSleeveCustomization,
                      hasLogo: prevLayout.hasLogo,
                      logoFiles: prevLayout.logoFiles,
                      logoDescription: prevLayout.logoDescription,
                    };
                    setLayouts(updatedLayouts);

                    // Ir para próximo layout ou concluir
                    if (currentLayoutIndex + 1 < layoutCount) {
                      setCurrentLayoutIndex(currentLayoutIndex + 1);
                      setCurrentStep("copy_customization");
                    } else {
                      setCurrentStep("notes");
                    }
                  }}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Sim, Copiar Tudo
                </Button>
                <Button
                  onClick={() => {
                    // Resetar TUDO para começar do zero
                    setFrontCustomization({
                      logoType: "none",
                      hasSmallLogo: false,
                      hasLargeLogo: false,
                      hasCustom: false,
                      textColor: "#000000",
                      text: "",
                      logoUrl: "",
                      customDescription: "",
                      customFile: null,
                    });
                    setBackCustomization({
                      logoLarge: false,
                      logoUrl: "",
                      logoNeck: false,
                      name: false,
                      nameText: "",
                      whatsapp: false,
                      whatsappText: "",
                      instagram: false,
                      instagramText: "",
                      email: false,
                      emailText: "",
                      website: false,
                      websiteText: "",
                      hasSponsors: false,
                      sponsorsLocation: "",
                      sponsors: [],
                      sponsorsLogosUrls: [],
                      noCustomization: false,
                      hasCustomDescription: false,
                      customDescription: "",
                      customFile: null,
                    });
                    setLeftSleeveCustomization({
                      flag: false,
                      flagState: undefined,
                      flagUrl: "",
                      logoSmall: false,
                      logoFile: null,
                      logoUrl: "",
                      text: false,
                      textContent: "",
                    });
                    setRightSleeveCustomization({
                      flag: false,
                      flagState: undefined,
                      flagUrl: "",
                      logoSmall: false,
                      logoFile: null,
                      logoUrl: "",
                      text: false,
                      textContent: "",
                    });
                    
                    // Resetar também dados de logo
                    setHasLogo(null);
                    setLogoFiles([]);
                    setLogoDescription("");
                    
                    setCurrentStep("front");
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Não, Personalizar do Zero
                </Button>
              </div>
            </div>
          </div>
        );

      case "campaign":
        return (
          <div className="space-y-4">
            <Label>Campanha *</Label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Botão "Criação do Zero" como primeiro item do grid */}
              <Card
                className={`p-4 cursor-pointer transition-all hover:border-green-500 hover:shadow-md border-2 ${
                  isFromScratch ? "border-green-500 ring-2 ring-green-500 bg-green-50 dark:bg-green-950" : "border-green-500 bg-green-50 dark:bg-green-950"
                }`}
                onClick={() => {
                  setIsFromScratch(true);
                  setSelectedCampaignId("");
                  setSelectedModel(null);
                  setCurrentStep("uniform");
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-8 w-8 text-green-500" />
                  <span className="text-sm font-medium text-center text-green-700 dark:text-green-300">
                    Criação do Zero
                  </span>
                </div>
              </Card>

              {/* Campanhas existentes */}
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    selectedCampaignId === campaign.id
                      ? "border-primary ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() => {
                    setIsFromScratch(false);
                    setSelectedCampaignId(campaign.id);
                    setCurrentStep("uniform");
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Megaphone className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium text-center">
                      {campaign.name}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "uniform":
        return (
          <div className="space-y-4">
            {/* Badge verde se for criação do zero */}
            {isFromScratch && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-500 border-2">
                <AlertDescription className="text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <span>Criação do Zero - Você não precisa escolher modelo</span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Tipo de Uniforme *</Label>
              <div className="grid grid-cols-2 gap-3">
                {uniformTypes.map((type) => (
                  <Card
                    key={type.tag_value}
                    className={`p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedUniformType === type.tag_value
                        ? "border-primary ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedUniformType(type.tag_value);
                      // Se for criação do zero, vai para dados do cliente
                      setCurrentStep(isFromScratch ? "customer" : "model");
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={UNIFORM_IMAGES[type.tag_value] || mangaCurtaImg}
                        alt={getLabel(type.tag_value)}
                        className="w-20 h-20 object-contain"
                      />
                      <span className="text-sm font-medium text-center">
                        {getIcon(type.tag_value)} {getLabel(type.tag_value)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentStep("campaign");
                if (isFromScratch) {
                  setIsFromScratch(false);
                }
              }} 
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        );

      case "model":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredModels.map((model) => (
                  <Card
                    key={model.id}
                    className={`p-3 cursor-pointer transition-all hover:border-primary ${
                      selectedModel?.id === model.id
                        ? "border-primary ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedModel(model);
                      setCurrentStep("customer");
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={model.photo_main}
                        alt={model.name}
                        className="w-full aspect-square object-contain rounded"
                      />
                      <span className="text-xs font-medium text-center">{model.name}</span>
                      {model.sku && (
                        <span className="text-xs text-muted-foreground">{model.sku}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              {filteredModels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum modelo disponível para este tipo de uniforme
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setCurrentStep("uniform")} className="w-full">
              Voltar
            </Button>
          </div>
        );

      case "customer":
        return (
          <div className="space-y-4">
            {/* Campo de busca */}
            <div className="space-y-2">
              <Label>Buscar Cliente Existente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="Nome, CPF, CNPJ, telefone..."
                  className="pl-9"
                  disabled={!!selectedCustomerId}
                />
                {isSearchingCustomer && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Resultados da busca */}
            {customerSearchResults.length > 0 && !selectedCustomerId && (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                <p className="text-xs text-muted-foreground px-2">
                  {customerSearchResults.length} resultado(s) encontrado(s)
                </p>
                {customerSearchResults.map((customer) => (
                  <Card
                    key={customer.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setCustomerName(customer.name);
                      setCustomerPhone(customer.phone);
                      setCustomerEmail(customer.email || "");
                      setCustomerSearchTerm("");
                      setCustomerSearchResults([]);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          {customer.person_type === "pf" && customer.cpf && (
                            <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>
                          )}
                          {customer.person_type === "pj" && customer.cnpj && (
                            <p className="text-xs text-muted-foreground">CNPJ: {customer.cnpj}</p>
                          )}
                          {customer.company_name && (
                            <p className="text-xs text-muted-foreground">{customer.company_name}</p>
                          )}
                        </div>
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Badge de cliente selecionado */}
            {selectedCustomerId && (
              <Alert className="bg-primary/5 border-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm font-medium">
                      Cliente selecionado: {customerName}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustomerName("");
                      setCustomerPhone("");
                      setCustomerEmail("");
                    }}
                  >
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </Alert>
            )}

            {/* Campos de dados do cliente */}
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo"
                disabled={!!selectedCustomerId}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={!!selectedCustomerId}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={!!selectedCustomerId}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (layoutCount > 1) {
                    setCurrentStep("review_layouts");
                  } else if (layouts.length > 0) {
                    setCurrentStep("setup_layout");
                  } else {
                    setCurrentStep("quantity_layouts");
                  }
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={() => {
                  if (layoutCount > 1) {
                    setCurrentStep("review_layouts");
                  } else {
                    setCurrentStep("front");
                  }
                }}
                disabled={!customerName.trim() || !customerPhone}
                className="flex-1"
              >
                {layoutCount > 1 ? "Revisar Layouts" : "Continuar"}
              </Button>
            </div>
          </div>
        );

      case "front":
        return (
          <div className="space-y-4">
            {(selectedModel || isFromScratch) && (
              <FrontEditor
                model={selectedModel || {
                  id: 'scratch',
                  name: 'Criação do Zero',
                  image_front: '/placeholder.svg',
                  image_front_small_logo: '/placeholder.svg',
                  image_front_large_logo: '/placeholder.svg',
                  image_front_clean: '/placeholder.svg'
                }}
                value={frontCustomization}
                onChange={setFrontCustomization}
                onNext={() => setCurrentStep("back")}
              />
            )}
            <Button variant="outline" onClick={() => setCurrentStep("customer")} className="w-full">
              Voltar
            </Button>
          </div>
        );

      case "back":
        return (
          <div className="space-y-4">
            {(selectedModel || isFromScratch) && (
              <BackEditor
                model={selectedModel || {
                  id: 'scratch',
                  name: 'Criação do Zero',
                  image_back: '/placeholder.svg'
                }}
                value={backCustomization}
                onChange={setBackCustomization}
                onNext={() => setCurrentStep("sleeves_left")}
              />
            )}
            <Button variant="outline" onClick={() => setCurrentStep("front")} className="w-full">
              Voltar
            </Button>
          </div>
        );

      case "sleeves_left":
        return (
          <div className="space-y-4">
            {(selectedModel || isFromScratch) && (
              <SleeveEditor
                model={selectedModel || {
                  id: 'scratch',
                  name: 'Criação do Zero',
                  image_left: '/placeholder.svg',
                  image_right: '/placeholder.svg'
                }}
                side="left"
                value={leftSleeveCustomization}
                onChange={(data) => setLeftSleeveCustomization({ ...leftSleeveCustomization, ...data })}
                onNext={() => setCurrentStep("sleeves_right")}
              />
            )}
            <Button variant="outline" onClick={() => setCurrentStep("back")} className="w-full">
              Voltar
            </Button>
          </div>
        );

      case "sleeves_right":
        return (
          <div className="space-y-4">
            {(selectedModel || isFromScratch) && (
              <SleeveEditor
                model={selectedModel || {
                  id: 'scratch',
                  name: 'Criação do Zero',
                  image_left: '/placeholder.svg',
                  image_right: '/placeholder.svg'
                }}
                side="right"
                value={rightSleeveCustomization}
                onChange={(data) => setRightSleeveCustomization({ ...rightSleeveCustomization, ...data })}
                onNext={() => {
                  // Salvar personalização do layout atual
                  const updatedLayouts = [...layouts];
                  updatedLayouts[currentLayoutIndex] = {
                    ...updatedLayouts[currentLayoutIndex],
                    frontCustomization,
                    backCustomization,
                    leftSleeveCustomization,
                    rightSleeveCustomization,
                  };
                  setLayouts(updatedLayouts);

                  // Ir para configuração de logo deste layout
                  setCurrentStep("logo_layout");
                }}
              />
            )}
            <Button variant="outline" onClick={() => setCurrentStep("sleeves_left")} className="w-full">
              Voltar
            </Button>
          </div>
        );

      case "logo_layout":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                Layout {currentLayoutIndex + 1} de {layoutCount} - Cliente tem logo?
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecione a opção que melhor se aplica para este layout
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Opção 1: Sim, fazer upload agora */}
                <div className="space-y-3">
                  <Card 
                    className={`cursor-pointer transition-all hover:border-primary ${
                      hasLogo === 'sim' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setHasLogo('sim')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          hasLogo === 'sim' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {hasLogo === 'sim' && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-medium">✅ Sim, fazer upload agora</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            O cliente já possui logo e vou anexar agora
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Upload logo - aparece logo abaixo quando "sim" é selecionado */}
                  {hasLogo === "sim" && (
                    <div className="ml-4 space-y-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Label className="text-base font-medium text-blue-700 dark:text-blue-300">
                        📤 Upload das Logos *
                      </Label>
                      {logoFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded border border-blue-300">
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFiles = logoFiles.filter((_, i) => i !== index);
                              setLogoFiles(newFiles);
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFiles([...logoFiles, file]);
                            e.target.value = '';
                          }
                        }}
                        className="mt-2 border-blue-300 focus:border-blue-500"
                      />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Adicione uma logo por vez. Cada logo adicionada abre um novo campo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Opção 2: Enviar depois */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    hasLogo === 'depois' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setHasLogo('depois')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'depois' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'depois' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium">📩 Vou enviar depois</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          O cliente vai enviar por email/WhatsApp
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opção 3: Cliente não quer logo */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-orange-500 ${
                    hasLogo === 'sem_logo' ? 'border-orange-500 ring-2 ring-orange-500 bg-orange-500/5' : ''
                  }`}
                  onClick={() => setHasLogo('sem_logo')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'sem_logo' ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'sem_logo' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-orange-600">🚫 Cliente não quer logo</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          A camisa será produzida sem nenhuma logo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opção 4: Criar logo para o cliente */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-purple-500 ${
                    hasLogo === 'criar_logo' ? 'border-purple-500 ring-2 ring-purple-500 bg-purple-500/5' : ''
                  }`}
                  onClick={() => setHasLogo('criar_logo')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'criar_logo' ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'criar_logo' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-purple-600">🎨 Criar logo para o cliente</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          O designer vai criar uma logo nova
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Descrição da Logo - apenas quando "criar_logo" */}
            {hasLogo === 'criar_logo' && (
              <div className="space-y-4 p-4 border-2 border-purple-500 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Label className="text-base font-medium text-purple-700 dark:text-purple-300">
                  🎨 Descreva o que o cliente imagina para a logo *
                </Label>
                <Textarea
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  placeholder="Ex: Logo com cavalo, cores laranja e preto, estilo moderno e esportivo..."
                  rows={4}
                  className="border-purple-300 focus:border-purple-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-purple-600"
                />
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Essa descrição será exibida para o designer que vai criar a logo.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("sleeves_right")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => {
                  // Salvar dados de logo no layout atual
                  const updatedLayouts = [...layouts];
                  updatedLayouts[currentLayoutIndex] = {
                    ...updatedLayouts[currentLayoutIndex],
                    hasLogo: hasLogo,
                    logoFiles: logoFiles,
                    logoDescription: logoDescription,
                  };
                  setLayouts(updatedLayouts);

                  // Se há mais layouts, perguntar se quer copiar TUDO
                  if (layoutCount > 1 && currentLayoutIndex + 1 < layoutCount) {
                    setCurrentLayoutIndex(currentLayoutIndex + 1);
                    setCurrentStep("copy_customization");
                  } else {
                    // Último layout, ir para notas
                    setCurrentStep("notes");
                  }
                }}
                disabled={
                  hasLogo === null || 
                  (hasLogo === "sim" && logoFiles.length === 0) ||
                  (hasLogo === "criar_logo" && !logoDescription.trim())
                }
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case "logo":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Cliente tem logo?</Label>
              <p className="text-sm text-muted-foreground">
                Selecione a opção que melhor se aplica
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Opção 1: Sim, fazer upload agora */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    hasLogo === 'sim' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setHasLogo('sim')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'sim' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'sim' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium">✅ Sim, fazer upload agora</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          O cliente já possui logo e vou anexar agora
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opção 2: Enviar depois */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    hasLogo === 'depois' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setHasLogo('depois')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'depois' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'depois' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium">📩 Vou enviar depois</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          O cliente vai enviar por email/WhatsApp
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opção 3: Cliente não quer logo */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-orange-500 ${
                    hasLogo === 'sem_logo' ? 'border-orange-500 ring-2 ring-orange-500 bg-orange-500/5' : ''
                  }`}
                  onClick={() => setHasLogo('sem_logo')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'sem_logo' ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'sem_logo' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-orange-600">🚫 Cliente não quer logo</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          A camisa será produzida sem nenhuma logo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opção 4: Criar logo para o cliente */}
                <Card 
                  className={`cursor-pointer transition-all hover:border-purple-500 ${
                    hasLogo === 'criar_logo' ? 'border-purple-500 ring-2 ring-purple-500 bg-purple-500/5' : ''
                  }`}
                  onClick={() => setHasLogo('criar_logo')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        hasLogo === 'criar_logo' ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'
                      }`}>
                        {hasLogo === 'criar_logo' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-purple-600">🎨 Criar logo para o cliente</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          O designer vai criar uma logo nova
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Descrição da Logo - apenas quando "criar_logo" */}
            {hasLogo === 'criar_logo' && (
              <div className="space-y-4 p-4 border-2 border-purple-500 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Label className="text-base font-medium text-purple-700 dark:text-purple-300">
                  🎨 Descreva o que o cliente imagina para a logo *
                </Label>
                <Textarea
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  placeholder="Ex: Logo com cavalo, cores laranja e preto, estilo moderno e esportivo..."
                  rows={4}
                  className="border-purple-300 focus:border-purple-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-purple-600"
                />
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Essa descrição será exibida para o designer que vai criar a logo.
                </p>
              </div>
            )}

            {/* Upload apenas se "sim" */}
            {hasLogo === "sim" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Label className="text-base font-medium">Upload das Logos *</Label>
                {logoFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-background rounded border">
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFiles = logoFiles.filter((_, i) => i !== index);
                        setLogoFiles(newFiles);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFiles([...logoFiles, file]);
                      e.target.value = '';
                    }
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  Adicione uma logo por vez. Cada logo adicionada abre um novo campo.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("sleeves_right")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep("notes")}
                disabled={
                  hasLogo === null || 
                  (hasLogo === "sim" && logoFiles.length === 0) ||
                  (hasLogo === "criar_logo" && !logoDescription.trim())
                }
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case "notes":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <RadioGroup 
                value={selectedPriority} 
                onValueChange={(value) => {
                  const newPriority = value as TaskPriority;
                  setSelectedPriority(newPriority);
                  if (newPriority === "urgent") {
                    setUrgentReasonDialogOpen(true);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="priority-normal" />
                  <Label htmlFor="priority-normal" className="cursor-pointer">🟡 Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="urgent" id="priority-urgent" />
                  <Label htmlFor="priority-urgent" className="cursor-pointer">🔴 Urgente ⚠️ Requer aprovação</Label>
                </div>
              </RadioGroup>
              {selectedPriority === "urgent" && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    A prioridade URGENTE requer aprovação de um administrador.
                    {urgentReasonId && " Motivo selecionado ✓"}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2 p-4 border-2 border-amber-500 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Label className="text-base font-medium text-amber-700 dark:text-amber-300">📝 Observações Internas (opcional)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notas ou instruções adicionais para o designer..."
                rows={4}
                className="border-amber-300 dark:border-amber-700 focus:border-amber-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Estas observações são visíveis apenas internamente para a equipe.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("logo_layout")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Requisição"
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Requisição de Layout
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{getStepTitle()}</p>
        </DialogHeader>

        {renderStepContent()}
      </DialogContent>

      <UrgentReasonDialog
        open={urgentReasonDialogOpen}
        onOpenChange={setUrgentReasonDialogOpen}
        onConfirm={(reasonId, reasonText) => {
          setUrgentReasonId(reasonId);
          setUrgentReasonText(reasonText || "");
        }}
      />
    </Dialog>
  );
};

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
import { toast } from "sonner";
import { Loader2, Plus, AlertTriangle, Check, Search, X } from "lucide-react";
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

  // Form states
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
    | "campaign"
    | "uniform"
    | "model"
    | "customer"
    | "front"
    | "back"
    | "sleeves_left"
    | "sleeves_right"
    | "logo"
    | "notes"
  >("campaign");

  // Customization states
  const [frontCustomization, setFrontCustomization] = useState<{
    logoType: 'none' | 'small_left' | 'large_center' | 'custom';
    textColor: string;
    text: string;
    logoUrl: string;
    customDescription?: string;
    customFile?: File | null;
  }>({
    logoType: "none",
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
    if (!selectedCampaignId || !selectedUniformType || !selectedModel) {
      toast.error("Selecione campanha, tipo de uniforme e modelo");
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

    if (!quantity) {
      toast.error("Selecione a quantidade");
      return;
    }

    if (quantity === "custom" && (!customQuantity || parseInt(customQuantity) < 10)) {
      toast.error("A quantidade mínima é 10 unidades");
      return;
    }

    if (hasLogo === null) {
      toast.error("Informe se o cliente tem logo");
      return;
    }

    if (hasLogo === "sim" && logoFiles.length === 0) {
      toast.error("Faça upload de pelo menos uma logo do cliente");
      return;
    }

    setLoading(true);

    try {
      // Upload de logos se fornecidas
      let uploadedLogoUrls: string[] = [];
      if (hasLogo === "sim" && logoFiles.length > 0) {
        for (const file of logoFiles) {
          const url = await uploadLogoToStorage(file);
          if (!url) {
            toast.error("Erro ao fazer upload de uma das logos");
            setLoading(false);
            return;
          }
          uploadedLogoUrls.push(url);
        }
      }

      // Upload do arquivo customFile da frente (se houver)
      let frontLogoUrl = "";
      if (frontCustomization.customFile) {
        const url = await uploadLogoToStorage(frontCustomization.customFile);
        if (url) {
          frontLogoUrl = url;
        }
      }

      // Upload dos logos dos patrocinadores (se houver)
      let sponsorsLogosUrls: string[] = [];
      if (backCustomization.sponsors && backCustomization.sponsors.length > 0) {
        for (const sponsor of backCustomization.sponsors) {
          if (sponsor.logoFile) {
            const url = await uploadLogoToStorage(sponsor.logoFile);
            if (url) {
              sponsorsLogosUrls.push(url);
            }
          }
        }
      }

      // Upload do logo da manga esquerda (se houver)
      let leftSleeveLogoUrl = "";
      if (leftSleeveCustomization.logoFile) {
        const url = await uploadLogoToStorage(leftSleeveCustomization.logoFile);
        if (url) {
          leftSleeveLogoUrl = url;
        }
      }

      // Upload do logo da manga direita (se houver)
      let rightSleeveLogoUrl = "";
      if (rightSleeveCustomization.logoFile) {
        const url = await uploadLogoToStorage(rightSleeveCustomization.logoFile);
        if (url) {
          rightSleeveLogoUrl = url;
        }
      }

      // Obter user ID atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Calcular quantidade final
      const finalQuantity =
        quantity === "custom" ? parseInt(customQuantity) : parseInt(quantity);

      // Preparar dados de customização (remover File objects que não podem ser serializados)
      const customizationData = {
        uniformType: selectedUniformType,
        model: selectedModel.name,
        front: {
          ...frontCustomization,
          logoUrl: frontLogoUrl || frontCustomization.logoUrl, // URL do upload
          customFile: undefined, // Remove File object
          customFileName: frontCustomization.customFile?.name, // Salva apenas o nome
        },
        back: {
          ...backCustomization,
          customFile: undefined, // Remove File object
          customFileName: backCustomization.customFile?.name, // Salva apenas o nome
          sponsorsLogosUrls, // URLs dos uploads dos patrocinadores
          sponsors: backCustomization.sponsors.map(s => ({
            name: s.name,
            logoFileName: s.logoFile?.name, // Salva apenas o nome do arquivo
          })),
        },
        sleeves: {
          left: {
            ...leftSleeveCustomization,
            logoUrl: leftSleeveLogoUrl || leftSleeveCustomization.logoUrl, // URL do upload
            logoFile: undefined, // Remove File object
            logoFileName: leftSleeveCustomization.logoFile?.name, // Salva apenas o nome
          },
          right: {
            ...rightSleeveCustomization,
            logoUrl: rightSleeveLogoUrl || rightSleeveCustomization.logoUrl, // URL do upload
            logoFile: undefined, // Remove File object
            logoFileName: rightSleeveCustomization.logoFile?.name, // Salva apenas o nome
          },
        },
        uploadChoice: hasLogo === "sim" ? "agora" : "depois",
        logoUrls: uploadedLogoUrls,
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
          quantity: finalQuantity,
          customization: customizationData,
          hasLogo: hasLogo !== "sem_logo" && hasLogo !== "depois",
          logoUrls: uploadedLogoUrls,
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

      // 1. Criar ORDER primeiro
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([{
          campaign_id: selectedCampaignId,
          session_id: sessionId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          quantity: finalQuantity,
          model_id: selectedModel.id,
          customization_data: customizationData,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 1.5. Se um cliente existente foi selecionado, vincular ao design_task
      let finalCustomerId = selectedCustomerId;

      // 2. Criar LEAD com order_id
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert([{
          campaign_id: selectedCampaignId,
          session_id: sessionId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          quantity: finalQuantity.toString(),
          order_id: orderData.id,
          created_by: user.id,
          created_by_salesperson: true,
          needs_logo: hasLogo === "depois" || hasLogo === "sem_logo",
          logo_action: hasLogo === "depois" ? "waiting_client" : (hasLogo === "criar_logo" ? "designer_create" : null),
          logo_description: hasLogo === "criar_logo" ? logoDescription : null,
          uploaded_logo_url: uploadedLogoUrls.length > 0 ? uploadedLogoUrls[0] : null,
          customization_summary: customizationData,
          completed: true,
        }])
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Atualizar lead_id, customer_id e prioridade no design_task que foi criado pelo trigger
      const { error: updateTaskError } = await supabase
        .from('design_tasks')
        .update({ 
          lead_id: leadData.id,
          customer_id: finalCustomerId,
          priority: selectedPriority,
          created_by: user.id,
          created_by_salesperson: true,
        })
        .eq('order_id', orderData.id);

      if (updateTaskError) {
        console.error('Erro ao atualizar design_task:', updateTaskError);
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
    setCurrentStep("campaign");
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
    setSelectedCustomerId(null);
    setFrontCustomization({
      logoType: "none",
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

  const renderStepContent = () => {
    switch (currentStep) {
      case "campaign":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campanha *</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a campanha" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setCurrentStep("uniform")}
              disabled={!selectedCampaignId}
              className="w-full"
            >
              Continuar
            </Button>
          </div>
        );

      case "uniform":
        return (
          <div className="space-y-4">
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
                      setCurrentStep("model");
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
            <Button variant="outline" onClick={() => setCurrentStep("campaign")} className="w-full">
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
            <div className="space-y-2">
              <Label>Quantidade *</Label>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("model")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep("front")}
                disabled={
                  !customerName.trim() ||
                  !customerPhone ||
                  !quantity ||
                  (quantity === "custom" && !customQuantity)
                }
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case "front":
        return (
          <div className="space-y-4">
            {selectedModel && (
              <FrontEditor
                model={selectedModel}
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
            {selectedModel && (
              <BackEditor
                model={selectedModel}
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
            {selectedModel && (
              <SleeveEditor
                model={selectedModel}
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
            {selectedModel && (
              <SleeveEditor
                model={selectedModel}
                side="right"
                value={rightSleeveCustomization}
                onChange={(data) => setRightSleeveCustomization({ ...rightSleeveCustomization, ...data })}
                onNext={() => setCurrentStep("logo")}
              />
            )}
            <Button variant="outline" onClick={() => setCurrentStep("sleeves_left")} className="w-full">
              Voltar
            </Button>
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
              <div className="space-y-4 p-4 border-2 border-purple-500 rounded-lg bg-purple-50">
                <Label className="text-base font-medium text-purple-700">
                  🎨 Descreva o que o cliente imagina para a logo *
                </Label>
                <Textarea
                  value={logoDescription}
                  onChange={(e) => setLogoDescription(e.target.value)}
                  placeholder="Ex: Logo com cavalo, cores laranja e preto, estilo moderno e esportivo..."
                  rows={4}
                  className="border-purple-300 focus:border-purple-500 bg-white"
                />
                <p className="text-xs text-purple-600">
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

            <div className="space-y-2">
              <Label>Observações Internas (opcional)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notas ou instruções adicionais para o designer..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("logo")} className="flex-1">
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

  const getStepTitle = () => {
    const titles = {
      campaign: "Selecionar Campanha",
      uniform: "Tipo de Uniforme",
      model: "Escolher Modelo",
      customer: "Dados do Cliente",
      front: "Personalização - Frente",
      back: "Personalização - Costas",
      sleeves_left: "Personalização - Manga Esquerda",
      sleeves_right: "Personalização - Manga Direita",
      logo: "Logo do Cliente",
      notes: "Observações",
    };
    return titles[currentStep] || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

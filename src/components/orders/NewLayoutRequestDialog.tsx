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
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { FrontEditor } from "@/components/customization/FrontEditor";
import { BackEditor } from "@/components/customization/BackEditor";
import { SleeveEditor } from "@/components/customization/SleeveEditor";

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

const UNIFORM_LABELS: Record<string, string> = {
  'ziper': '🧥 Zíper',
  'manga_longa': '👔 Manga Longa',
  'manga_curta': '👕 Manga Curta',
  'regata': '🎽 Regata',
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
  const [hasLogo, setHasLogo] = useState<"sim" | "designer_criar" | "enviar_depois" | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
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
  }>({
    logoType: "none",
    textColor: "#000000",
    text: "",
    logoUrl: "",
  });

  const [backCustomization, setBackCustomization] = useState<{
    logoLarge: boolean;
    logoUrl: string;
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
    sponsors: string[];
    sponsorsLogosUrls?: string[];
  }>({
    logoLarge: false,
    logoUrl: "",
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
  });

  const [leftSleeveCustomization, setLeftSleeveCustomization] = useState({
    flag: false,
    flagUrl: "",
    logoSmall: false,
    logoUrl: "",
    text: false,
    textContent: "",
  });

  const [rightSleeveCustomization, setRightSleeveCustomization] = useState({
    flag: false,
    flagUrl: "",
    logoSmall: false,
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

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, unique_link, segment_tag")
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

    if (hasLogo === "sim" && !logoFile) {
      toast.error("Faça upload da logo do cliente");
      return;
    }

    setLoading(true);

    try {
      // Upload logo se fornecida
      let uploadedLogoUrl: string | null = null;
      if (hasLogo === "sim" && logoFile) {
        uploadedLogoUrl = await uploadLogoToStorage(logoFile);
        if (!uploadedLogoUrl) {
          toast.error("Erro ao fazer upload da logo");
          setLoading(false);
          return;
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

      // Criar session_id único para vendedor
      const sessionId = `salesperson_${user.id}_${Date.now()}`;

      // Calcular quantidade final
      const finalQuantity =
        quantity === "custom" ? parseInt(customQuantity) : parseInt(quantity);

      // Preparar dados de customização
      const customizationData = {
        uniformType: selectedUniformType,
        model: selectedModel.name,
        front: frontCustomization,
        back: backCustomization,
        sleeves: {
          left: leftSleeveCustomization,
          right: rightSleeveCustomization,
        },
        uploadChoice: hasLogo === "sim" ? "agora" : "depois",
        internalNotes,
      };

      // 1. Criar ORDER primeiro
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          campaign_id: selectedCampaignId,
          session_id: sessionId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          quantity: finalQuantity,
          model_id: selectedModel.id,
          customization_data: customizationData,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Criar LEAD com order_id
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert({
          campaign_id: selectedCampaignId,
          session_id: sessionId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          quantity: finalQuantity.toString(),
          order_id: orderData.id,
          created_by: user.id,
          created_by_salesperson: true,
          needs_logo: hasLogo !== "sim",
          logo_action: hasLogo === "designer_criar" ? "designer_create" 
                     : hasLogo === "enviar_depois" ? "waiting_client" 
                     : null,
          uploaded_logo_url: uploadedLogoUrl,
          customization_summary: customizationData,
          completed: true,
        })
        .select()
        .single();

      if (leadError) throw leadError;

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
    setLogoFile(null);
    setInternalNotes("");
    setCurrentStep("campaign");
    setFrontCustomization({
      logoType: "none",
      textColor: "#000000",
      text: "",
      logoUrl: "",
    });
    setBackCustomization({
      logoLarge: false,
      logoUrl: "",
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
    });
    setLeftSleeveCustomization({
      flag: false,
      flagUrl: "",
      logoSmall: false,
      logoUrl: "",
      text: false,
      textContent: "",
    });
    setRightSleeveCustomization({
      flag: false,
      flagUrl: "",
      logoSmall: false,
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
                {Object.entries(UNIFORM_LABELS).map(([key, label]) => (
                  <Card
                    key={key}
                    className={`p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedUniformType === key
                        ? "border-primary ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedUniformType(key)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={UNIFORM_IMAGES[key]}
                        alt={label}
                        className="w-20 h-20 object-contain"
                      />
                      <span className="text-sm font-medium text-center">{label}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("campaign")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep("model")}
                disabled={!selectedUniformType}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
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
                    onClick={() => setSelectedModel(model)}
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("uniform")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep("customer")}
                disabled={!selectedModel}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case "customer":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@exemplo.com"
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
                onChange={setLeftSleeveCustomization}
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
                onChange={setRightSleeveCustomization}
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente tem logo? *</Label>
              <RadioGroup
                value={hasLogo || ""}
                onValueChange={(val) => setHasLogo(val as "sim" | "designer_criar" | "enviar_depois")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="logo-sim" />
                  <Label htmlFor="logo-sim" className="cursor-pointer">
                    ✅ Sim, fazer upload agora
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="designer_criar" id="logo-designer" />
                  <Label htmlFor="logo-designer" className="cursor-pointer">
                    🎨 Não tenho - Designer vai criar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="enviar_depois" id="logo-depois" />
                  <Label htmlFor="logo-depois" className="cursor-pointer">
                    ⏳ Vou enviar depois (email/WhatsApp)
                  </Label>
                </div>
              </RadioGroup>
              {hasLogo === "sim" && (
                <div className="mt-4">
                  <Label>Upload da Logo *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  {logoFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Arquivo selecionado: {logoFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("sleeves_right")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep("notes")}
                disabled={hasLogo === null || (hasLogo === "sim" && !logoFile)}
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
    </Dialog>
  );
};

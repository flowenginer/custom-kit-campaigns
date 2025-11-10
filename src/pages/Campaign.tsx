import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FrontEditor } from "@/components/customization/FrontEditor";
import { BackEditor } from "@/components/customization/BackEditor";
import { SleeveEditor } from "@/components/customization/SleeveEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";

interface ShirtModel {
  id: string;
  name: string;
  photo_main: string;
  image_front: string;
  image_back: string;
  image_right: string;
  image_left: string;
  image_front_small_logo?: string | null;
  image_front_large_logo?: string | null;
  image_front_clean?: string | null;
  features?: string[] | null;
}

interface Campaign {
  id: string;
  name: string;
  segment_id: string;
}

interface FrontCustomization {
  logoType: 'none' | 'small_left' | 'large_center' | 'custom';
  textColor: string;
  text: string;
  logoUrl: string;
}

interface BackCustomization {
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
  sponsors: string[];
  sponsorsLogosUrls?: string[];
}

interface SleeveCustomization {
  flag: boolean;
  flagUrl: string;
  logoSmall: boolean;
  logoUrl: string;
  text: boolean;
  textContent: string;
}

interface CustomizationData {
  front: FrontCustomization;
  back: BackCustomization;
  sleeves: {
    right: SleeveCustomization;
    left: SleeveCustomization;
  };
}

const Campaign = () => {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ShirtModel | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationData>({
    front: {
      logoType: 'none',
      textColor: '#000000',
      text: '',
      logoUrl: ''
    },
    back: {
      logoLarge: false,
      logoUrl: '',
      name: false,
      nameText: '',
      whatsapp: false,
      whatsappText: '',
      instagram: false,
      instagramText: '',
      email: false,
      emailText: '',
      website: false,
      websiteText: '',
      sponsors: []
    },
    sleeves: {
      right: { flag: false, flagUrl: '', logoSmall: false, logoUrl: '', text: false, textContent: '' },
      left: { flag: false, flagUrl: '', logoSmall: false, logoUrl: '', text: false, textContent: '' }
    }
  });
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: "",
    customQuantity: 10,
  });
  const [utmParams, setUtmParams] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploadedLogos, setUploadedLogos] = useState<{
    frontLogo: File | null;
    backLogo: File | null;
    sponsorsLogos: File[];
    rightFlag: File | null;
    rightLogo: File | null;
    leftFlag: File | null;
    leftLogo: File | null;
  }>({
    frontLogo: null,
    backLogo: null,
    sponsorsLogos: [],
    rightFlag: null,
    rightLogo: null,
    leftFlag: null,
    leftLogo: null,
  });

  // Debounced values for auto-save
  const [debouncedCustomerData] = useDebounce(customerData, 1500);
  const [debouncedCustomizations] = useDebounce(customizations, 2000);

  const steps = [
    "Dados Iniciais",
    "Selecionar Modelo",
    "Personalizar Frente",
    "Personalizar Costas",
    "Manga Direita",
    "Manga Esquerda",
    "Revisão e Envio",
  ];

  useEffect(() => {
    if (uniqueLink) {
      loadCampaign();
    }
  }, [uniqueLink]);

  useEffect(() => {
    if (campaign && currentStep === 0) {
      trackEvent("visit");
      
      // Capturar parâmetros UTM da URL
      const params = new URLSearchParams(window.location.search);
      setUtmParams({
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_term: params.get('utm_term') || '',
        utm_content: params.get('utm_content') || '',
      });
    }
  }, [campaign]);

  // Auto-save das customizações e updates de step (steps 1-6)

  useEffect(() => {
    const autoSaveCustomizations = async () => {
      // Só fazer auto-save se já tiver um leadId (lead já foi criado no step 0)
      if (leadId && currentStep >= 1 && currentStep <= 6) {
        setIsSaving(true);
        await createOrUpdateLead(currentStep);
        setLastSaved(new Date());
        setIsSaving(false);
      }
    };

    autoSaveCustomizations();
  }, [debouncedCustomizations, leadId, currentStep]);

  // Auto-save periódico a cada 30 segundos
  useEffect(() => {
    if (!leadId || !campaign) return;

    const intervalId = setInterval(async () => {
      setIsSaving(true);
      await createOrUpdateLead(currentStep);
      setLastSaved(new Date());
      setIsSaving(false);
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [leadId, currentStep, campaign]);

  // Heartbeat: atualizar status online a cada 5 segundos
  useEffect(() => {
    if (!leadId) return;

    // Marcar como online ao entrar
    const markOnline = async () => {
      await supabase
        .from('leads')
        .update({ 
          is_online: true, 
          last_seen: new Date().toISOString() 
        })
        .eq('id', leadId);
    };

    markOnline();

    // Enviar "ping" a cada 5 segundos
    const heartbeatInterval = setInterval(async () => {
      await supabase
        .from('leads')
        .update({ 
          is_online: true, 
          last_seen: new Date().toISOString() 
        })
        .eq('id', leadId);
    }, 5000);

    return () => clearInterval(heartbeatInterval);
  }, [leadId]);

  // Marcar como offline quando usuário sai da página
  useEffect(() => {
    if (!leadId) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const markOffline = () => {
      // sendBeacon é mais confiável que fetch durante unload
      const data = new Blob([JSON.stringify({ 
        is_online: false, 
        last_seen: new Date().toISOString() 
      })], { type: 'application/json' });
      
      navigator.sendBeacon(
        `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
        data
      );
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Página ficou em background - usar sendBeacon
        markOffline();
      } else {
        // Página voltou ao foreground
        await supabase
          .from('leads')
          .update({ 
            is_online: true, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', leadId);
      }
    };

    // beforeunload e pagehide para garantir detecção de fechamento
    window.addEventListener('beforeunload', markOffline);
    window.addEventListener('pagehide', markOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', markOffline);
      window.removeEventListener('pagehide', markOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leadId]);

  const loadCampaign = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name, segment_id")
        .eq("unique_link", uniqueLink)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        toast.error("Campanha não encontrada");
        return;
      }

      setCampaign(campaignData);

      // Buscar modelos do segmento da campanha
      if (campaignData.segment_id) {
        const { data: modelsData } = await supabase
          .from("shirt_models")
          .select("*")
          .eq("segment_id", campaignData.segment_id);

        if (modelsData) setModels(modelsData);
      }
    } catch (error) {
      console.error("Erro ao carregar campanha:", error);
      toast.error("Erro ao carregar campanha");
    } finally {
      setIsLoading(false);
    }
  };

  const trackEvent = async (eventType: string) => {
    if (!campaign) return;

    await supabase.from("funnel_events").insert({
      campaign_id: campaign.id,
      session_id: sessionId,
      event_type: eventType,
    });
  };

  const createOrUpdateLead = async (stepNumber: number, isCompleted = false, orderId?: string) => {
    try {
      const leadData = {
        campaign_id: campaign?.id,
        session_id: sessionId,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || null,
        quantity: customerData.quantity,
        custom_quantity: customerData.quantity === 'custom' ? customerData.customQuantity : null,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_term: utmParams.utm_term || null,
        utm_content: utmParams.utm_content || null,
        current_step: stepNumber,
        completed: isCompleted,
        order_id: orderId || null,
        customization_summary: {
          model: selectedModel?.name,
          front: customizations.front,
          back: customizations.back,
          sleeves: customizations.sleeves,
        } as any,
      };

      if (leadId) {
        // Atualizar lead existente
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', leadId);
        
        if (error) throw error;
      } else {
        // Criar novo lead
        const { data, error } = await supabase
          .from('leads')
          .insert(leadData)
          .select()
          .single();
        
        if (error) throw error;
        if (data) setLeadId(data.id);
      }
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    }
  };

  const handleNext = async () => {
    // Validação Step 0: Dados iniciais
    if (currentStep === 0) {
      if (!customerData.name.trim()) {
        toast.error("Por favor, digite seu nome");
        return;
      }
      if (!customerData.phone.trim()) {
        toast.error("Por favor, digite seu WhatsApp");
        return;
      }
      if (!customerData.quantity) {
        toast.error("Por favor, selecione a quantidade");
        return;
      }
      if (customerData.quantity === 'custom' && customerData.customQuantity < 10) {
        toast.error("A quantidade mínima é 10 unidades");
        return;
      }
      
      // Criar/atualizar lead IMEDIATAMENTE ao clicar "Próximo" no Step 0
      setIsSaving(true);
      await createOrUpdateLead(0);
      setIsSaving(false);
      
      toast.success("Dados salvos com sucesso!");
    }

    // Validação Step 1: Selecionar modelo
    if (currentStep === 1 && !selectedModel) {
      toast.error("Selecione um modelo para continuar");
      return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    // Atualizar step imediatamente após avançar
    if (leadId) {
      await createOrUpdateLead(nextStep);
    }

    if (nextStep >= 1 && nextStep <= 6) {
      trackEvent(`step_${nextStep}`);
    }
  };

  const handleBack = async () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    
    // Atualizar step ao voltar também
    if (leadId) {
      await createOrUpdateLead(prevStep);
    }
  };

  const uploadToSupabase = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('customer-logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('customer-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFrontLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, frontLogo: file });
  };

  const handleBackLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, backLogo: file });
  };

  const handleSponsorLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSponsorsLogos = [...uploadedLogos.sponsorsLogos];
      newSponsorsLogos[index] = file;
      setUploadedLogos({ ...uploadedLogos, sponsorsLogos: newSponsorsLogos });
    }
  };

  const handleRightFlagUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, rightFlag: file });
  };

  const handleRightLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, rightLogo: file });
  };

  const handleLeftFlagUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, leftFlag: file });
  };

  const handleLeftLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogos({ ...uploadedLogos, leftLogo: file });
  };

  const handleSubmitOrder = async () => {
    if (!campaign || !selectedModel) return;

    setIsSaving(true);

    try {
      // Upload all logos first
      const uploadedUrls = {
        frontLogoUrl: '',
        backLogoUrl: '',
        sponsorsLogosUrls: [] as string[],
        rightFlagUrl: '',
        rightLogoUrl: '',
        leftFlagUrl: '',
        leftLogoUrl: ''
      };

      if (uploadedLogos.frontLogo) {
        uploadedUrls.frontLogoUrl = await uploadToSupabase(uploadedLogos.frontLogo, 'logos');
      }

      if (uploadedLogos.backLogo) {
        uploadedUrls.backLogoUrl = await uploadToSupabase(uploadedLogos.backLogo, 'logos');
      }

      for (const logo of uploadedLogos.sponsorsLogos) {
        if (logo) {
          const url = await uploadToSupabase(logo, 'logos');
          uploadedUrls.sponsorsLogosUrls.push(url);
        }
      }

      if (uploadedLogos.rightFlag) {
        uploadedUrls.rightFlagUrl = await uploadToSupabase(uploadedLogos.rightFlag, 'flags');
      }

      if (uploadedLogos.rightLogo) {
        uploadedUrls.rightLogoUrl = await uploadToSupabase(uploadedLogos.rightLogo, 'logos');
      }

      if (uploadedLogos.leftFlag) {
        uploadedUrls.leftFlagUrl = await uploadToSupabase(uploadedLogos.leftFlag, 'flags');
      }

      if (uploadedLogos.leftLogo) {
        uploadedUrls.leftLogoUrl = await uploadToSupabase(uploadedLogos.leftLogo, 'logos');
      }

      // Update customizations with uploaded URLs
      const finalCustomizations = {
        ...customizations,
        front: { ...customizations.front, logoUrl: uploadedUrls.frontLogoUrl },
        back: { 
          ...customizations.back, 
          logoUrl: uploadedUrls.backLogoUrl,
          sponsorsLogosUrls: uploadedUrls.sponsorsLogosUrls 
        },
        sleeves: {
          right: { 
            ...customizations.sleeves.right, 
            logoUrl: uploadedUrls.rightLogoUrl,
            flagUrl: uploadedUrls.rightFlagUrl 
          },
          left: { 
            ...customizations.sleeves.left, 
            logoUrl: uploadedUrls.leftLogoUrl,
            flagUrl: uploadedUrls.leftFlagUrl 
          }
        }
      };

      // Calcular quantidade final
      const finalQuantity = customerData.quantity === 'custom' 
        ? customerData.customQuantity 
        : customerData.quantity === '60+' 
        ? 60 
        : parseInt(customerData.quantity);

      const { data: orderData, error: insertError } = await supabase.from("orders").insert({
        campaign_id: campaign.id,
        model_id: selectedModel.id,
        session_id: sessionId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        quantity: finalQuantity,
        customization_data: finalCustomizations as any,
      })
      .select()
      .single();

      if (insertError) throw insertError;

      // Atualizar lead como completo e vincular ao pedido
      if (orderData) {
        await createOrUpdateLead(6, true, orderData.id);
      }

      await trackEvent("completed");

      toast.success("Pedido enviado com sucesso!");
      setCurrentStep(0);
      setSelectedModel(null);
      setCustomizations({
        front: {
          logoType: 'none',
          textColor: '#000000',
          text: '',
          logoUrl: ''
        },
        back: {
          logoLarge: false,
          logoUrl: '',
          name: false,
          nameText: '',
          whatsapp: false,
          whatsappText: '',
          instagram: false,
          instagramText: '',
          email: false,
          emailText: '',
          website: false,
          websiteText: '',
          sponsors: []
        },
        sleeves: {
          right: { flag: false, flagUrl: '', logoSmall: false, logoUrl: '', text: false, textContent: '' },
          left: { flag: false, flagUrl: '', logoSmall: false, logoUrl: '', text: false, textContent: '' }
        }
      });
      setCustomerData({ name: "", email: "", phone: "", quantity: "", customQuantity: 10 });
      setUploadedLogos({
        frontLogo: null,
        backLogo: null,
        sponsorsLogos: [],
        rightFlag: null,
        rightLogo: null,
        leftFlag: null,
        leftLogo: null,
      });
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast.error("Erro ao enviar pedido");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Campanha não encontrada</h1>
        <p className="text-muted-foreground">Verifique o link e tente novamente</p>
      </div>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {/* Logo Space Sports */}
          <div className="flex justify-center mb-6">
            <img 
              src="https://cdn.awsli.com.br/400x300/1896/1896367/logo/space-logo-site-wgernz.png" 
              alt="Space Sports" 
              className="h-16 w-auto"
            />
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2">{campaign.name}</h1>
          <p className="text-center text-muted-foreground mb-4">
            {steps[currentStep]} - Etapa {currentStep + 1} de {steps.length}
          </p>
          
          {/* Step Indicator */}
          <div className="flex justify-center items-center gap-2 mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex flex-col items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    index <= currentStep 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background border-muted'
                  }`}>
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block max-w-[80px] text-center">{step}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Indicador de auto-save */}
          {leadId && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Salvando...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Salvo automaticamente às {format(lastSaved, "HH:mm:ss")}
                  </span>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === 0 && (
            <Card className="shadow-lg max-w-2xl mx-auto">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6 text-center">
                  Vamos começar! Preencha seus dados
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="initial-name">Digite seu nome*</Label>
                    <Input
                      id="initial-name"
                      placeholder="Seu nome completo"
                      value={customerData.name}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="initial-whatsapp">Digite seu WhatsApp*</Label>
                    <Input
                      id="initial-whatsapp"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={customerData.phone}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, phone: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="quantity-select">Quantidade*</Label>
                    <Select
                      value={customerData.quantity}
                      onValueChange={(value) => {
                        setCustomerData({ ...customerData, quantity: value });
                      }}
                    >
                      <SelectTrigger id="quantity-select">
                        <SelectValue placeholder="Selecione a quantidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 unidades</SelectItem>
                        <SelectItem value="20">20 unidades</SelectItem>
                        <SelectItem value="30">30 unidades</SelectItem>
                        <SelectItem value="40">40 unidades</SelectItem>
                        <SelectItem value="50">50 unidades</SelectItem>
                        <SelectItem value="60+">60 ou mais</SelectItem>
                        <SelectItem value="custom">Quantidade personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customerData.quantity === 'custom' && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <Label htmlFor="custom-quantity">Digite a quantidade (mínimo 10)*</Label>
                      <Input
                        id="custom-quantity"
                        type="number"
                        min="10"
                        placeholder="Digite a quantidade desejada"
                        value={customerData.customQuantity}
                        onChange={(e) =>
                          setCustomerData({
                            ...customerData,
                            customQuantity: parseInt(e.target.value) || 10,
                          })
                        }
                        required
                      />
                      {customerData.customQuantity < 10 && (
                        <p className="text-sm text-destructive mt-2">
                          A quantidade mínima é 10 unidades
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-center">Escolha seu modelo</h2>
              <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                {models.map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                      selectedModel?.id === model.id
                        ? "ring-4 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedModel(model)}
                  >
                    <img
                      src={model.photo_main}
                      alt={model.name}
                      className="w-full h-auto"
                    />
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && selectedModel && (
            <FrontEditor
              model={selectedModel}
              value={customizations.front}
              onChange={(data) =>
                setCustomizations({ ...customizations, front: data })
              }
            />
          )}

          {currentStep === 3 && selectedModel && (
            <BackEditor
              model={selectedModel}
              value={customizations.back}
              onChange={(data) =>
                setCustomizations({ ...customizations, back: data })
              }
            />
          )}

          {currentStep === 4 && selectedModel && (
            <SleeveEditor
              model={selectedModel}
              side="right"
              value={customizations.sleeves.right}
              onChange={(data) =>
                setCustomizations({
                  ...customizations,
                  sleeves: { ...customizations.sleeves, right: data }
                })
              }
            />
          )}

          {currentStep === 5 && selectedModel && (
            <SleeveEditor
              model={selectedModel}
              side="left"
              value={customizations.sleeves.left}
              onChange={(data) =>
                setCustomizations({
                  ...customizations,
                  sleeves: { ...customizations.sleeves, left: data }
                })
              }
            />
          )}

          {currentStep === 6 && selectedModel && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Revisão e Envio</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Modelo Selecionado:</p>
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedModel.photo_main}
                          alt={selectedModel.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div>
                          <p className="font-semibold">{selectedModel.name}</p>
                          {selectedModel.features && selectedModel.features.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedModel.features.map((feature, idx) => (
                                <span key={idx} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Resumo das Personalizações:</h3>
                    <div className="space-y-3 text-sm bg-muted/30 p-4 rounded-lg">
                      <div>
                        <p className="font-medium text-primary">Frente:</p>
                        <p className="ml-4">Tipo: {customizations.front.logoType === 'small_left' ? 'Logo pequena esquerda' : customizations.front.logoType === 'large_center' ? 'Logo grande centro' : customizations.front.logoType === 'custom' ? 'Personalizada' : 'Nenhuma'}</p>
                        {customizations.front.text && <p className="ml-4">Texto: {customizations.front.text}</p>}
                      </div>
                      
                      <div>
                        <p className="font-medium text-primary">Costas:</p>
                        {customizations.back.logoLarge && <p className="ml-4">• Logo grande</p>}
                        {customizations.back.name && <p className="ml-4">• Nome: {customizations.back.nameText}</p>}
                        {customizations.back.whatsapp && <p className="ml-4">• WhatsApp: {customizations.back.whatsappText}</p>}
                        {customizations.back.instagram && <p className="ml-4">• Instagram: {customizations.back.instagramText}</p>}
                        {customizations.back.email && <p className="ml-4">• Email: {customizations.back.emailText}</p>}
                        {customizations.back.website && <p className="ml-4">• Site: {customizations.back.websiteText}</p>}
                        {customizations.back.sponsors.length > 0 && (
                          <p className="ml-4">• Patrocinadores: {customizations.back.sponsors.join(', ')}</p>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-primary">Mangas:</p>
                        {(customizations.sleeves.right.flag || customizations.sleeves.right.logoSmall || customizations.sleeves.right.text) && (
                          <p className="ml-4">• Direita: {[
                            customizations.sleeves.right.flag && 'Bandeira',
                            customizations.sleeves.right.logoSmall && 'Logo',
                            customizations.sleeves.right.text && customizations.sleeves.right.textContent
                          ].filter(Boolean).join(', ')}</p>
                        )}
                        {(customizations.sleeves.left.flag || customizations.sleeves.left.logoSmall || customizations.sleeves.left.text) && (
                          <p className="ml-4">• Esquerda: {[
                            customizations.sleeves.left.flag && 'Bandeira',
                            customizations.sleeves.left.logoSmall && 'Logo',
                            customizations.sleeves.left.text && customizations.sleeves.left.textContent
                          ].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">📤 Envie suas Imagens:</h3>
                    <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                      {customizations.front.logoType !== 'none' && (
                        <div className="space-y-2">
                          <Label>
                            Logo da Frente ({
                              customizations.front.logoType === 'small_left' 
                                ? 'Pequena Esquerda' 
                                : customizations.front.logoType === 'large_center' 
                                ? 'Grande Centro' 
                                : 'Personalizada'
                            })*
                          </Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFrontLogoUpload} 
                            required 
                          />
                        </div>
                      )}

                      {customizations.back.logoLarge && (
                        <div className="space-y-2">
                          <Label>Logo Grande das Costas*</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleBackLogoUpload} 
                            required 
                          />
                        </div>
                      )}

                      {customizations.back.sponsors.length > 0 && (
                        <div className="space-y-3">
                          <Label>Logos dos Patrocinadores*</Label>
                          {customizations.back.sponsors.map((sponsor, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label className="text-sm font-normal">{sponsor}</Label>
                              <Input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleSponsorLogoUpload(e, idx)} 
                                required 
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {customizations.sleeves.right.flag && (
                        <div className="space-y-2">
                          <Label>Bandeira - Manga Direita*</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleRightFlagUpload} 
                            required 
                          />
                        </div>
                      )}

                      {customizations.sleeves.right.logoSmall && (
                        <div className="space-y-2">
                          <Label>Logo Pequena - Manga Direita*</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleRightLogoUpload} 
                            required 
                          />
                        </div>
                      )}

                      {customizations.sleeves.left.flag && (
                        <div className="space-y-2">
                          <Label>Bandeira - Manga Esquerda*</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLeftFlagUpload} 
                            required 
                          />
                        </div>
                      )}

                      {customizations.sleeves.left.logoSmall && (
                        <div className="space-y-2">
                          <Label>Logo Pequena - Manga Esquerda*</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLeftLogoUpload} 
                            required 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">📧 Quer receber atualizações por email? (opcional)</h3>
                    <div className="max-w-md">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={customerData.email}
                        onChange={(e) =>
                          setCustomerData({ ...customerData, email: e.target.value })
                        }
                      />
                    </div>

                    <Button 
                      onClick={handleSubmitOrder} 
                      className="w-full" 
                      size="lg"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-5 w-5" />
                          Enviar Pedido
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {currentStep < 6 && (
            <Button onClick={handleNext} size="lg">
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaign;

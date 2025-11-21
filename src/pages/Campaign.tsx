import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useCampaignTheme } from "@/hooks/useCampaignTheme";
import { CustomScriptManager } from "@/components/campaign/CustomScriptManager";
import { FrontEditor } from "@/components/customization/FrontEditor";
import { BackEditor } from "@/components/customization/BackEditor";
import { SleeveEditor } from "@/components/customization/SleeveEditor";
import { LogoUploader } from "@/components/customization/LogoUploader";
import { CustomizationSummary } from "@/components/creation/CustomizationSummary";

// Importar imagens dos uniformes
import mangaCurtaImg from "@/assets/uniforms/manga-curta.png";
import mangaLongaImg from "@/assets/uniforms/manga-longa.png";
import regataImg from "@/assets/uniforms/regata.png";
import ziperMangaLongaImg from "@/assets/uniforms/ziper-manga-longa.png";
import logoImg from "@/assets/logo-ss.png";

const UNIFORM_IMAGES: Record<string, string> = {
  'ziper': ziperMangaLongaImg,
  'manga_longa': mangaLongaImg,
  'manga_curta': mangaCurtaImg,
  'regata': regataImg,
};

const UNIFORM_LABELS: Record<string, string> = {
  'ziper': 'Zíper',
  'manga_longa': 'Manga Longa',
  'manga_curta': 'Manga Curta',
  'regata': 'Regata',
};

const TOTAL_STEPS = [
  { id: 'select_type', label: 'Tipo', order: 0, enabled: true },
  { id: 'enter_name', label: 'Nome', order: 1, enabled: true },
  { id: 'enter_phone', label: 'WhatsApp', order: 2, enabled: true },
  { id: 'select_quantity', label: 'Quantidade', order: 3, enabled: true },
  { id: 'choose_model', label: 'Modelo', order: 4, enabled: true },
  { id: 'customize_front', label: 'Frente', order: 5, enabled: true },
  { id: 'customize_back', label: 'Costas', order: 6, enabled: true },
  { id: 'customize_sleeves_left', label: 'Manga Esq.', order: 7, enabled: true },
  { id: 'customize_sleeves_right', label: 'Manga Dir.', order: 8, enabled: true },
  { id: 'upload_logos', label: 'Logos', order: 9, enabled: true },
  { id: 'review', label: 'Revisão', order: 10, enabled: true }
];

const STORAGE_KEY = 'campaign_progress';

export default function Campaign() {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [leadId, setLeadId] = useState<string | null>(null);
  
  // New states for models and types
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [availableUniformTypes, setAvailableUniformTypes] = useState<string[]>([]);
  const [selectedUniformType, setSelectedUniformType] = useState<string | null>(null);
  
  // Estados simplificados
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    quantity: null as number | 'custom' | null,
    customQuantity: null as number | null
  });
  
  // Estados de customização
  const [customizations, setCustomizations] = useState<any>({
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
      hasSponsors: false,
      sponsorsLocation: '',
      sponsors: [],
      sponsorsLogosUrls: []
    },
    sleeves: {
      left: {
        flag: false,
        flagUrl: '',
        logoSmall: false,
        logoUrl: '',
        text: false,
        textContent: ''
      },
      right: {
        flag: false,
        flagUrl: '',
        logoSmall: false,
        logoUrl: '',
        text: false,
        textContent: ''
      }
    }
  });
  
  const [uploadedLogos, setUploadedLogos] = useState<any>({
    frontLogo: null,
    backLogo: null,
    sponsorsLogos: [],
    rightFlag: null,
    rightLogo: null,
    leftFlag: null,
    leftLogo: null
  });
  
  const [uploadChoice, setUploadChoice] = useState<'agora' | 'depois' | null>(null);
  
  // UTM Parameters
  const [utmParams, setUtmParams] = useState({
    utm_source: null as string | null,
    utm_medium: null as string | null,
    utm_campaign: null as string | null,
    utm_term: null as string | null,
    utm_content: null as string | null,
  });

  // A/B Testing
  const [abTestId, setAbTestId] = useState<string | null>(null);
  const [abVariantId, setAbVariantId] = useState<string | null>(null);

  // Load campaign theme (applies CSS variables automatically)
  useCampaignTheme(campaign?.id);

  const currentStepId = TOTAL_STEPS[currentStep]?.id;
  const progress = ((currentStep + 1) / TOTAL_STEPS.length) * 100;

  // Carregar campanha
  useEffect(() => {
    const loadCampaign = async () => {
      if (!uniqueLink) return;

      try {
        const { data: campaignData, error } = await supabase
          .from("campaigns")
          .select("*")
          .eq("unique_link", uniqueLink)
          .single();

        if (error || !campaignData) {
          navigate("/404");
          return;
        }

        setCampaign(campaignData);
        
        // Load models based on segment_tag
        if (campaignData.segment_tag) {
          const { data: modelsData } = await supabase
            .from("shirt_models")
            .select("*")
            .eq("segment_tag", campaignData.segment_tag);

          if (modelsData) {
            setAvailableModels(modelsData);
            
            // Get unique model_tags
            const uniqueTypes = [...new Set(modelsData.map((m: any) => m.model_tag))].filter(Boolean);
            setAvailableUniformTypes(uniqueTypes as string[]);
          }
        }
        
        // Load global scripts
        const { data: globalSettings } = await supabase
          .from('global_settings')
          .select('*')
          .single();
      } catch (error) {
        console.error("Erro ao carregar campanha:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [uniqueLink, navigate]);

  // Ler parâmetros UTM e A/B testing
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    setUtmParams({
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_term: searchParams.get('utm_term'),
      utm_content: searchParams.get('utm_content'),
    });

    const abTest = searchParams.get('ab_test');
    const abVariant = searchParams.get('ab_variant');
    
    if (abTest) setAbTestId(abTest);
    if (abVariant) setAbVariantId(abVariant);
  }, [location.search]);

  // Gerar/recuperar session ID
  useEffect(() => {
    let sid = localStorage.getItem('session_id');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', sid);
    }
    setSessionId(sid);
  }, []);

  // Restaurar progresso salvo
  useEffect(() => {
    if (!campaign) return;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.campaignId === campaign.id) {
          setCurrentStep(data.currentStep || 0);
          
          // Só restaurar selectedModel se já passou da etapa de seleção
          const chooseModelStepIndex = TOTAL_STEPS.findIndex(s => s.id === 'choose_model');
          if (data.currentStep > chooseModelStepIndex) {
            setSelectedModel(data.selectedModel || null);
          }
          
          setCustomerData(data.customerData || {
            name: '',
            phone: '',
            quantity: null,
            customQuantity: null
          });
          setCustomizations(data.customizations || customizations);
          setUploadedLogos(data.uploadedLogos || uploadedLogos);
          setUploadChoice(data.uploadChoice || null);
          setLeadId(data.leadId || null);
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar progresso:', error);
    }
  }, [campaign]);

  // Auto-save progress
  useEffect(() => {
    if (!campaign) return;

    const dataToSave = {
      campaignId: campaign.id,
      currentStep,
      selectedModel,
      customerData,
      customizations,
      uploadedLogos,
      uploadChoice,
      leadId,
      lastSaved: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [campaign, currentStep, selectedModel, customerData, customizations, uploadedLogos, uploadChoice, leadId]);

  // Track events
  const trackEvent = async (eventType: string) => {
    if (!campaign || !sessionId) return;

    try {
      await supabase.from("funnel_events").insert({
        campaign_id: campaign.id,
        session_id: sessionId,
        event_type: eventType,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_term: utmParams.utm_term,
        utm_content: utmParams.utm_content,
      });
    } catch (error) {
      console.error("Erro ao rastrear evento:", error);
    }
  };

  // Track campaign visit
  useEffect(() => {
    if (campaign && sessionId) {
      trackEvent('campaign_visit');
    }
  }, [campaign, sessionId]);

  // Generate lead group ID
  const generateLeadGroupId = () => {
    const phone = customerData.phone.replace(/\D/g, '');
    return `${campaign.id}_${phone}`;
  };

  // Get attempt number
  const getAttemptNumber = async (leadGroupId: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('attempt_number')
        .eq('lead_group_identifier', leadGroupId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? (data[0].attempt_number || 0) + 1 : 1;
    } catch (error) {
      console.error('Erro ao obter número de tentativa:', error);
      return 1;
    }
  };

  // Create or update lead
  const createOrUpdateLead = async (step: number, completed: boolean = false, orderId: string | null = null) => {
    if (!campaign || !sessionId) return;

    try {
      const leadGroupId = generateLeadGroupId();
      const attemptNumber = await getAttemptNumber(leadGroupId);

      const leadData = {
        campaign_id: campaign.id,
        session_id: sessionId,
        name: customerData.name || 'Visitante',
        phone: customerData.phone,
        quantity: customerData.quantity === 'custom' 
          ? (customerData.customQuantity?.toString() || '0')
          : (customerData.quantity?.toString() || '0'),
        current_step: step,
        completed,
        order_id: orderId,
        customization_summary: {
          model: selectedModel?.name || null,
          front: customizations.front,
          back: customizations.back,
          sleeves: customizations.sleeves
        },
        lead_group_identifier: leadGroupId,
        attempt_number: attemptNumber,
        ab_test_id: abTestId,
        ab_variant: abVariantId,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_term: utmParams.utm_term,
        utm_content: utmParams.utm_content,
        is_online: true,
        last_seen: new Date().toISOString()
      };

      if (leadId) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', leadId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert(leadData)
          .select()
          .single();

        if (error) throw error;
        setLeadId(data.id);
      }
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    }
  };

  // Handle phone change with unified mask
  const handlePhoneChange = (value: string) => {
    // Remove all non-numeric characters
    let cleaned = value.replace(/\D/g, '').slice(0, 11); // DDD (2) + number (9)
    
    // Apply mask: (DD) 00000-0000 or (DD) 0000-0000
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
    
    setCustomerData({ ...customerData, phone: formatted });
  };

  // Avançar para o próximo passo (sem validações)
  const goToNextStep = async () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await trackEvent(`step_${nextStep + 1}`);
    await createOrUpdateLead(nextStep);
  };

  // Handle next step (com validações)
  const handleNext = async () => {
    // Validations per step
    if (currentStepId === 'choose_model' && !selectedModel) {
      toast.error('Selecione um modelo antes de continuar');
      return;
    }

    if (currentStepId === 'enter_name') {
      if (!customerData.name.trim()) {
        toast.error('Por favor, informe seu nome');
        return;
      }
    }

    if (currentStepId === 'enter_phone') {
      const phoneDigits = customerData.phone.replace(/\D/g, '');
      
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        toast.error('Informe um número de WhatsApp válido com DDD');
        return;
      }
    }

    if (currentStepId === 'select_quantity') {
      if (!customerData.quantity) {
        toast.error('Selecione uma quantidade');
        return;
      }

      if (customerData.quantity === 'custom') {
        if (!customerData.customQuantity || customerData.customQuantity < 10) {
          toast.error('A quantidade mínima é 10 unidades');
          return;
        }
      }
    }
    
    // Validação etapa upload logos
    if (currentStepId === 'upload_logos') {
      if (!uploadChoice) {
        toast.error('Escolha quando deseja enviar as logos');
        return;
      }

      // Se escolheu enviar agora, precisa ter pelo menos uma logo
      if (uploadChoice === 'agora') {
        const hasAnyLogo =
          uploadedLogos.frontLogo ||
          uploadedLogos.backLogo ||
          uploadedLogos.rightFlag ||
          uploadedLogos.rightLogo ||
          uploadedLogos.leftFlag ||
          uploadedLogos.leftLogo ||
          (uploadedLogos.sponsorsLogos && uploadedLogos.sponsorsLogos.length > 0);

        if (!hasAnyLogo) {
          toast.error('Envie pelo menos uma logo para continuar');
          return;
        }
      }
    }

    // Última etapa - submit order
    if (currentStepId === 'review') {
      await handleSubmitOrder();
      return;
    }

    await goToNextStep();
  };
  // Handle back
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Upload logo file to Supabase Storage
  const uploadLogoFile = async (file: File | null, path: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${path}/${fileName}`;

      console.log('Fazendo upload da logo:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('customer-logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(filePath);

      console.log('URL pública da logo:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro no upload da logo:', error);
      return null;
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    try {
      setIsSaving(true);

      const finalQuantity = customerData.quantity === 'custom' 
        ? customerData.customQuantity 
        : customerData.quantity;

      // Upload logos se a escolha for "agora"
      let finalCustomizations = { ...customizations };

      if (uploadChoice === 'agora') {
        console.log('Fazendo upload das logos...');
        
        // Upload front logo
        const frontUrl = await uploadLogoFile(uploadedLogos.frontLogo, 'front');
        
        // Upload back logo (se não tiver, usa a mesma da frente)
        const backUrl = await uploadLogoFile(
          uploadedLogos.backLogo || uploadedLogos.frontLogo,
          'back'
        );

        if (frontUrl) {
          finalCustomizations = {
            ...finalCustomizations,
            front: { ...finalCustomizations.front, logoUrl: frontUrl },
          };
        }

        if (backUrl) {
          finalCustomizations = {
            ...finalCustomizations,
            back: { ...finalCustomizations.back, logoUrl: backUrl },
          };
        }

        // Atualizar o estado
        setCustomizations(finalCustomizations);
        
        console.log('Logos enviadas com sucesso!');
      }

      const orderData = {
        campaign_id: campaign.id,
        session_id: sessionId,
        customer_name: customerData.name,
        customer_phone: customerData.phone,
        quantity: finalQuantity,
        customization_data: {
          model: selectedModel.name,
          model_id: selectedModel.id,
          front: finalCustomizations.front,
          back: finalCustomizations.back,
          sleeves: finalCustomizations.sleeves,
          uploadChoice: uploadChoice
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Update lead as completed
      await createOrUpdateLead(TOTAL_STEPS.length, true, order.id);
      await trackEvent('order_completed');

      // Clear session storage
      sessionStorage.removeItem(STORAGE_KEY);

      toast.success('Pedido enviado com sucesso!');

      // Redirect to Instagram
      setTimeout(() => {
        window.location.href = 'https://www.instagram.com/spacesports.oficial/';
      }, 1000);
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Select model and auto-advance
  const handleSelectModel = async (model: any) => {
    setSelectedModel(model);
    await createOrUpdateLead(currentStep);
    
    // Espera um pouco para UX e depois avança SEM revalidar o modelo
    setTimeout(() => {
      goToNextStep();
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campanha não encontrada</h1>
          <Button onClick={() => navigate('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomScriptManager 
        headScripts={campaign.custom_head_scripts}
        bodyScripts={campaign.custom_body_scripts}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        {/* Faixa vermelha com logo */}
        <div className="bg-red-600 py-3">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <img src={logoImg} alt="Logo" className="h-12" />
            </div>
          </div>
        </div>
        
        {/* Área branca com indicadores de progresso */}
        <div className="container mx-auto px-4 py-4">
          {/* Progress bar - apenas a barra com degradê verde */}
          <Progress value={progress} className="h-2" />
          
          {/* Saving indicator */}
          {isSaving && (
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">Salvando...</p>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Step 1: Select Uniform Type */}
        {currentStepId === 'select_type' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Escolha o tipo de uniforme
            </h2>
            <h3 className="text-xl md:text-2xl text-center mb-12 text-muted-foreground">
              Selecione o modelo que melhor se adapta às suas necessidades
            </h3>

            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
              {availableUniformTypes.map((type) => (
                <Card
                  key={type}
                  className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary w-[calc(50%-8px)] md:w-[200px] ${
                    selectedUniformType === type ? 'border-primary ring-4 ring-primary/20' : ''
                  }`}
                  onClick={() => {
                    setSelectedUniformType(type);
                    setTimeout(() => handleNext(), 300);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square mb-4 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
                      <img
                        src={UNIFORM_IMAGES[type] || mangaCurtaImg}
                        alt={UNIFORM_LABELS[type] || type}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h4 className="text-center font-semibold text-sm">
                      {UNIFORM_LABELS[type] || type}
                    </h4>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Name */}
        {currentStepId === 'enter_name' && (
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Me informa o seu nome
              </h2>

              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                className="min-h-[56px] text-lg text-center"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNext();
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Enter Phone */}
        {currentStepId === 'enter_phone' && (
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Digite seu WhatsApp abaixo
              </h2>

              <Input
                type="tel"
                placeholder="(DDD) 00000-0000"
                value={customerData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="min-h-[56px] text-lg text-center"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNext();
                  }
                }}
              />

              <p className="text-sm text-muted-foreground text-center mt-4">
                Formato: <span className="font-semibold">(DDD)</span> 00000-0000
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Quantity */}
        {currentStepId === 'select_quantity' && (
          <Card className="max-w-3xl mx-auto shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Quantas camisas você precisa?
              </h2>

              <div className="grid grid-cols-3 md:grid-cols-7 gap-3 md:gap-4 mb-6">
                {[10, 20, 30, 40, 50, 60].map((qty) => (
                  <div key={qty} className="relative">
                    {/* Badge "Mais vendido" apenas no 20 */}
                    {qty === 20 && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          Mais vendido
                        </span>
                      </div>
                    )}
                    
                    <Button
                      variant={customerData.quantity === qty ? 'default' : 'outline'}
                      className={`h-16 md:h-20 text-xl md:text-2xl font-bold w-full ${
                        qty === 20 ? 'ring-2 ring-green-600' : ''
                      }`}
                      onClick={() => setCustomerData({
                        ...customerData,
                        quantity: qty,
                        customQuantity: null
                      })}
                    >
                      {qty}
                    </Button>
                  </div>
                ))}

                <Button
                  variant={customerData.quantity === 'custom' ? 'default' : 'outline'}
                  className="h-16 md:h-20 text-lg md:text-xl font-bold"
                  onClick={() => setCustomerData({
                    ...customerData,
                    quantity: 'custom'
                  })}
                >
                  Outros
                </Button>
              </div>

              {/* Custom quantity input */}
              {customerData.quantity === 'custom' && (
                <div className="mt-6 p-6 bg-muted/30 rounded-lg">
                  <Label className="text-lg mb-3 block text-center">
                    Digite a quantidade desejada
                  </Label>
                  <Input
                    type="number"
                    min="10"
                    placeholder="Ex: 75"
                    value={customerData.customQuantity || ''}
                    onChange={(e) => setCustomerData({
                      ...customerData,
                      customQuantity: parseInt(e.target.value) || null
                    })}
                    className="min-h-[56px] text-lg text-center"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNext();
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Quantidade mínima: 10 unidades
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Choose Specific Model */}
        {currentStepId === 'choose_model' && selectedUniformType && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Escolha o modelo
            </h2>
            <h3 className="text-xl md:text-2xl text-center mb-12 text-muted-foreground">
              {UNIFORM_LABELS[selectedUniformType]}
            </h3>

            {availableModels.filter(m => m.model_tag === selectedUniformType).length === 0 ? (
              <Card className="max-w-lg mx-auto">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum modelo disponível para este tipo de uniforme.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {availableModels
                  .filter(m => m.model_tag === selectedUniformType)
                  .map((model) => (
                    <Card
                      key={model.id}
                      className={`overflow-hidden hover:shadow-xl transition-all border-2 ${
                        selectedModel?.id === model.id ? 'border-primary ring-4 ring-primary/20' : 'border-border'
                      }`}
                      onClick={() => handleSelectModel(model)}
                    >
                      <CardContent className="p-0">
                        {/* Container da foto principal */}
                        <div className="relative bg-muted">
                          {/* SKU no canto superior direito */}
                          {model.sku && (
                            <div className="absolute top-4 right-4 z-10">
                              <span className="text-xl md:text-2xl font-bold tracking-wider">
                                {model.sku}
                              </span>
                            </div>
                          )}

                          {/* Foto Principal */}
                          <div className="w-full flex items-center justify-center">
                            <img
                              src={model.photo_main}
                              alt={model.name}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        </div>

                        {/* Botão "Selecionar Modelo" */}
                        <div className="p-4 border-t">
                          <Button
                            size="lg"
                            className="w-full h-14 text-lg"
                          >
                            {selectedModel?.id === model.id ? (
                              <>
                                <Check className="mr-2 h-5 w-5" />
                                Modelo Selecionado
                              </>
                            ) : (
                              'Selecionar Modelo'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Customize Front */}
        {currentStepId === 'customize_front' && selectedModel && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Personalize a Frente
            </h2>
            <FrontEditor
              model={selectedModel}
              value={customizations.front}
              onChange={(data) => setCustomizations({
                ...customizations,
                front: { ...customizations.front, ...data }
              })}
              onNext={goToNextStep}
            />
          </div>
        )}

        {/* Step 7: Customize Back */}
        {currentStepId === 'customize_back' && selectedModel && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Personalize as Costas
            </h2>
            <BackEditor
              model={selectedModel}
              value={customizations.back}
              onChange={(data) => setCustomizations({
                ...customizations,
                back: { ...customizations.back, ...data }
              })}
              onNext={goToNextStep}
            />
          </div>
        )}

        {/* Step 8: Customize Left Sleeve */}
        {currentStepId === 'customize_sleeves_left' && selectedModel && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Personalize a Manga Esquerda
            </h2>
            <SleeveEditor
              model={selectedModel}
              side="left"
              value={customizations.sleeves.left}
              onChange={(data) => setCustomizations({
                ...customizations,
                sleeves: {
                  ...customizations.sleeves,
                  left: { ...customizations.sleeves.left, ...data }
                }
              })}
              onNext={goToNextStep}
            />
          </div>
        )}

        {/* Step 9: Customize Right Sleeve */}
        {currentStepId === 'customize_sleeves_right' && selectedModel && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Personalize a Manga Direita
            </h2>
            <SleeveEditor
              model={selectedModel}
              side="right"
              value={customizations.sleeves.right}
              onChange={(data) => setCustomizations({
                ...customizations,
                sleeves: {
                  ...customizations.sleeves,
                  right: { ...customizations.sleeves.right, ...data }
                }
              })}
              onNext={goToNextStep}
            />
          </div>
        )}

        {/* Step 10: Upload Logos */}
        {currentStepId === 'upload_logos' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Upload de Logos
            </h2>
            <LogoUploader
              customizations={customizations}
              uploadChoice={uploadChoice}
              onUploadChoiceChange={setUploadChoice}
              onLogosUpload={setUploadedLogos}
              currentLogos={uploadedLogos}
              onNext={handleNext}
            />
          </div>
        )}

        {/* Step 11: Review */}
        {currentStepId === 'review' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Revisão e Envio
            </h2>
            
            <Card>
              <CardContent className="p-4 md:p-6 space-y-6 pb-8 md:pb-6">
                {/* Modelo Selecionado */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Modelo Selecionado:</h3>
                  <p className="text-muted-foreground mb-2">{selectedModel?.name}</p>
                  <p className="font-bold text-2xl">{selectedModel?.sku}</p>
                </div>

                {/* 4 Vistas do Modelo em Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <img 
                      src={selectedModel?.image_front} 
                      alt="Frente" 
                      className="w-full h-32 md:h-48 object-cover rounded-lg border"
                    />
                    <p className="text-center text-sm font-medium">Frente</p>
                  </div>
                  
                  <div className="space-y-2">
                    <img 
                      src={selectedModel?.image_back} 
                      alt="Costas" 
                      className="w-full h-32 md:h-48 object-cover rounded-lg border"
                    />
                    <p className="text-center text-sm font-medium">Costas</p>
                  </div>
                  
                  <div className="space-y-2">
                    <img 
                      src={selectedModel?.image_right} 
                      alt="Direita" 
                      className="w-full h-32 md:h-48 object-cover rounded-lg border"
                    />
                    <p className="text-center text-sm font-medium">Direita</p>
                  </div>
                  
                  <div className="space-y-2">
                    <img 
                      src={selectedModel?.image_left} 
                      alt="Esquerda" 
                      className="w-full h-32 md:h-48 object-cover rounded-lg border"
                    />
                    <p className="text-center text-sm font-medium">Esquerda</p>
                  </div>
                </div>

                {/* Resumo das Personalizações */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">
                    Resumo das Personalizações:
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    {/* Frente */}
                    <div>
                      <p className="font-medium text-primary">Frente:</p>
                      <p className="text-muted-foreground ml-4">
                        Tipo: {customizations.front.logoType === 'small_left' ? 'Logo pequena centro' : 
                               customizations.front.logoType === 'large_center' ? 'Logo grande centro' : 
                               customizations.front.logoType === 'custom' ? 'Custom' : 'Sem logo'}
                      </p>
                    </div>

                    {/* Costas */}
                    <div>
                      <p className="font-medium text-primary">Costas:</p>
                      {customizations.back.logoLarge && (
                        <p className="text-muted-foreground ml-4">• Logo grande</p>
                      )}
                      {customizations.back.hasSponsors && customizations.back.sponsors.length > 0 && (
                        <p className="text-muted-foreground ml-4">• Patrocinadores: {customizations.back.sponsors.join(', ')}</p>
                      )}
                      {!customizations.back.logoLarge && (!customizations.back.hasSponsors || customizations.back.sponsors.length === 0) && (
                        <p className="text-muted-foreground ml-4">• Sem personalizações</p>
                      )}
                    </div>

                    {/* Mangas */}
                    <div>
                      <p className="font-medium text-primary">Mangas:</p>
                      {customizations.sleeves.left.logoSmall && (
                        <p className="text-muted-foreground ml-4">• Logo pequena (Esquerda)</p>
                      )}
                      {customizations.sleeves.left.flag && (
                        <p className="text-muted-foreground ml-4">• Bandeira (Esquerda)</p>
                      )}
                      {customizations.sleeves.right.logoSmall && (
                        <p className="text-muted-foreground ml-4">• Logo pequena (Direita)</p>
                      )}
                      {customizations.sleeves.right.flag && (
                        <p className="text-muted-foreground ml-4">• Bandeira (Direita)</p>
                      )}
                      {!customizations.sleeves.left.logoSmall && !customizations.sleeves.left.flag && 
                       !customizations.sleeves.right.logoSmall && !customizations.sleeves.right.flag && (
                        <p className="text-muted-foreground ml-4">• Sem personalizações</p>
                      )}
                    </div>

                    {/* Upload de Logos */}
                    <div className="border-t pt-3 mt-3">
                      <p className="font-medium">Upload de Logos:</p>
                      <p className="text-muted-foreground ml-4">
                        {uploadChoice === 'agora' ? '✓ Enviadas agora' : '⏳ Serão enviadas depois'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="max-w-3xl mx-auto mt-6 mb-8 pb-6 flex gap-4 justify-between">
          {/* Mostrar Voltar em TODAS as páginas exceto a primeira */}
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSaving}
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}

          {/* Mostrar Próximo EXCETO nas páginas de seleção e personalização */}
          {currentStepId !== 'select_type' && 
           currentStepId !== 'choose_model' && 
           currentStepId !== 'customize_front' && 
           currentStepId !== 'customize_back' && 
           currentStepId !== 'customize_sleeves_left' && 
           currentStepId !== 'customize_sleeves_right' && (
            <Button
              onClick={handleNext}
              disabled={isSaving}
              size="lg"
              className="ml-auto"
            >
              {currentStepId === 'review' ? 'Finalizar Pedido' : 'Próximo'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

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

// Importar imagens dos uniformes
import mangaCurtaImg from "@/assets/uniforms/manga-curta.png";
import mangaLongaImg from "@/assets/uniforms/manga-longa.png";
import regataImg from "@/assets/uniforms/regata.png";
import ziperMangaLongaImg from "@/assets/uniforms/ziper-manga-longa.png";
import logoImg from "@/assets/logo-ss.png";

const UNIFORM_MODELS = [
  {
    id: 'ziper-manga-longa',
    name: 'Manga Longa com Zíper',
    image: ziperMangaLongaImg,
    order: 1
  },
  {
    id: 'manga-longa',
    name: 'Manga Longa',
    image: mangaLongaImg,
    order: 2
  },
  {
    id: 'manga-curta',
    name: 'Manga Curta',
    image: mangaCurtaImg,
    order: 3
  },
  {
    id: 'regata',
    name: 'Regata',
    image: regataImg,
    order: 4
  }
];

const SIMPLIFIED_STEPS = [
  { id: 'select_model', label: 'Escolha o modelo', order: 0, enabled: true },
  { id: 'enter_name', label: 'Seu nome', order: 1, enabled: true },
  { id: 'enter_phone', label: 'Seu WhatsApp', order: 2, enabled: true },
  { id: 'select_quantity', label: 'Quantidade', order: 3, enabled: true }
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
  
  // Estados simplificados
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    ddd: '',
    phone: '',
    quantity: null as number | 'custom' | null,
    customQuantity: null as number | null
  });
  
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

  const currentStepId = SIMPLIFIED_STEPS[currentStep]?.id;
  const progress = ((currentStep + 1) / SIMPLIFIED_STEPS.length) * 100;

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
          setSelectedModel(data.selectedModel || null);
          setCustomerData(data.customerData || {
            name: '',
            ddd: '',
            phone: '',
            quantity: null,
            customQuantity: null
          });
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
      leadId,
      lastSaved: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [campaign, currentStep, selectedModel, customerData, leadId]);

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
    const phone = `${customerData.ddd}${customerData.phone.replace(/\D/g, '')}`;
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
        phone: `(${customerData.ddd}) ${customerData.phone}`,
        quantity: customerData.quantity === 'custom' 
          ? (customerData.customQuantity?.toString() || '0')
          : (customerData.quantity?.toString() || '0'),
        current_step: step,
        completed,
        order_id: orderId,
        customization_summary: {
          model: selectedModel?.name || null
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

  // Handle phone DDD change
  const handleDDDChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setCustomerData({ ...customerData, ddd: cleaned });
  };

  // Handle phone number change with mask
  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/\D/g, '').slice(0, 9);
    
    // Apply mask: 00000-0000 or 0000-0000
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    }
    
    setCustomerData({ ...customerData, phone: formatted });
  };

  // Handle next step
  const handleNext = async () => {
    // Validations per step
    if (currentStepId === 'select_model' && !selectedModel) {
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
      const ddd = customerData.ddd;
      const phoneDigits = customerData.phone.replace(/\D/g, '');
      
      if (ddd.length !== 2) {
        toast.error('Informe um DDD válido (2 dígitos)');
        return;
      }
      
      if (phoneDigits.length < 8) {
        toast.error('Informe um número de WhatsApp válido');
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

      // Last step - submit order
      await handleSubmitOrder();
      return;
    }

    // Advance to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await trackEvent(`step_${nextStep + 1}`);
    await createOrUpdateLead(nextStep);
  };

  // Handle back
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    try {
      setIsSaving(true);

      const finalQuantity = customerData.quantity === 'custom' 
        ? customerData.customQuantity 
        : customerData.quantity;

      const orderData = {
        campaign_id: campaign.id,
        session_id: sessionId,
        customer_name: customerData.name,
        customer_phone: `(${customerData.ddd}) ${customerData.phone}`,
        quantity: finalQuantity,
        customization_data: {
          model: selectedModel.name,
          model_id: selectedModel.id
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Update lead as completed
      await createOrUpdateLead(SIMPLIFIED_STEPS.length, true, order.id);
      await trackEvent('order_completed');

      // Clear session storage
      sessionStorage.removeItem(STORAGE_KEY);

      toast.success('Pedido enviado com sucesso!');

      // Redirect to confirmation page
      setTimeout(() => {
        navigate(`/obrigado?order=${order.id}`);
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
    await createOrUpdateLead(0);
    
    // Wait a bit for better UX
    setTimeout(() => {
      setCurrentStep(1);
      trackEvent('step_2');
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
        <div className="container mx-auto px-4 py-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src={logoImg} alt="Logo" className="h-12" />
          </div>

          {/* Step indicator text */}
          <div className="text-center mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Etapa {currentStep + 1} de {SIMPLIFIED_STEPS.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step circles */}
          <div className="flex justify-center items-center gap-2 mb-2">
            {SIMPLIFIED_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < SIMPLIFIED_STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <span className="text-center max-w-[80px] truncate">
              {SIMPLIFIED_STEPS[currentStep]?.label}
            </span>
          </div>

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
        {/* Step 1: Select Model */}
        {currentStepId === 'select_model' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Dê vida ao seu uniforme
            </h2>
            <h3 className="text-xl md:text-2xl text-center mb-12 text-muted-foreground">
              Escolha o modelo ideal
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {UNIFORM_MODELS.map((model) => (
                <Card
                  key={model.id}
                  className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary ${
                    selectedModel?.id === model.id ? 'border-primary ring-4 ring-primary/20' : ''
                  }`}
                  onClick={() => handleSelectModel(model)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square mb-4 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
                      <img
                        src={model.image}
                        alt={model.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h4 className="text-center font-semibold text-sm">
                      {model.name}
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

              <div className="flex gap-3 mb-4">
                <Input
                  type="tel"
                  placeholder="DDD"
                  value={customerData.ddd}
                  onChange={(e) => handleDDDChange(e.target.value)}
                  maxLength={2}
                  className="min-h-[56px] text-lg text-center w-24"
                  autoFocus
                />

                <Input
                  type="tel"
                  placeholder="00000-0000"
                  value={customerData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="min-h-[56px] text-lg text-center flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNext();
                    }
                  }}
                />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Formato: (DDD) 00000-0000
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
                  <Button
                    key={qty}
                    variant={customerData.quantity === qty ? 'default' : 'outline'}
                    className="h-16 md:h-20 text-xl md:text-2xl font-bold"
                    onClick={() => setCustomerData({
                      ...customerData,
                      quantity: qty,
                      customQuantity: null
                    })}
                  >
                    {qty}
                  </Button>
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

        {/* Navigation buttons */}
        <div className="max-w-3xl mx-auto mt-8 flex gap-4 justify-between">
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

          <Button
            onClick={handleNext}
            disabled={isSaving}
            size="lg"
            className="ml-auto"
          >
            {currentStepId === 'select_quantity' ? 'Finalizar' : 'Próximo'}
          </Button>
        </div>
      </main>
    </div>
  );
}

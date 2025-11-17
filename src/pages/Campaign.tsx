import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { WorkflowStep } from "@/types/workflow";

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
  segment_id: string | null;
  workflow_template_id: string;
  workflow_templates?: {
    workflow_config: WorkflowStep[];
  };
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
  hasSponsors?: boolean;
  sponsorsLocation?: string;
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
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [abTestId, setAbTestId] = useState<string | null>(null);
  const [abVariant, setAbVariant] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const testId = params.get('ab_test');
    const variant = params.get('ab_variant');
    const session = params.get('session');
    
    if (testId && variant) {
      setAbTestId(testId);
      setAbVariant(variant);
      if (session) setSessionId(session);
    }
  }, [location.search]);
  const STORAGE_KEY = uniqueLink ? `campaign_progress_${uniqueLink}` : 'campaign_progress_temp';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ShirtModel | null>(null);
  const [showFixedProgress, setShowFixedProgress] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(true);
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
  const [uploadChoice, setUploadChoice] = useState<'agora' | 'depois' | null>(null);
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

  // Compute active steps from campaign workflow template
  const templateSteps = campaign?.workflow_templates?.workflow_config || [];
  const steps = templateSteps.length > 0
    ? templateSteps
        .filter(step => step.enabled)
        .sort((a, b) => a.order - b.order)
        .map(step => step.label)
    : [
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

  // Persistir progresso no sessionStorage
  useEffect(() => {
    if (!uniqueLink || isRehydrating) return; // NÃO salvar durante reidratação
    
    if (selectedModel || customerData.name || Object.keys(customizations.front).length > 0) {
      const dataToSave = {
        selectedModelId: selectedModel?.id,
        selectedModelName: selectedModel?.name,
        customerData,
        customizations
      };
      console.log('💾 Salvando no sessionStorage:', {
        key: STORAGE_KEY,
        data: dataToSave
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('✅ Dados salvos com sucesso!');
    }
  }, [selectedModel, customerData, customizations, uniqueLink, isRehydrating]);

  // FASE 1: Reidratação rápida (sem models) - restaurar customerData e customizations
  useEffect(() => {
    if (!isRehydrating) return;
    
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (!cached) return;

    try {
      const data = JSON.parse(cached);
      console.log('📂 [FASE 1] Restaurando dados básicos:', data);
      
      if (data.customerData && Object.keys(data.customerData).length > 0) {
        setCustomerData(data.customerData);
        console.log('✅ [FASE 1] CustomerData restaurado');
      }
      
      if (data.customizations && Object.keys(data.customizations).length > 0) {
        setCustomizations(data.customizations);
        console.log('✅ [FASE 1] Customizations restauradas');
      }
    } catch (e) {
      console.error("❌ [FASE 1] Erro ao parsear sessionStorage:", e);
    }
    // Não finaliza isRehydrating aqui; selectedModel virá na fase 2
  }, [STORAGE_KEY, isRehydrating]);

  // FASE 2: Reidratar selectedModel após carregar modelos
  useEffect(() => {
    // Só tentar reidratar o modelo DEPOIS que os models foram carregados
    if (models.length > 0 && isRehydrating) {
      const cached = sessionStorage.getItem(STORAGE_KEY);

      console.log('🔍 [FASE 2] Tentando recuperar modelo:', {
        key: STORAGE_KEY,
        hasData: !!cached,
        modelsCount: models.length
      });

      if (cached) {
        try {
          const data = JSON.parse(cached);
          console.log('📂 [FASE 2] Restaurando modelo:', data);
          
          // Restaurar APENAS selectedModel (dados já foram restaurados na fase 1)
          if (data.selectedModelId) {
            const foundModel = models.find(m => m.id === data.selectedModelId);
            if (foundModel) {
              setSelectedModel(foundModel);
              console.log('✅ [FASE 2] Modelo recuperado:', foundModel.name);
            } else {
              console.warn('⚠️ [FASE 2] Modelo não encontrado pelo ID:', data.selectedModelId);
            }
          } else if (data.selectedModelName) {
            const foundModel = models.find(m => m.name === data.selectedModelName);
            if (foundModel) {
              setSelectedModel(foundModel);
              console.log('✅ [FASE 2] Modelo recuperado pelo nome:', foundModel.name);
            } else {
              console.warn('⚠️ [FASE 2] Modelo não encontrado pelo nome:', data.selectedModelName);
            }
          }
        } catch (e) {
          console.error("❌ [FASE 2] Erro ao parsear sessionStorage:", e);
        }
      } else {
        console.warn('⚠️ [FASE 2] Nenhum dado encontrado no sessionStorage para:', STORAGE_KEY);
      }
      
      // Marcar reidratação como concluída
      setIsRehydrating(false);
      console.log('✅ [FASE 2] Reidratação completa!');
    } else if (models.length === 0) {
      console.log('⏳ [FASE 2] Aguardando models carregarem...');
    }
  }, [models, isRehydrating]);

  // Sincronizar sessionId com localStorage para UploadLogos
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('session_id', sessionId);
      console.log('🔗 SessionId sincronizado com localStorage:', sessionId);
    }
  }, [sessionId]);

  // DEBUG: Monitorar mudanças no estado
  useEffect(() => {
    console.log('🔄 Estado atual:', {
      currentStep,
      hasSelectedModel: !!selectedModel,
      selectedModelName: selectedModel?.name,
      frontLogoType: customizations.front.logoType,
      backLogoLarge: customizations.back.logoLarge,
      backNameText: customizations.back.nameText,
      isRehydrating
    });
  }, [currentStep, selectedModel, customizations, isRehydrating]);

  // Detectar mudanças no query param ?step=X
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stepParam = params.get('step');
    
    if (stepParam) {
      const stepNumber = parseInt(stepParam);
      if (!isNaN(stepNumber) && stepNumber >= 0 && stepNumber < steps.length) {
        setCurrentStep(stepNumber);
        
        // Atualizar current_step no banco quando vier de outra página (ex: UploadLogos)
        if (leadId && stepNumber === 6) {
          createOrUpdateLead(6);
        }
        // Manter o ?step=6 na URL para facilitar debug e deep linking
        // window.history.replaceState({}, '', `/c/${uniqueLink}`);
      }
    }
  }, [location.search, steps.length, uniqueLink, leadId]);

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

  // Detectar scroll para mostrar barra de progresso fixa
  useEffect(() => {
    const handleScroll = () => {
      // Mostrar barra fixa após 100px de scroll
      setShowFixedProgress(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadCampaign = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name, segment_id, workflow_template_id, workflow_templates(workflow_config)")
        .eq("unique_link", uniqueLink)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        toast.error("Campanha não encontrada");
        return;
      }

      setCampaign(campaignData as any);

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

  // Gerar identificador único baseado em email+phone
  const generateLeadGroupId = (email: string, phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `${email || 'noemail'}_${cleanPhone}`;
  };

  // Buscar número da tentativa
  const getAttemptNumber = async (groupId: string): Promise<number> => {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_group_identifier', groupId);
    
    return (count || 0) + 1;
  };

  const createOrUpdateLead = async (stepNumber: number, isCompleted = false, orderId?: string) => {
    try {
      // NUNCA atualizar lead concluído
      if (leadId) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('completed')
          .eq('id', leadId)
          .maybeSingle();
        
        if (existingLead?.completed) {
          console.log('Lead já concluído - não será atualizado');
          return;
        }
      }

      const groupId = generateLeadGroupId(customerData.email, customerData.phone);
      const attemptNumber = leadId ? undefined : await getAttemptNumber(groupId);

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
        lead_group_identifier: groupId,
        attempt_number: attemptNumber,
        customization_summary: {
          model: selectedModel?.name,
          front: customizations.front,
          back: customizations.back,
          sleeves: customizations.sleeves,
        } as any,
      };

      if (leadId) {
        // Atualizar apenas se não estiver completo
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

    // Validação Step 1 removida - o botão já seleciona o modelo diretamente

    // Step 5: Após Manga Esquerda, navegar para página de upload
    if (currentStep === 5) {
      if (leadId) {
        await createOrUpdateLead(5);
      }
      navigate(`/c/${uniqueLink}/upload-logos`);
      return;
    }

    // Step 6: Revisão - submeter pedido
    if (currentStep === 6) {
      handleSubmitOrder();
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

      // Registrar evento de conversão no A/B test
      if (abTestId && abVariant) {
        await supabase.from('ab_test_events').insert({
          ab_test_id: abTestId,
          event_type: 'lead',
          campaign_id: abVariant,
          session_id: sessionId
        });
      }

      await trackEvent("completed");

      toast.success("Pedido enviado com sucesso!");
      
      // Limpar cache do sessionStorage após sucesso
      sessionStorage.removeItem(STORAGE_KEY);
      
      // RESETAR TUDO para nova tentativa
      setCurrentStep(0);
      setLeadId(null); // ← Forçar criação de novo lead
      setSessionId(`session-${Date.now()}-${Math.random()}`); // ← Novo session_id
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
      // Manter dados do cliente para facilitar nova tentativa
      setCustomerData({ 
        ...customerData, 
        quantity: "", 
        customQuantity: 10 
      });
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
      {/* Barra de progresso fixa - Aparece no scroll mobile */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-md transition-transform duration-300 md:hidden ${
          showFixedProgress ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Etapa {currentStep + 1} de {steps.length}
            </span>
            <span className="text-xs font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground mt-2 truncate">
            {steps[currentStep]}
          </p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          {/* Logo Space Sports - Menor no mobile */}
          <div className="flex justify-center mb-4 md:mb-6">
            <img 
              src="https://cdn.awsli.com.br/400x300/1896/1896367/logo/space-logo-site-wgernz.png" 
              alt="Space Sports" 
              className="h-12 md:h-16 w-auto"
              loading="eager"
            />
          </div>
          
          {/* Título da etapa - Responsivo */}
          <p className="text-center text-sm md:text-base text-muted-foreground mb-3 md:mb-4 px-2">
            {steps[currentStep]} - Etapa {currentStep + 1} de {steps.length}
          </p>
          
          {/* Step Indicator - Otimizado para mobile */}
          <div className="flex justify-center items-center gap-1 md:gap-2 mb-3 md:mb-4 overflow-x-auto px-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                  {/* Círculos menores no mobile */}
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold border-2 transition-colors ${
                    index <= currentStep 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background border-muted'
                  }`}>
                    {index < currentStep ? <Check className="h-3 w-3 md:h-4 md:w-4" /> : index + 1}
                  </div>
                  {/* Texto visível apenas em tablets+ */}
                  <span className="text-xs mt-1 hidden lg:block max-w-[80px] text-center leading-tight">{step}</span>
                </div>
                {/* Linha conectora mais fina no mobile */}
                {index < steps.length - 1 && (
                  <div className={`w-3 md:w-8 h-0.5 mx-0.5 md:mx-1 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Indicador de auto-save - Mobile-friendly */}
          {leadId && (
            <div className="flex items-center justify-center gap-2 mt-3 md:mt-4">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-primary" />
                  <span className="text-xs md:text-sm text-muted-foreground">Salvando...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span className="text-xs md:text-sm text-muted-foreground">
                    Salvo às {format(lastSaved, "HH:mm:ss")}
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
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center px-2">
                  Vamos começar! Preencha seus dados
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="initial-name" className="py-2 block text-base">Digite seu nome*</Label>
                    <Input
                      id="initial-name"
                      placeholder="Seu nome completo"
                      value={customerData.name}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, name: e.target.value })
                      }
                      className="min-h-[48px] text-base"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="initial-whatsapp" className="py-2 block text-base">Digite seu WhatsApp*</Label>
                    <Input
                      id="initial-whatsapp"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={customerData.phone}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, phone: e.target.value })
                      }
                      className="min-h-[48px] text-base"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="quantity-select" className="py-2 block text-base">Quantidade*</Label>
                    <Select
                      value={customerData.quantity}
                      onValueChange={(value) => {
                        setCustomerData({ ...customerData, quantity: value });
                      }}
                    >
                      <SelectTrigger id="quantity-select" className="min-h-[48px] text-base">
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
                      <Label htmlFor="custom-quantity" className="py-2 block text-base">Digite a quantidade (mínimo 10)*</Label>
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
                        className="min-h-[48px] text-base"
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
              <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center px-2">Escolha seu modelo</h2>
              <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                {models.map((model) => (
                  <Card
                    key={model.id}
                    className="overflow-hidden transition-all hover:shadow-lg touch-manipulation"
                  >
                    <img
                      src={model.photo_main}
                      alt={model.name}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                    <CardContent className="p-3 bg-muted/30">
                    <Button 
                      className="w-full min-h-[48px] text-base font-semibold touch-manipulation" 
                      size="lg"
                      onClick={() => {
                        setSelectedModel(model);
                        setCurrentStep(2);
                        trackEvent('step_2');
                      }}
                    >
                      Selecionar Modelo
                    </Button>
                    </CardContent>
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

          {currentStep === 6 && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Revisão e Envio</h2>
                
                {/* Mostrar loading enquanto reidrata */}
                {isRehydrating ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Carregando suas personalizações...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                  {/* Grid de 4 imagens do modelo */}
                  {selectedModel ? (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Modelo Selecionado:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="space-y-1">
                        <img
                          src={selectedModel.image_front}
                          alt="Frente"
                          className="w-full aspect-square object-cover rounded-lg border-2 border-primary/20"
                        />
                        <p className="text-xs text-center text-muted-foreground">Frente</p>
                      </div>
                      <div className="space-y-1">
                        <img
                          src={selectedModel.image_back}
                          alt="Costas"
                          className="w-full aspect-square object-cover rounded-lg border-2 border-primary/20"
                        />
                        <p className="text-xs text-center text-muted-foreground">Costas</p>
                      </div>
                      <div className="space-y-1">
                        <img
                          src={selectedModel.image_right}
                          alt="Manga Direita"
                          className="w-full aspect-square object-cover rounded-lg border-2 border-primary/20"
                        />
                        <p className="text-xs text-center text-muted-foreground">Direita</p>
                      </div>
                      <div className="space-y-1">
                        <img
                          src={selectedModel.image_left}
                          alt="Manga Esquerda"
                          className="w-full aspect-square object-cover rounded-lg border-2 border-primary/20"
                        />
                        <p className="text-xs text-center text-muted-foreground">Esquerda</p>
                      </div>
                    </div>
                    <p className="text-center font-semibold text-lg mt-4">
                      {selectedModel.name}
                    </p>
                    {selectedModel.features && selectedModel.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {selectedModel.features.map((feature, idx) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <p className="text-muted-foreground text-sm">
                        Modelo não carregado. Volte uma etapa e selecione o modelo novamente.
                      </p>
                    </div>
                  )}

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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation - Hidden on step 1 (model selection) - Mobile-friendly */}
        {currentStep !== 1 && (
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              size="lg"
              className="w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              <ArrowLeft className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              Voltar
            </Button>

            {currentStep < 6 && (
              <Button 
                onClick={handleNext} 
                size="lg"
                className="w-full sm:w-auto min-h-[48px] touch-manipulation font-semibold"
              >
                Próximo
                <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
              </Button>
            )}

            {currentStep === 6 && (
              <Button 
                onClick={handleSubmitOrder}
                disabled={isSaving || !selectedModel}
                size="lg"
                className="w-full sm:w-auto min-h-[48px] touch-manipulation font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 md:h-5 w-4 md:w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Pedido
                    <Check className="ml-2 h-4 md:h-5 w-4 md:w-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaign;

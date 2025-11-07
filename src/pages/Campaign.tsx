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
    quantity: 1,
  });

  const steps = [
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
    }
  }, [campaign]);

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

  const handleNext = () => {
    if (currentStep === 0 && !selectedModel) {
      toast.error("Selecione um modelo para continuar");
      return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep >= 1 && nextStep <= 5) {
      trackEvent(`step_${nextStep}`);
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaign || !selectedModel) return;

    try {
      const { error: insertError } = await supabase.from("orders").insert({
        campaign_id: campaign.id,
        model_id: selectedModel.id,
        session_id: sessionId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        quantity: customerData.quantity,
        customization_data: customizations as any,
      });

      if (insertError) throw insertError;

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
      setCustomerData({ name: "", email: "", phone: "", quantity: 1 });
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast.error("Erro ao enviar pedido");
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
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-center">Escolha seu modelo</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedModel?.id === model.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedModel(model)}
                  >
                    <div className="bg-muted min-h-[400px] flex items-center justify-center">
                      <img
                        src={model.photo_main}
                        alt={model.name}
                        className="w-full h-auto object-contain rounded-t-lg max-h-[500px]"
                      />
                    </div>
                    <CardContent className="p-4">
                      <p className="font-semibold text-center mb-2">{model.name}</p>
                      {model.features && model.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {model.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && selectedModel && (
            <FrontEditor
              model={selectedModel}
              value={customizations.front}
              onChange={(data) =>
                setCustomizations({ ...customizations, front: data })
              }
            />
          )}

          {currentStep === 2 && selectedModel && (
            <BackEditor
              model={selectedModel}
              value={customizations.back}
              onChange={(data) =>
                setCustomizations({ ...customizations, back: data })
              }
            />
          )}

          {currentStep === 3 && selectedModel && (
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

          {currentStep === 4 && selectedModel && (
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

          {currentStep === 5 && selectedModel && (
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

                  <form onSubmit={handleSubmitOrder} className="space-y-4">
                    <h3 className="font-semibold">Seus Dados:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome Completo*</Label>
                        <Input
                          id="name"
                          value={customerData.name}
                          onChange={(e) =>
                            setCustomerData({ ...customerData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email*</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerData.email}
                          onChange={(e) =>
                            setCustomerData({ ...customerData, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone*</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerData.phone}
                          onChange={(e) =>
                            setCustomerData({ ...customerData, phone: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantidade*</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={customerData.quantity}
                          onChange={(e) =>
                            setCustomerData({
                              ...customerData,
                              quantity: parseInt(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      <Check className="mr-2 h-5 w-5" />
                      Enviar Pedido
                    </Button>
                  </form>
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

          {currentStep < 5 && (
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

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
import ShirtEditor from "@/components/ShirtEditor";

interface ShirtModel {
  id: string;
  name: string;
  photo_main: string;
  image_front: string;
  image_back: string;
  image_right: string;
  image_left: string;
}

interface Campaign {
  id: string;
  name: string;
}

const Campaign = () => {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ShirtModel | null>(null);
  const [customizations, setCustomizations] = useState({
    front: { text: "", logo: "" },
    back: { text: "", logo: "" },
    right: { text: "", logo: "" },
    left: { text: "", logo: "" },
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
    "Personalizar Lado Direito",
    "Personalizar Lado Esquerdo",
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
        .select("id, name")
        .eq("unique_link", uniqueLink)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        toast.error("Campanha não encontrada");
        return;
      }

      setCampaign(campaignData);

      const { data: campaignModels } = await supabase
        .from("campaign_models")
        .select("model_id")
        .eq("campaign_id", campaignData.id);

      if (campaignModels && campaignModels.length > 0) {
        const modelIds = campaignModels.map((cm) => cm.model_id);
        const { data: modelsData } = await supabase
          .from("shirt_models")
          .select("*")
          .in("id", modelIds);

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
      await supabase.from("orders").insert({
        campaign_id: campaign.id,
        model_id: selectedModel.id,
        session_id: sessionId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        quantity: customerData.quantity,
        customization_data: customizations,
      });

      await trackEvent("completed");

      toast.success("Pedido enviado com sucesso!");
      setCurrentStep(0);
      setSelectedModel(null);
      setCustomizations({
        front: { text: "", logo: "" },
        back: { text: "", logo: "" },
        right: { text: "", logo: "" },
        left: { text: "", logo: "" },
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
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">{campaign.name}</h1>
          <p className="text-center text-muted-foreground mb-6">
            {steps[currentStep]} - Etapa {currentStep + 1} de {steps.length}
          </p>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {currentStep === 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6">Escolha seu modelo</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                      <div className="aspect-square bg-muted">
                        <img
                          src={model.photo_main}
                          alt={model.name}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="font-semibold text-center">{model.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && selectedModel && (
              <ShirtEditor
                title="Personalizar Frente"
                imageUrl={selectedModel.image_front}
                value={customizations.front}
                onChange={(data) =>
                  setCustomizations({ ...customizations, front: data })
                }
              />
            )}

            {currentStep === 2 && selectedModel && (
              <ShirtEditor
                title="Personalizar Costas"
                imageUrl={selectedModel.image_back}
                value={customizations.back}
                onChange={(data) =>
                  setCustomizations({ ...customizations, back: data })
                }
              />
            )}

            {currentStep === 3 && selectedModel && (
              <ShirtEditor
                title="Personalizar Lado Direito"
                imageUrl={selectedModel.image_right}
                value={customizations.right}
                onChange={(data) =>
                  setCustomizations({ ...customizations, right: data })
                }
              />
            )}

            {currentStep === 4 && selectedModel && (
              <ShirtEditor
                title="Personalizar Lado Esquerdo"
                imageUrl={selectedModel.image_left}
                value={customizations.left}
                onChange={(data) =>
                  setCustomizations({ ...customizations, left: data })
                }
              />
            )}

            {currentStep === 5 && selectedModel && (
              <div>
                <h2 className="text-2xl font-semibold mb-6">Revisão e Envio</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Modelo:</p>
                      <p className="font-semibold">{selectedModel.name}</p>
                    </div>
                    <div>
                      <img
                        src={selectedModel.photo_main}
                        alt={selectedModel.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Personalizações:</h3>
                    <div className="space-y-2 text-sm">
                      {customizations.front.text && (
                        <p>• Frente: {customizations.front.text}</p>
                      )}
                      {customizations.back.text && (
                        <p>• Costas: {customizations.back.text}</p>
                      )}
                      {customizations.right.text && (
                        <p>• Lado Direito: {customizations.right.text}</p>
                      )}
                      {customizations.left.text && (
                        <p>• Lado Esquerdo: {customizations.left.text}</p>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmitOrder} className="space-y-4">
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
                    <Button type="submit" className="w-full" size="lg">
                      <Check className="mr-2 h-5 w-5" />
                      Enviar Pedido
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {currentStep < 5 && (
            <Button onClick={handleNext}>
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

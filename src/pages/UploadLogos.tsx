import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export const UploadLogos = () => {
  const { uniqueLink } = useParams();
  const navigate = useNavigate();
  const [uploadChoice, setUploadChoice] = useState<'agora' | 'depois' | null>(null);
  const [sponsorUploadChoice, setSponsorUploadChoice] = useState<boolean>(false);
  const [customizations, setCustomizations] = useState<any>(null);
  const [sessionId] = useState(() => localStorage.getItem('session_id') || '');
  const [logos, setLogos] = useState({
    frontLogo: null as File | null,
    backLogo: null as File | null,
    sponsorsLogos: [] as File[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCustomizations();
  }, [uniqueLink]);

  const loadCustomizations = async () => {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('customization_summary')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (lead?.customization_summary) {
        setCustomizations(lead.customization_summary);
      }
    } catch (error) {
      console.error("Error loading customizations:", error);
    }
    setIsLoading(false);
  };

  const uploadToSupabase = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('campaign-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('campaign-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleContinue = async () => {
    setIsSaving(true);

    try {
      if (uploadChoice === 'agora') {
        const uploadedUrls: any = {};

        // Upload logo da frente
        if (logos.frontLogo) {
          uploadedUrls.frontLogoUrl = await uploadToSupabase(logos.frontLogo, 'logos/front');
          toast.success("Logo da frente enviada!");
        }

        // Upload logo das costas
        if (logos.backLogo) {
          uploadedUrls.backLogoUrl = await uploadToSupabase(logos.backLogo, 'logos/back');
          toast.success("Logo das costas enviada!");
        }

        // Upload logos dos patrocinadores
        if (sponsorUploadChoice && logos.sponsorsLogos.length > 0) {
          const sponsorsUrls = [];
          for (let i = 0; i < logos.sponsorsLogos.length; i++) {
            const file = logos.sponsorsLogos[i];
            if (file) {
              const url = await uploadToSupabase(file, 'logos/sponsors');
              sponsorsUrls.push(url);
            }
          }
          uploadedUrls.sponsorsLogosUrls = sponsorsUrls;
          toast.success("Logos dos patrocinadores enviadas!");
        }

        // Salvar URLs no lead
        await supabase
          .from('leads')
          .update({ 
            customization_summary: {
              ...customizations,
              uploadedLogos: uploadedUrls
            }
          })
          .eq('session_id', sessionId);
      }

      // Navegar de volta para o Campaign no step de revisão
      navigate(`/c/${uniqueLink}?step=6`);
    } catch (error) {
      console.error("Error uploading logos:", error);
      toast.error("Erro ao enviar logos");
      setIsSaving(false);
    }
  };

  const needsFrontLogo = customizations?.front?.logoType !== 'none';
  const needsBackLogo = customizations?.back?.logoLarge;
  const hasSponsors = customizations?.back?.hasSponsors && customizations?.back?.sponsors?.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-6 md:py-8 px-4">
        <div className="flex justify-center mb-6 md:mb-8">
          <img 
            src="https://cdn.awsli.com.br/400x300/1896/1896367/logo/space-logo-site-wgernz.png" 
            alt="Space Sports" 
            className="h-12 md:h-16 w-auto"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Você prefere enviar suas logos agora ou depois?
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* 2 BOTÕES GRANDES */}
                {uploadChoice === null && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      onClick={() => setUploadChoice('agora')}
                      size="lg"
                      className="h-32 flex flex-col gap-3 text-lg font-semibold"
                    >
                      <Upload className="h-8 w-8" />
                      Enviar Agora
                      <span className="text-xs font-normal opacity-90">
                        Faça upload das suas logos
                      </span>
                    </Button>

                    <Button
                      onClick={() => {
                        setUploadChoice('depois');
                        handleContinue();
                      }}
                      variant="outline"
                      size="lg"
                      className="h-32 flex flex-col gap-3 text-lg font-semibold"
                    >
                      <ArrowRight className="h-8 w-8" />
                      Enviar Depois
                      <span className="text-xs font-normal opacity-90">
                        Por email ou WhatsApp
                      </span>
                    </Button>
                  </div>
                )}

                {/* Se escolheu AGORA */}
                {uploadChoice === 'agora' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-center">
                        📤 Clique abaixo para adicionar suas logos
                      </p>
                    </div>

                    {/* Upload logo da frente */}
                    {needsFrontLogo && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          Logo da Frente *
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setLogos({ ...logos, frontLogo: file });
                          }}
                          className="min-h-[48px]"
                        />
                        {logos.frontLogo && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {logos.frontLogo.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Upload logo das costas */}
                    {needsBackLogo && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          Logo Grande das Costas *
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setLogos({ ...logos, backLogo: file });
                          }}
                          className="min-h-[48px]"
                        />
                        {logos.backLogo && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {logos.backLogo.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Pergunta sobre patrocinador */}
                    {hasSponsors && (
                      <>
                        <div className="border-t pt-6 space-y-4">
                          <p className="text-base font-semibold">
                            Quer enviar as logos dos patrocinadores agora?
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={() => setSponsorUploadChoice(true)}
                              variant={sponsorUploadChoice ? "default" : "outline"}
                              size="lg"
                              className="h-20"
                            >
                              Sim
                            </Button>
                            <Button
                              onClick={() => setSponsorUploadChoice(false)}
                              variant={!sponsorUploadChoice ? "default" : "outline"}
                              size="lg"
                              className="h-20"
                            >
                              Não
                            </Button>
                          </div>
                        </div>

                        {/* Se SIM, mostrar uploads dos patrocinadores */}
                        {sponsorUploadChoice && (
                          <div className="space-y-4 ml-4 animate-in fade-in slide-in-from-bottom-4">
                            {customizations.back.sponsors.map((sponsor: string, idx: number) => (
                              <div key={idx} className="space-y-2">
                                <Label className="text-base">{sponsor}</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const newSponsorsLogos = [...logos.sponsorsLogos];
                                      newSponsorsLogos[idx] = file;
                                      setLogos({ ...logos, sponsorsLogos: newSponsorsLogos });
                                    }
                                  }}
                                  className="min-h-[48px]"
                                />
                                {logos.sponsorsLogos[idx] && (
                                  <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {logos.sponsorsLogos[idx].name}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Botão de continuar */}
                    <Button
                      onClick={handleContinue}
                      disabled={isSaving}
                      size="lg"
                      className="w-full min-h-[56px] text-lg font-semibold mt-6"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          Continuar para Revisão
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                )}

              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

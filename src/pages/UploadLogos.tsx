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
  const [uploadChoice, setUploadChoice] = useState<'add_logo' | 'no_logo' | null>(null);
  const [customizations, setCustomizations] = useState<any>(null);
  const [sessionId] = useState(() => localStorage.getItem('session_id') || '');
  const [logo, setLogo] = useState<File | null>(null);
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

    const { error: uploadError } = await supabase.storage
      .from('customer-logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('customer-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleContinue = async () => {
    setIsSaving(true);

    try {
      if (uploadChoice === 'add_logo') {
        if (!logo) {
          toast.error("Por favor, selecione a logo");
          setIsSaving(false);
          return;
        }

        // Upload da logo (será usada tanto para frente quanto para trás)
        const logoUrl = await uploadToSupabase(logo, 'logos');
        toast.success("Logo enviada com sucesso!");

        // Atualizar lead com a logo e avançar step
        const { data: leadData } = await supabase
          .from('leads')
          .select('current_step')
          .eq('session_id', sessionId)
          .single();

        const { error: updateError } = await supabase
          .from('leads')
          .update({
            customization_summary: {
              ...customizations,
              frontLogoUrl: logoUrl,
              backLogoUrl: logoUrl,
            },
            current_step: (leadData?.current_step || 0) + 1,
          })
          .eq('session_id', sessionId);

        if (updateError) throw updateError;

        navigate(`/c/${uniqueLink}?step=6`);
      } else if (uploadChoice === 'no_logo') {
        // Marcar que não tem logo e precisa da ajuda do vendedor
        const { data: leadData } = await supabase
          .from('leads')
          .select('current_step')
          .eq('session_id', sessionId)
          .single();

        const { error: updateError } = await supabase
          .from('leads')
          .update({
            needs_logo: true,
            logo_action: 'waiting_client',
            salesperson_status: 'awaiting_logo',
            current_step: (leadData?.current_step || 0) + 1,
          })
          .eq('session_id', sessionId);

        if (updateError) throw updateError;

        navigate(`/c/${uniqueLink}?step=6`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
    }

    setIsSaving(false);
  };

  const needsFrontLogo = customizations?.front?.logo === 'sim';
  const needsBackLogo = customizations?.back?.logo === 'sim';
  const needsLogo = needsFrontLogo || needsBackLogo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!needsLogo) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload de Logos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sua customização não requer logos. Clique em continuar para prosseguir.
            </p>
            <Button onClick={handleContinue} className="mt-4" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continuar para Revisão
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!uploadChoice ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Escolha uma das opções abaixo:
              </p>
              
              <div className="grid gap-4">
                <Button
                  onClick={() => {
                    console.log('Clicou em Adicionar Logo');
                    setUploadChoice('add_logo');
                  }}
                  variant="default"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  <Upload className="h-6 w-6" />
                  <span className="font-semibold">Adicionar Logo</span>
                </Button>

                <Button
                  onClick={() => {
                    console.log('Clicou em Não Tenho Logo');
                    setUploadChoice('no_logo');
                  }}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="font-semibold">Não Tenho Logo</span>
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm text-muted-foreground">
                Você poderá enviar as logos por WhatsApp após finalizar o pedido.
              </div>
            </div>
          ) : uploadChoice === 'add_logo' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo" className="text-base font-semibold">
                  Selecione sua logo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Esta logo será usada tanto na frente quanto nas costas da camisa
                </p>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    console.log('Arquivo selecionado:', file?.name);
                    setLogo(file || null);
                  }}
                  className="cursor-pointer"
                />
                {logo && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {logo.name}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setUploadChoice(null);
                    setLogo(null);
                  }}
                  variant="outline"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!logo || isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Próximo
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Perfeito!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Nossa equipe entrará em contato para te ajudar com a logo. 
                  Você receberá uma mensagem em breve no número fornecido.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setUploadChoice(null)}
                  variant="outline"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Próximo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

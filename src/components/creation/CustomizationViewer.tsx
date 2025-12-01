import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, Copy, ArrowRightLeft, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { CustomizationSummary } from "./CustomizationSummary";
import { ShirtPreviewAnnotated } from "./ShirtPreviewAnnotated";
import { AssetGallery } from "./AssetGallery";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUniformTypes } from "@/hooks/useUniformTypes";
import { cn } from "@/lib/utils";

interface CustomizationViewerProps {
  data: any;
  campaignName?: string;
  modelName?: string;
  modelCode?: string;
  modelImageFront?: string | null;
  taskId?: string;
  createdBy?: string | null;
  currentUserId?: string | null;
  isSalesperson?: boolean;
  onModelChange?: () => void;
  logoAction?: 'designer_create' | 'waiting_client' | null;
  logoDescription?: string | null;
}

export const CustomizationViewer = ({ 
  data,
  campaignName,
  modelName,
  modelCode,
  modelImageFront,
  taskId,
  createdBy,
  currentUserId,
  isSalesperson,
  onModelChange,
  logoAction,
  logoDescription
}: CustomizationViewerProps) => {
  const [zoomImage, setZoomImage] = useState<{ url: string; alt: string } | null>(null);
  const [changeModelDialogOpen, setChangeModelDialogOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [newCampaignId, setNewCampaignId] = useState<string>("");
  const [newUniformType, setNewUniformType] = useState<string>("");
  const [newModel, setNewModel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { types: uniformTypes, isLoading: uniformTypesLoading } = useUniformTypes();

  // Verificar se usuário pode mudar modelo
  const canChangeModel = isSalesperson && currentUserId && createdBy && currentUserId === createdBy;

  const transformCustomizationData = (rawData: any) => {
    if (!rawData) return null;
    
    return {
      front: rawData.front ? {
        logoType: rawData.front.logoType,
        logoFile: rawData.front.logoUrl || undefined,
        text: rawData.front.text || undefined,
        customDescription: rawData.front.customDescription || undefined,
        customFileName: rawData.front.customFileName || undefined,
        customFileUrl: rawData.front.customFileUrl || undefined,
        smallLogoObservation: rawData.front.smallLogoObservation || undefined,
        smallLogoFile: rawData.front.smallLogoFile || undefined,
        largeLogoObservation: rawData.front.largeLogoObservation || undefined,
        largeLogoFile: rawData.front.largeLogoFile || undefined,
      } : undefined,
      
      back: rawData.back ? {
        name: { enabled: rawData.back.name, value: rawData.back.nameText },
        instagram: { enabled: rawData.back.instagram, value: rawData.back.instagramText },
        website: { enabled: rawData.back.website, value: rawData.back.websiteText },
        email: { enabled: rawData.back.email, value: rawData.back.emailText },
        whatsapp: { enabled: rawData.back.whatsapp, value: rawData.back.whatsappText },
        logo: rawData.back.logoUrl || undefined,
        logoLarge: rawData.back.logoLarge || false,
        logoLargeObservation: rawData.back.logoLargeObservation || undefined,
        logoLargeFile: rawData.back.logoLargeFile || undefined,
        logoNeckObservation: rawData.back.logoNeckObservation || undefined,
        logoNeckFile: rawData.back.logoNeckFile || undefined,
        hasSponsors: rawData.back.hasSponsors || false,
        sponsorsLocation: rawData.back.sponsorsLocation || undefined,
        sponsors: rawData.back.sponsors || [],
        sponsorsLogosUrls: rawData.back.sponsorsLogosUrls || []
      } : undefined,
      
      leftSleeve: rawData.sleeves?.left ? {
        flag: rawData.sleeves.left.flagUrl || undefined,
        flagState: rawData.sleeves.left.flagState || undefined,
        logo: rawData.sleeves.left.logoUrl || undefined,
        logoFileName: rawData.sleeves.left.logoFileName || undefined,
        text: rawData.sleeves.left.text ? rawData.sleeves.left.textContent : undefined
      } : undefined,
      
      rightSleeve: rawData.sleeves?.right ? {
        flag: rawData.sleeves.right.flagUrl || undefined,
        flagState: rawData.sleeves.right.flagState || undefined,
        logo: rawData.sleeves.right.logoUrl || undefined,
        logoFileName: rawData.sleeves.right.logoFileName || undefined,
        text: rawData.sleeves.right.text ? rawData.sleeves.right.textContent : undefined
      } : undefined,
      
      logo: rawData.logo ? {
        hasLogo: rawData.logo.hasLogo,
        logoUrls: rawData.logo.logoUrls || [],
        logoDescription: rawData.logo.logoDescription || undefined,
      } : undefined,
      
      clientLogos: rawData.logoUrls || [],
      
      internalNotes: rawData.internalNotes || undefined,
      
      scratchDescription: rawData.scratchDescription || undefined,
      
      modelImages: {
        front: rawData.modelImages?.front,
        back: rawData.modelImages?.back,
        leftSleeve: rawData.modelImages?.left,
        rightSleeve: rawData.modelImages?.right
      }
    };
  };

  const transformedData = transformCustomizationData(data);

  if (!transformedData) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de personalização disponível</p>;
  }

  const collectAllImages = () => {
    const images: Array<{ url: string; label: string }> = [];
    if (transformedData?.front?.logoFile) images.push({ url: transformedData.front.logoFile, label: 'Logo Frente' });
    if (transformedData?.front?.customFileUrl) images.push({ url: transformedData.front.customFileUrl, label: 'Arquivo Anexado Frente' });
    if (transformedData?.back?.logo) images.push({ url: transformedData.back.logo, label: 'Logo Costas' });
    if (transformedData?.back?.sponsors) {
      transformedData.back.sponsors.forEach((sponsor: any, idx: number) => {
        if (sponsor.logo) images.push({ url: sponsor.logo, label: `Patrocinador ${idx + 1}` });
      });
    }
    if (transformedData?.back?.sponsorsLogosUrls) {
      transformedData.back.sponsorsLogosUrls.forEach((url: string, idx: number) => {
        if (url) images.push({ url, label: `Logo Patrocinador ${idx + 1}` });
      });
    }
    if (transformedData?.clientLogos) {
      transformedData.clientLogos.forEach((url: string, idx: number) => {
        if (url) images.push({ url, label: `Logo Cliente ${idx + 1}` });
      });
    }
    if (transformedData?.leftSleeve?.flag) images.push({ url: transformedData.leftSleeve.flag, label: 'Bandeira Manga Esquerda' });
    if (transformedData?.leftSleeve?.logo) images.push({ url: transformedData.leftSleeve.logo, label: 'Logo Manga Esquerda' });
    if (transformedData?.rightSleeve?.flag) images.push({ url: transformedData.rightSleeve.flag, label: 'Bandeira Manga Direita' });
    if (transformedData?.rightSleeve?.logo) images.push({ url: transformedData.rightSleeve.logo, label: 'Logo Manga Direita' });
    return images;
  };

  const allImages = collectAllImages();
  const totalAssets = allImages.length;

  const handleDownloadAll = async () => {
    if (allImages.length === 0) {
      toast.error("Não há imagens para baixar");
      return;
    }
    
    for (const img of allImages) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${img.label.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        // Delay between downloads
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`Erro ao baixar ${img.label}:`, error);
      }
    }
    
    toast.success(`${allImages.length} imagens baixadas!`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  const formatLogoType = (type: string) => {
    const types: Record<string, string> = {
      'small_left': 'Pequeno Esquerda',
      'small_center': 'Pequeno Centro',
      'small_right': 'Pequeno Direita',
      'large_center': 'Grande Centro',
      'text_only': 'Apenas Texto',
      'none': 'Nenhum'
    };
    return types[type] || type;
  };

  const getFrontAnnotations = (front: any) => {
    const annotations: Array<{ label: string; position: { top: string; left: string }; variant?: 'default' | 'secondary' }> = [];
    if (front.logoType && front.logoType !== 'none' && front.logoType !== 'text_only') {
      annotations.push({ label: 'Logo', position: { top: '33%', left: '50%' }, variant: 'default' });
    }
    if (front.text) {
      annotations.push({ label: 'Texto', position: { top: '50%', left: '50%' }, variant: 'secondary' });
    }
    return annotations;
  };

  const getBackAnnotations = (back: any) => {
    const annotations: Array<{ label: string; position: { top: string; left: string }; variant?: 'default' | 'secondary' }> = [];
    if (back.logo) {
      annotations.push({ label: 'Logo', position: { top: '25%', left: '50%' }, variant: 'default' });
    }
    if (back.sponsors && back.sponsors.length > 0) {
      annotations.push({ label: 'Patrocinadores', position: { top: '75%', left: '50%' }, variant: 'secondary' });
    }
    return annotations;
  };

  const getModelImageForSection = (section: 'front' | 'back', data: any) => {
    if (section === 'front') {
      if (data.logoType === 'large_center' && transformedData.modelImages?.front) {
        return transformedData.modelImages.front;
      }
      return transformedData.modelImages?.front || '';
    }
    return transformedData.modelImages?.back || '';
  };

  const frontAssets = [
    ...(transformedData.front?.logoFile ? [{ url: transformedData.front.logoFile, label: 'Logo Frente' }] : []),
    ...(transformedData.front?.customFileUrl ? [{ url: transformedData.front.customFileUrl, label: 'Arquivo Anexado' }] : [])
  ];

  const backAssets = [
    ...(transformedData.back?.logo ? [{ url: transformedData.back.logo, label: 'Logo Costas' }] : []),
    ...(transformedData.back?.sponsors?.map((s: any, idx: number) => ({ 
      url: s.logo, 
      label: `Patrocinador ${idx + 1}` 
    })) || []),
    ...(transformedData.back?.sponsorsLogosUrls?.filter((url: string) => url).map((url: string, idx: number) => ({
      url,
      label: `Logo Patrocinador ${idx + 1}`
    })) || [])
  ];

  const clientLogosAssets = transformedData.clientLogos?.filter((url: string) => url).map((url: string, idx: number) => ({
    url,
    label: `Logo Cliente ${idx + 1}`
  })) || [];

  const sleeveAssets = [
    ...(transformedData.leftSleeve?.flag ? [{ url: transformedData.leftSleeve.flag, label: 'Bandeira Manga Esquerda' }] : []),
    ...(transformedData.leftSleeve?.logo ? [{ url: transformedData.leftSleeve.logo, label: 'Logo Manga Esquerda' }] : []),
    ...(transformedData.rightSleeve?.flag ? [{ url: transformedData.rightSleeve.flag, label: 'Bandeira Manga Direita' }] : []),
    ...(transformedData.rightSleeve?.logo ? [{ url: transformedData.rightSleeve.logo, label: 'Logo Manga Direita' }] : [])
  ];

  // Carregar campanhas ao abrir modal
  useEffect(() => {
    if (changeModelDialogOpen) {
      loadCampaigns();
    }
  }, [changeModelDialogOpen]);

  // Carregar modelos quando campanha ou tipo de uniforme mudar
  useEffect(() => {
    if (newCampaignId && newUniformType) {
      loadModels();
    } else {
      setModels([]);
      setNewModel(null);
    }
  }, [newCampaignId, newUniformType]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    }
  };

  const loadModels = async () => {
    try {
      // Buscar segment_tag da campanha selecionada
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("segment_tag")
        .eq("id", newCampaignId)
        .single();

      if (campaignError) throw campaignError;

      // Buscar modelos que combinam com segment_tag e model_tag (uniform type)
      const { data, error } = await supabase
        .from("shirt_models")
        .select("*")
        .eq("segment_tag", campaignData.segment_tag)
        .eq("model_tag", newUniformType)
        .order("name");

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      toast.error("Erro ao carregar modelos");
      setModels([]);
    }
  };

  const handleCampaignChange = (campaignId: string) => {
    setNewCampaignId(campaignId);
    setNewUniformType("");
    setNewModel(null);
    setModels([]);
  };

  const handleModelChange = async () => {
    if (!taskId || !newModel) return;

    setLoading(true);
    try {
      // 1. Buscar order_id da task
      const { data: taskData, error: taskError } = await supabase
        .from("design_tasks")
        .select("order_id")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      // 2. Buscar customization_data atual
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("customization_data")
        .eq("id", taskData.order_id)
        .single();

      if (orderError) throw orderError;

      // 3. Atualizar order com novo model_id, campaign_id e customization_data
      const currentCustomizationData = orderData.customization_data as any || {};
      const updatedCustomizationData = {
        ...currentCustomizationData,
        model: newModel.name,
        uniformType: newUniformType,
        modelImages: {
          front: newModel.image_front,
          back: newModel.image_back,
          left: newModel.image_left,
          right: newModel.image_right,
        }
      };

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({
          model_id: newModel.id,
          campaign_id: newCampaignId,
          customization_data: updatedCustomizationData
        })
        .eq("id", taskData.order_id);

      if (updateOrderError) throw updateOrderError;

      // 4. Atualizar task com nova campaign_id
      const { error: updateTaskError } = await supabase
        .from("design_tasks")
        .update({ campaign_id: newCampaignId })
        .eq("id", taskId);

      if (updateTaskError) throw updateTaskError;

      // 5. Registrar no histórico
      const { error: historyError } = await supabase
        .from("design_task_history")
        .insert({
          task_id: taskId,
          user_id: currentUserId,
          action: "model_changed",
          notes: `Modelo alterado de "${modelName}" para "${newModel.name}"`
        });

      if (historyError) throw historyError;

      toast.success("Modelo alterado com sucesso!");
      setChangeModelDialogOpen(false);
      onModelChange?.();

    } catch (error) {
      console.error("Erro ao mudar modelo:", error);
      toast.error("Erro ao alterar modelo");
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models;

  return (
    <div className="space-y-6">
      {/* Alerta de Criação do Zero */}
      {data?.fromScratch && (
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 rounded-full p-2 shrink-0">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                  🎨 CRIAÇÃO DO ZERO
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Este pedido requer criação de layout do zero, sem base de campanha ou modelo pré-definido.
                </p>
                
                {transformedData.scratchDescription && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-300 dark:border-green-700">
                    <Label className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Descrição do cliente:
                    </Label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap">
                      {transformedData.scratchDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Alerta de Criação de Logo */}
      {logoAction === 'designer_create' && (
        <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-500 rounded-full p-2 shrink-0">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  ⚠️ CRIAÇÃO DE LOGO NECESSÁRIA
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  O cliente não tem logo. O designer precisa criar uma nova.
                </p>
                
                {logoDescription && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
                    <Label className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      O que o cliente imagina:
                    </Label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap">
                      {logoDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* RESUMO NO TOPO */}
      <CustomizationSummary
        front={transformedData.front}
        back={transformedData.back}
        leftSleeve={transformedData.leftSleeve}
        rightSleeve={transformedData.rightSleeve}
        totalAssets={totalAssets}
      />

      {/* Botão Baixar Todos */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadAll} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Baixar Todos os Assets ({totalAssets})
        </Button>
      </div>

      {/* SEÇÃO: INFORMAÇÕES DO PEDIDO */}
      {(campaignName || modelName) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge variant="outline">INFORMAÇÕES DO PEDIDO</Badge>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda: Detalhes */}
              <div className="space-y-4">
                {campaignName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Campanha</Label>
                    <p className="text-sm font-medium bg-muted p-2 rounded">{campaignName}</p>
                  </div>
                )}
                {modelName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Modelo</Label>
                    <p className="text-sm font-medium bg-muted p-2 rounded">
                      {modelCode && <span className="text-muted-foreground mr-2">[{modelCode}]</span>}
                      {modelName}
                    </p>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Miniatura + Botão */}
              <div className="flex flex-col items-center gap-4">
                {modelImageFront ? (
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => setZoomImage({ url: modelImageFront, alt: 'Frente do Modelo' })}
                  >
                    <img 
                      src={modelImageFront} 
                      alt="Frente do Modelo" 
                      className="max-h-40 w-auto object-contain rounded border bg-gray-50"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                      <span className="text-white text-xs">Clique para ampliar</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 w-32 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Sem imagem</span>
                  </div>
                )}
                
                {/* BOTÃO MUDAR MODELO - Apenas para criador do card */}
                {canChangeModel && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setChangeModelDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Mudar Modelo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: LOGO DO CLIENTE */}
      {transformedData.logo && (transformedData.logo.logoUrls?.length > 0 || transformedData.logo.logoDescription) && (
        <Card className="border-2 border-blue-500 dark:border-blue-600">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge className="bg-blue-600 dark:bg-blue-700 text-white">LOGO DO CLIENTE</Badge>
            </h3>
            <div className="space-y-4">
              {transformedData.logo.hasLogo && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Logo</Label>
                  <p className="text-sm font-medium bg-muted p-2 rounded">
                    {transformedData.logo.hasLogo === 'sim' && '✓ Upload realizado'}
                    {transformedData.logo.hasLogo === 'criar_logo' && '⚠️ Designer deve criar'}
                    {transformedData.logo.hasLogo === 'depois' && '⏰ Cliente enviará depois'}
                    {transformedData.logo.hasLogo === 'sem_logo' && '✗ Sem logo'}
                  </p>
                </div>
              )}
              
              {transformedData.logo.logoDescription && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição para Criação</Label>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded border border-blue-300 dark:border-blue-700">
                    <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-100">{transformedData.logo.logoDescription}</p>
                  </div>
                </div>
              )}
              
              {transformedData.logo.logoUrls && transformedData.logo.logoUrls.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Logos Enviadas pelo Cliente</Label>
                  <AssetGallery
                    assets={transformedData.logo.logoUrls.map((url: string, idx: number) => ({
                      url,
                      label: `Logo ${idx + 1}`
                    }))}
                    columns={3}
                    imageHeight="h-40"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: OBSERVAÇÕES INTERNAS */}
      {transformedData.internalNotes && (
        <Card className="border-2 border-amber-500 dark:border-amber-600">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge className="bg-amber-600 dark:bg-amber-700 text-white">OBSERVAÇÕES INTERNAS</Badge>
            </h3>
            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded border border-amber-300 dark:border-amber-700">
              <p className="text-sm whitespace-pre-wrap text-amber-900 dark:text-amber-100">{transformedData.internalNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: FRENTE */}
      {transformedData.front && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge variant="default">FRENTE</Badge>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda: Detalhes */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {transformedData.front.logoType === 'custom' ? 'Outras personalizações' : 'Posicionamento do Logo'}
                  </Label>
                  <p className="text-sm font-medium">{formatLogoType(transformedData.front.logoType)}</p>
                </div>
                {transformedData.front.smallLogoObservation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observação - Logo Pequena</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 p-2 rounded flex-1">{transformedData.front.smallLogoObservation}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.front.smallLogoObservation!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.front.largeLogoObservation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observação - Logo Grande</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 p-2 rounded flex-1">{transformedData.front.largeLogoObservation}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.front.largeLogoObservation!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.front.customDescription && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição da Personalização</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.front.customDescription}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.front.customDescription!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.front.customFileName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Arquivo Anexado</Label>
                    <p className="text-sm bg-muted p-2 rounded">{transformedData.front.customFileName}</p>
                  </div>
                )}
                {transformedData.front.text && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Texto</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.front.text}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.front.text)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Preview Visual e Assets */}
              <div className="space-y-4">
                {transformedData.modelImages?.front && (
                  <ShirtPreviewAnnotated
                    imageUrl={getModelImageForSection('front', transformedData.front)}
                    annotations={getFrontAnnotations(transformedData.front)}
                    alt="Preview da Frente"
                    onImageClick={() => setZoomImage({ 
                      url: getModelImageForSection('front', transformedData.front),
                      alt: 'Preview da Frente'
                    })}
                  />
                )}
                {frontAssets.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Assets</Label>
                    <AssetGallery
                      assets={frontAssets}
                      columns={2}
                      imageHeight="h-48"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: COSTAS */}
      {transformedData.back && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge variant="default">COSTAS</Badge>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda: Detalhes */}
              <div className="space-y-4">
                {transformedData.back.logoLarge && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Logo Grande</Label>
                    <p className="text-sm bg-muted p-2 rounded">✓ Logo grande no centro das costas</p>
                  </div>
                )}
                {transformedData.back.logoLargeObservation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observação - Logo Grande Costas</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 p-2 rounded flex-1">{transformedData.back.logoLargeObservation}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.logoLargeObservation!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.logoNeckObservation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observação - Logo Nuca</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 p-2 rounded flex-1">{transformedData.back.logoNeckObservation}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.logoNeckObservation!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.name?.enabled && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.back.name.value}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.name.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.instagram?.enabled && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Instagram</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.back.instagram.value}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.instagram.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.website?.enabled && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Website</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.back.website.value}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.website.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.email?.enabled && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.back.email.value}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.email.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.whatsapp?.enabled && (
                  <div>
                    <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.back.whatsapp.value}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.back.whatsapp.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {transformedData.back.hasSponsors && transformedData.back.sponsors && transformedData.back.sponsors.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Patrocinadores</Label>
                    <div className="space-y-2 mt-2">
                      {transformedData.back.sponsors.map((sponsor: any, idx: number) => (
                        <div key={idx} className="bg-muted p-2 rounded text-sm">
                          <p className="font-medium">{sponsor.name}</p>
                          {sponsor.logoFileName && (
                            <p className="text-xs text-muted-foreground">Arquivo: {sponsor.logoFileName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {transformedData.back.sponsorsLocation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Localização dos Patrocinadores</Label>
                    <p className="text-sm bg-muted p-2 rounded">{transformedData.back.sponsorsLocation}</p>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Preview Visual e Assets */}
              <div className="space-y-4">
                {transformedData.modelImages?.back && (
                  <ShirtPreviewAnnotated
                    imageUrl={transformedData.modelImages.back}
                    annotations={getBackAnnotations(transformedData.back)}
                    alt="Preview das Costas"
                    onImageClick={() => setZoomImage({ 
                      url: transformedData.modelImages.back,
                      alt: 'Preview das Costas'
                    })}
                  />
                )}
                
                {clientLogosAssets.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Logos do Cliente</Label>
                    <AssetGallery
                      assets={clientLogosAssets}
                      columns={2}
                      imageHeight="h-48"
                    />
                  </div>
                )}
                
                {backAssets.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Assets</Label>
                    <AssetGallery
                      assets={backAssets}
                      columns={2}
                      imageHeight="h-48"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: MANGAS */}
      {(transformedData.leftSleeve || transformedData.rightSleeve) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge variant="default">MANGAS</Badge>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Manga Esquerda */}
              {transformedData.leftSleeve && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Manga Esquerda</h4>
                  <div className="space-y-3">
                    {transformedData.leftSleeve.flagState && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Bandeira</Label>
                        <p className="text-sm bg-muted p-2 rounded">{transformedData.leftSleeve.flagState}</p>
                      </div>
                    )}
                    {transformedData.leftSleeve.logoFileName && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Logo Pequena</Label>
                        <p className="text-sm bg-muted p-2 rounded">✓ {transformedData.leftSleeve.logoFileName}</p>
                      </div>
                    )}
                    {transformedData.leftSleeve.text && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Texto</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.leftSleeve.text}</p>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.leftSleeve.text)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {(transformedData.leftSleeve.flag || transformedData.leftSleeve.logo) && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Assets</Label>
                        <AssetGallery
                          assets={[
                            ...(transformedData.leftSleeve.flag ? [{ url: transformedData.leftSleeve.flag, label: 'Bandeira' }] : []),
                            ...(transformedData.leftSleeve.logo ? [{ url: transformedData.leftSleeve.logo, label: 'Logo' }] : [])
                          ]}
                          columns={2}
                          imageHeight="h-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Manga Direita */}
              {transformedData.rightSleeve && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Manga Direita</h4>
                  <div className="space-y-3">
                    {transformedData.rightSleeve.flagState && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Bandeira</Label>
                        <p className="text-sm bg-muted p-2 rounded">{transformedData.rightSleeve.flagState}</p>
                      </div>
                    )}
                    {transformedData.rightSleeve.logoFileName && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Logo Pequena</Label>
                        <p className="text-sm bg-muted p-2 rounded">✓ {transformedData.rightSleeve.logoFileName}</p>
                      </div>
                    )}
                    {transformedData.rightSleeve.text && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Texto</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm bg-muted p-2 rounded flex-1">{transformedData.rightSleeve.text}</p>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transformedData.rightSleeve.text)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {(transformedData.rightSleeve.flag || transformedData.rightSleeve.logo) && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Assets</Label>
                        <AssetGallery
                          assets={[
                            ...(transformedData.rightSleeve.flag ? [{ url: transformedData.rightSleeve.flag, label: 'Bandeira' }] : []),
                            ...(transformedData.rightSleeve.logo ? [{ url: transformedData.rightSleeve.logo, label: 'Logo' }] : [])
                          ]}
                          columns={2}
                          imageHeight="h-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO: TODOS OS ASSETS */}
      {allImages.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Todos os Assets</h3>
            <AssetGallery
              assets={allImages}
              columns={3}
              imageHeight="h-48"
            />
          </CardContent>
        </Card>
      )}

      {/* MODAL DE ZOOM */}
      {zoomImage && (
        <ImageZoomModal
          imageUrl={zoomImage.url}
          alt={zoomImage.alt}
          isOpen={!!zoomImage}
          onClose={() => setZoomImage(null)}
        />
      )}

      {/* MODAL DE MUDAR MODELO */}
      <Dialog open={changeModelDialogOpen} onOpenChange={setChangeModelDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mudar Modelo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Seletor de Campanha */}
            <div>
              <Label>Campanha</Label>
              <Select value={newCampaignId} onValueChange={handleCampaignChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a campanha" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Seletor de Tipo de Uniforme */}
            {newCampaignId && (
              <div>
                <Label>Tipo de Uniforme</Label>
                <Select value={newUniformType} onValueChange={setNewUniformType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniformTypes.map(type => (
                      <SelectItem key={type.tag_value} value={type.tag_value}>
                        {type.icon} {type.display_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Grid de Modelos */}
            {filteredModels.length > 0 && (
              <div>
                <Label>Modelo</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {filteredModels.map(model => (
                    <div 
                      key={model.id}
                      onClick={() => setNewModel(model)}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors",
                        newModel?.id === model.id && "border-primary ring-2 ring-primary bg-primary/5"
                      )}
                    >
                      <img src={model.image_front} alt={model.name} className="w-full h-32 object-contain mb-2" />
                      <p className="text-xs text-center font-medium truncate">{model.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newCampaignId && newUniformType && filteredModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum modelo encontrado para esta combinação.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeModelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleModelChange} disabled={!newModel || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Confirmar Mudança"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

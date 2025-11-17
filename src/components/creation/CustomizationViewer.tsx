import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CustomizationSummary } from "./CustomizationSummary";
import { ShirtPreviewAnnotated } from "./ShirtPreviewAnnotated";
import { AssetGallery } from "./AssetGallery";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";

interface CustomizationViewerProps {
  data: any;
}

export const CustomizationViewer = ({ data }: CustomizationViewerProps) => {
  const [zoomImage, setZoomImage] = useState<{ url: string; alt: string } | null>(null);

  const transformCustomizationData = (rawData: any) => {
    if (!rawData) return null;
    
    return {
      front: rawData.front ? {
        logoSize: rawData.front.logoType,
        logoFile: rawData.front.logoUrl || undefined,
        text: rawData.front.text || undefined,
      } : undefined,
      
      back: rawData.back ? {
        name: { enabled: rawData.back.name, value: rawData.back.nameText },
        instagram: { enabled: rawData.back.instagram, value: rawData.back.instagramText },
        website: { enabled: rawData.back.website, value: rawData.back.websiteText },
        email: { enabled: rawData.back.email, value: rawData.back.emailText },
        whatsapp: { enabled: rawData.back.whatsapp, value: rawData.back.whatsappText },
        logo: rawData.back.logoUrl || undefined,
        sponsors: rawData.back.sponsorsLogosUrls?.map((url: string) => ({ logo: url })) || []
      } : undefined,
      
      leftSleeve: rawData.sleeves?.left ? {
        flag: rawData.sleeves.left.flagUrl || undefined,
        logo: rawData.sleeves.left.logoUrl || undefined,
        text: rawData.sleeves.left.text ? rawData.sleeves.left.textContent : undefined
      } : undefined,
      
      rightSleeve: rawData.sleeves?.right ? {
        flag: rawData.sleeves.right.flagUrl || undefined,
        logo: rawData.sleeves.right.logoUrl || undefined,
        text: rawData.sleeves.right.text ? rawData.sleeves.right.textContent : undefined
      } : undefined,
      
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
    if (transformedData?.back?.logo) images.push({ url: transformedData.back.logo, label: 'Logo Costas' });
    if (transformedData?.back?.sponsors) {
      transformedData.back.sponsors.forEach((sponsor: any, idx: number) => {
        if (sponsor.logo) images.push({ url: sponsor.logo, label: `Patrocinador ${idx + 1}` });
      });
    }
    if (transformedData?.leftSleeve?.flag) images.push({ url: transformedData.leftSleeve.flag, label: 'Bandeira Manga Esquerda' });
    if (transformedData?.leftSleeve?.logo) images.push({ url: transformedData.leftSleeve.logo, label: 'Logo Manga Esquerda' });
    if (transformedData?.rightSleeve?.flag) images.push({ url: transformedData.rightSleeve.flag, label: 'Bandeira Manga Direita' });
    if (transformedData?.rightSleeve?.logo) images.push({ url: transformedData.rightSleeve.logo, label: 'Logo Manga Direita' });
    return images;
  };

  const allImages = collectAllImages();

  const handleDownloadAll = async () => {
    if (allImages.length === 0) {
      toast({ title: "Nenhum asset", description: "Não há imagens para baixar", variant: "destructive" });
      return;
    }
    for (const img of allImages) {
      window.open(img.url, '_blank');
      await new Promise(r => setTimeout(r, 500));
    }
    toast({ title: "Download iniciado", description: `${allImages.length} arquivo${allImages.length > 1 ? 's' : ''} sendo baixado${allImages.length > 1 ? 's' : ''}` });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência` });
  };

  const getFrontAnnotations = () => {
    const annotations = [];
    if (transformedData.front?.logoFile) {
      const isLarge = transformedData.front.logoSize === 'large_center';
      annotations.push({
        label: isLarge ? 'Logo Grande Centro' : 'Logo Pequeno Esquerda',
        position: { top: isLarge ? '45%' : '35%', left: isLarge ? '50%' : '30%' },
        variant: 'default' as const
      });
    }
    if (transformedData.front?.text) {
      annotations.push({ label: `Texto: "${transformedData.front.text}"`, position: { top: '60%', left: '50%' }, variant: 'secondary' as const });
    }
    return annotations;
  };

  const getBackAnnotations = () => {
    const annotations = [];
    if (transformedData.back?.logo) annotations.push({ label: 'Logo Costas', position: { top: '30%', left: '50%' }, variant: 'default' as const });
    const textFields = [transformedData.back?.name, transformedData.back?.instagram, transformedData.back?.website, transformedData.back?.email, transformedData.back?.whatsapp].filter(f => f?.enabled).length;
    if (textFields > 0) annotations.push({ label: `${textFields} Campo${textFields > 1 ? 's' : ''} de Texto`, position: { top: '50%', left: '50%' }, variant: 'secondary' as const });
    if (transformedData.back?.sponsors && transformedData.back.sponsors.length > 0) {
      annotations.push({ label: `${transformedData.back.sponsors.length} Patrocinador${transformedData.back.sponsors.length > 1 ? 'es' : ''}`, position: { top: '70%', left: '50%' }, variant: 'default' as const });
    }
    return annotations;
  };

  return (
    <div className="space-y-6">
      <CustomizationSummary front={transformedData.front} back={transformedData.back} leftSleeve={transformedData.leftSleeve} rightSleeve={transformedData.rightSleeve} totalAssets={allImages.length} />
      {allImages.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleDownloadAll} variant="default" size="sm">
            <Download className="h-4 w-4 mr-2" />Baixar Todos os Assets ({allImages.length})
          </Button>
        </div>
      )}
      <Tabs defaultValue="front" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="front">👕 Frente</TabsTrigger>
          <TabsTrigger value="back">🔙 Costas</TabsTrigger>
          <TabsTrigger value="sleeves">💪 Mangas</TabsTrigger>
          <TabsTrigger value="all">🖼️ Todos</TabsTrigger>
        </TabsList>
        <TabsContent value="front" className="mt-6">
          {transformedData.front ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Preview Visual</h3>
                {transformedData.modelImages?.front ? (
                  <ShirtPreviewAnnotated imageUrl={transformedData.modelImages.front} annotations={getFrontAnnotations()} alt="Preview Frente" onImageClick={() => setZoomImage({ url: transformedData.modelImages.front, alt: "Preview Frente" })} />
                ) : <p className="text-xs text-muted-foreground">Preview não disponível</p>}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Especificações</h3>
                <Card><CardContent className="p-4 space-y-3">
                  {transformedData.front.logoSize && (<div><p className="text-xs font-medium mb-1">Posição do Logo</p><Badge variant="secondary">{transformedData.front.logoSize === 'small_left' ? 'Pequeno Esquerda' : 'Grande Centro'}</Badge></div>)}
                  {transformedData.front.text && (<div><div className="flex items-center justify-between mb-1"><p className="text-xs font-medium">Texto</p><Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(transformedData.front.text!, "Texto")}><Copy className="h-3 w-3" /></Button></div><p className="text-xs bg-muted p-2 rounded">{transformedData.front.text}</p></div>)}
                </CardContent></Card>
                {transformedData.front.logoFile && (<div><h4 className="font-semibold text-sm mb-3">Assets</h4><AssetGallery assets={[{ url: transformedData.front.logoFile, label: 'Logo Frente' }]} columns={2} /></div>)}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhuma personalização na frente</p>}
        </TabsContent>
        <TabsContent value="back" className="mt-6">
          {transformedData.back ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Preview Visual</h3>
                {transformedData.modelImages?.back ? (
                  <ShirtPreviewAnnotated imageUrl={transformedData.modelImages.back} annotations={getBackAnnotations()} alt="Preview Costas" onImageClick={() => setZoomImage({ url: transformedData.modelImages.back, alt: "Preview Costas" })} />
                ) : <p className="text-xs text-muted-foreground">Preview não disponível</p>}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Especificações</h3>
                <Card><CardContent className="p-4 space-y-3">
                  {(transformedData.back.name?.enabled || transformedData.back.instagram?.enabled || transformedData.back.website?.enabled || transformedData.back.email?.enabled || transformedData.back.whatsapp?.enabled) && (
                    <div><p className="text-xs font-medium mb-2">Campos de Texto</p><div className="space-y-2">
                      {transformedData.back.name?.enabled && transformedData.back.name?.value && (<div className="flex items-center gap-2"><p className="text-xs bg-muted p-2 rounded flex-1"><span className="font-medium">Nome:</span> {transformedData.back.name.value}</p><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(transformedData.back.name.value, "Nome")}><Copy className="h-3 w-3" /></Button></div>)}
                      {transformedData.back.instagram?.enabled && transformedData.back.instagram?.value && (<div className="flex items-center gap-2"><p className="text-xs bg-muted p-2 rounded flex-1"><span className="font-medium">Instagram:</span> {transformedData.back.instagram.value}</p><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(transformedData.back.instagram.value, "Instagram")}><Copy className="h-3 w-3" /></Button></div>)}
                      {transformedData.back.website?.enabled && transformedData.back.website?.value && (<div className="flex items-center gap-2"><p className="text-xs bg-muted p-2 rounded flex-1"><span className="font-medium">Website:</span> {transformedData.back.website.value}</p><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(transformedData.back.website.value, "Website")}><Copy className="h-3 w-3" /></Button></div>)}
                      {transformedData.back.email?.enabled && transformedData.back.email?.value && (<div className="flex items-center gap-2"><p className="text-xs bg-muted p-2 rounded flex-1"><span className="font-medium">Email:</span> {transformedData.back.email.value}</p><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(transformedData.back.email.value, "Email")}><Copy className="h-3 w-3" /></Button></div>)}
                      {transformedData.back.whatsapp?.enabled && transformedData.back.whatsapp?.value && (<div className="flex items-center gap-2"><p className="text-xs bg-muted p-2 rounded flex-1"><span className="font-medium">WhatsApp:</span> {transformedData.back.whatsapp.value}</p><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyToClipboard(transformedData.back.whatsapp.value, "WhatsApp")}><Copy className="h-3 w-3" /></Button></div>)}
                    </div></div>
                  )}
                </CardContent></Card>
                {(transformedData.back.logo || (transformedData.back.sponsors && transformedData.back.sponsors.length > 0)) && (
                  <div><h4 className="font-semibold text-sm mb-3">Assets</h4><AssetGallery assets={[...(transformedData.back.logo ? [{ url: transformedData.back.logo, label: 'Logo Costas' }] : []), ...(transformedData.back.sponsors?.map((s: any, i: number) => ({ url: s.logo, label: `Patrocinador ${i + 1}` })) || [])]} columns={2} /></div>
                )}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhuma personalização nas costas</p>}
        </TabsContent>
        <TabsContent value="sleeves" className="mt-6">
          {(transformedData.leftSleeve || transformedData.rightSleeve) ? (
            <div className="grid md:grid-cols-2 gap-6">
              {transformedData.leftSleeve && (<Card><CardContent className="p-4 space-y-4"><h3 className="font-semibold text-sm">💪 Manga Esquerda</h3>{transformedData.modelImages?.leftSleeve && (<div className="cursor-pointer" onClick={() => setZoomImage({ url: transformedData.modelImages.leftSleeve, alt: "Manga Esquerda" })}><img src={transformedData.modelImages.leftSleeve} alt="Manga Esquerda" className="w-full rounded-lg border-2 border-border hover:border-primary transition-colors" /></div>)}{transformedData.leftSleeve.text && (<div><div className="flex items-center justify-between mb-1"><p className="text-xs font-medium">Texto</p><Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(transformedData.leftSleeve.text!, "Texto Manga Esquerda")}><Copy className="h-3 w-3" /></Button></div><p className="text-xs bg-muted p-2 rounded">{transformedData.leftSleeve.text}</p></div>)}{(transformedData.leftSleeve.flag || transformedData.leftSleeve.logo) && (<AssetGallery assets={[...(transformedData.leftSleeve.flag ? [{ url: transformedData.leftSleeve.flag, label: 'Bandeira' }] : []), ...(transformedData.leftSleeve.logo ? [{ url: transformedData.leftSleeve.logo, label: 'Logo' }] : [])]} columns={2} imageHeight="h-32" />)}</CardContent></Card>)}
              {transformedData.rightSleeve && (<Card><CardContent className="p-4 space-y-4"><h3 className="font-semibold text-sm">💪 Manga Direita</h3>{transformedData.modelImages?.rightSleeve && (<div className="cursor-pointer" onClick={() => setZoomImage({ url: transformedData.modelImages.rightSleeve, alt: "Manga Direita" })}><img src={transformedData.modelImages.rightSleeve} alt="Manga Direita" className="w-full rounded-lg border-2 border-border hover:border-primary transition-colors" /></div>)}{transformedData.rightSleeve.text && (<div><div className="flex items-center justify-between mb-1"><p className="text-xs font-medium">Texto</p><Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(transformedData.rightSleeve.text!, "Texto Manga Direita")}><Copy className="h-3 w-3" /></Button></div><p className="text-xs bg-muted p-2 rounded">{transformedData.rightSleeve.text}</p></div>)}{(transformedData.rightSleeve.flag || transformedData.rightSleeve.logo) && (<AssetGallery assets={[...(transformedData.rightSleeve.flag ? [{ url: transformedData.rightSleeve.flag, label: 'Bandeira' }] : []), ...(transformedData.rightSleeve.logo ? [{ url: transformedData.rightSleeve.logo, label: 'Logo' }] : [])]} columns={2} imageHeight="h-32" />)}</CardContent></Card>)}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhuma personalização nas mangas</p>}
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          {allImages.length > 0 ? (<div><h3 className="font-semibold text-sm mb-4">Todos os Assets ({allImages.length})</h3><AssetGallery assets={allImages} columns={3} /></div>) : <p className="text-sm text-muted-foreground text-center py-8">Nenhum asset disponível</p>}
        </TabsContent>
      </Tabs>
      {zoomImage && <ImageZoomModal isOpen={!!zoomImage} onClose={() => setZoomImage(null)} imageUrl={zoomImage.url} alt={zoomImage.alt} />}
    </div>
  );
};

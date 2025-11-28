import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
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
        logoType: rawData.front.logoType,
        logoFile: rawData.front.logoUrl || undefined,
        text: rawData.front.text || undefined,
        customDescription: rawData.front.customDescription || undefined,
        customFileName: rawData.front.customFileName || undefined,
        customFileUrl: rawData.front.customFileUrl || undefined,
      } : undefined,
      
      back: rawData.back ? {
        name: { enabled: rawData.back.name, value: rawData.back.nameText },
        instagram: { enabled: rawData.back.instagram, value: rawData.back.instagramText },
        website: { enabled: rawData.back.website, value: rawData.back.websiteText },
        email: { enabled: rawData.back.email, value: rawData.back.emailText },
        whatsapp: { enabled: rawData.back.whatsapp, value: rawData.back.whatsappText },
        logo: rawData.back.logoUrl || undefined,
        logoLarge: rawData.back.logoLarge || false,
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
      
      clientLogos: rawData.logoUrls || [],
      
      internalNotes: rawData.internalNotes || undefined,
      
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

  return (
    <div className="space-y-6">
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

      {/* SEÇÃO: OBSERVAÇÕES INTERNAS */}
      {transformedData.internalNotes && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Badge variant="secondary">OBSERVAÇÕES INTERNAS</Badge>
            </h3>
            <div className="bg-muted p-4 rounded">
              <p className="text-sm whitespace-pre-wrap">{transformedData.internalNotes}</p>
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
    </div>
  );
};

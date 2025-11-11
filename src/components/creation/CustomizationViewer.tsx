import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Check, X } from "lucide-react";

interface CustomizationViewerProps {
  data: any;
}

export const CustomizationViewer = ({ data }: CustomizationViewerProps) => {
  // Transform database customization_data to component format
  const transformCustomizationData = (rawData: any) => {
    if (!rawData) return null;
    
    return {
      front: rawData.front ? {
        logoSize: rawData.front.logoType,
        logoFile: rawData.front.logoUrl || undefined,
        text: rawData.front.text || undefined,
      } : undefined,
      
      back: rawData.back ? {
        name: {
          enabled: rawData.back.name,
          value: rawData.back.nameText
        },
        instagram: {
          enabled: rawData.back.instagram,
          value: rawData.back.instagramText
        },
        website: {
          enabled: rawData.back.website,
          value: rawData.back.websiteText
        },
        email: {
          enabled: rawData.back.email,
          value: rawData.back.emailText
        },
        whatsapp: {
          enabled: rawData.back.whatsapp,
          value: rawData.back.whatsappText
        },
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
      } : undefined
    };
  };

  const transformedData = transformCustomizationData(data);

  if (!transformedData) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum dado de personalização disponível
      </p>
    );
  }

  const handleDownload = (url: string, filename: string) => {
    window.open(url, '_blank');
  };

  const renderImage = (url: string | undefined, label: string) => {
    if (!url) return null;
    
    return (
      <div className="flex items-center gap-2">
        <img 
          src={url} 
          alt={label}
          className="w-24 h-24 object-cover rounded border cursor-pointer hover:border-primary transition-colors"
          onClick={() => window.open(url, '_blank')}
          title="Clique para ver em tamanho completo"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{label}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(url, label)}
            className="mt-1 h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  const renderCheckBox = (value: boolean, label: string) => {
    return (
      <div className="flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-green-500" />
        <span className="text-xs">{label}</span>
      </div>
    );
  };

  // Collect all images from customization data
  const collectAllImages = () => {
    const images: Array<{ url: string; label: string }> = [];

    if (transformedData?.front?.logoFile) {
      images.push({ url: transformedData.front.logoFile, label: 'Logo Frente' });
    }

    if (transformedData?.back?.logo) {
      images.push({ url: transformedData.back.logo, label: 'Logo Costas' });
    }

    if (transformedData?.back?.sponsors) {
      transformedData.back.sponsors.forEach((sponsor: any, idx: number) => {
        if (sponsor.logo) {
          images.push({ url: sponsor.logo, label: `Patrocinador ${idx + 1}` });
        }
      });
    }

    if (transformedData?.leftSleeve?.flag) {
      images.push({ url: transformedData.leftSleeve.flag, label: 'Bandeira Manga Esquerda' });
    }

    if (transformedData?.leftSleeve?.logo) {
      images.push({ url: transformedData.leftSleeve.logo, label: 'Logo Manga Esquerda' });
    }

    if (transformedData?.rightSleeve?.flag) {
      images.push({ url: transformedData.rightSleeve.flag, label: 'Bandeira Manga Direita' });
    }

    if (transformedData?.rightSleeve?.logo) {
      images.push({ url: transformedData.rightSleeve.logo, label: 'Logo Manga Direita' });
    }

    return images;
  };

  const allImages = collectAllImages();

  return (
    <div className="space-y-2 pb-4">
      {/* FRENTE */}
      {transformedData.front && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📍 FRENTE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transformedData.front.logoSize && (
              <div>
                <p className="text-xs font-medium mb-1">Tamanho do Logo</p>
                <Badge variant="secondary" className="text-xs">
                  {transformedData.front.logoSize === 'small_left' ? 'Pequeno Esquerda' : 'Grande Centro'}
                </Badge>
              </div>
            )}
            
            {transformedData.front.logoFile && (
              <div>
                <p className="text-xs font-medium mb-1">Logo</p>
                {renderImage(transformedData.front.logoFile, 'Logo Frente')}
              </div>
            )}
            
            {transformedData.front.text && (
              <div>
                <p className="text-xs font-medium mb-1">Texto</p>
                <p className="text-xs bg-muted p-2 rounded">{transformedData.front.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* COSTAS */}
      {transformedData.back && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📍 COSTAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Logo das Costas - SEMPRE EXIBIR SE EXISTIR */}
            {transformedData.back.logo && (
              <div>
                <p className="text-xs font-medium mb-1">Logo</p>
                {renderImage(transformedData.back.logo, 'Logo Costas')}
              </div>
            )}

            {/* Só exibir campos de texto se algum foi habilitado */}
            {(transformedData.back.name?.enabled || 
              transformedData.back.instagram?.enabled || 
              transformedData.back.website?.enabled || 
              transformedData.back.email?.enabled || 
              transformedData.back.whatsapp?.enabled) && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {transformedData.back.name?.enabled && renderCheckBox(true, "Nome")}
                  {transformedData.back.instagram?.enabled && renderCheckBox(true, "Instagram")}
                  {transformedData.back.website?.enabled && renderCheckBox(true, "Website")}
                  {transformedData.back.email?.enabled && renderCheckBox(true, "Email")}
                  {transformedData.back.whatsapp?.enabled && renderCheckBox(true, "WhatsApp")}
                </div>

                {transformedData.back.name?.enabled && transformedData.back.name?.value && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Nome</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.back.name.value}</p>
                  </div>
                )}

                {transformedData.back.instagram?.enabled && transformedData.back.instagram?.value && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Instagram</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.back.instagram.value}</p>
                  </div>
                )}

                {transformedData.back.website?.enabled && transformedData.back.website?.value && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Website</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.back.website.value}</p>
                  </div>
                )}

                {transformedData.back.email?.enabled && transformedData.back.email?.value && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Email</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.back.email.value}</p>
                  </div>
                )}

                {transformedData.back.whatsapp?.enabled && transformedData.back.whatsapp?.value && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">WhatsApp</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.back.whatsapp.value}</p>
                  </div>
                )}
              </>
            )}

            {/* Patrocinadores */}
            {transformedData.back.sponsors && transformedData.back.sponsors.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Patrocinadores</p>
                <div className="space-y-2">
                  {transformedData.back.sponsors.map((sponsor: any, idx: number) => 
                    renderImage(sponsor.logo, `Patrocinador ${idx + 1}`)
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MANGAS */}
      {(transformedData.leftSleeve || transformedData.rightSleeve) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📍 MANGAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Manga Esquerda */}
            {transformedData.leftSleeve && (
              <div className="space-y-2">
                <h4 className="font-semibold text-xs">Manga Esquerda</h4>
                
                {transformedData.leftSleeve.flag && (
                  <div>
                    <p className="text-xs font-medium mb-1">Bandeira</p>
                    {renderImage(transformedData.leftSleeve.flag, 'Bandeira Manga Esquerda')}
                  </div>
                )}
                
                {transformedData.leftSleeve.logo && (
                  <div>
                    <p className="text-xs font-medium mb-1">Logo</p>
                    {renderImage(transformedData.leftSleeve.logo, 'Logo Manga Esquerda')}
                  </div>
                )}
                
                {transformedData.leftSleeve.text && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Texto</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.leftSleeve.text}</p>
                  </div>
                )}
              </div>
            )}

            {/* Manga Direita */}
            {transformedData.rightSleeve && (
              <div className="space-y-2">
                <h4 className="font-semibold text-xs">Manga Direita</h4>
                
                {transformedData.rightSleeve.flag && (
                  <div>
                    <p className="text-xs font-medium mb-1">Bandeira</p>
                    {renderImage(transformedData.rightSleeve.flag, 'Bandeira Manga Direita')}
                  </div>
                )}
                
                {transformedData.rightSleeve.logo && (
                  <div>
                    <p className="text-xs font-medium mb-1">Logo</p>
                    {renderImage(transformedData.rightSleeve.logo, 'Logo Manga Direita')}
                  </div>
                )}
                
                {transformedData.rightSleeve.text && (
                  <div>
                    <p className="text-xs font-medium mb-0.5">Texto</p>
                    <p className="text-xs bg-muted p-1.5 rounded">{transformedData.rightSleeve.text}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GALERIA DE TODAS AS IMAGENS */}
      {allImages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🖼️ TODAS AS IMAGENS ({allImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-3 gap-3">
                {allImages.map((image, index) => (
                  <div key={index} className="space-y-1">
                    <div className="relative group">
                      <img
                        src={image.url}
                        alt={image.label}
                        className="w-full h-24 object-cover rounded border cursor-pointer hover:border-primary transition-colors"
                        onClick={() => window.open(image.url, '_blank')}
                        title="Clique para ver em tamanho completo"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image.url, image.label);
                          }}
                          className="h-7 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs font-medium truncate text-center" title={image.label}>
                      {image.label}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

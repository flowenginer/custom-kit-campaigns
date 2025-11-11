import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-3">
          <img 
            src={url} 
            alt={label}
            className="w-32 h-32 object-cover rounded border-2 border-border cursor-pointer hover:border-primary transition-colors"
            onClick={() => window.open(url, '_blank')}
            title="Clique para ver em tamanho completo"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(url, label)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  const renderCheckBox = (value: boolean, label: string) => {
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FRENTE */}
      {transformedData.front && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 FRENTE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transformedData.front.logoSize && (
              <div>
                <p className="text-sm font-medium mb-1">Tamanho do Logo</p>
                <Badge variant="secondary">
                  {transformedData.front.logoSize === 'small_left' ? 'Pequeno Esquerda' : 'Grande Centro'}
                </Badge>
              </div>
            )}
            
            {renderImage(transformedData.front.logoFile, "Logo da Frente")}
            
            {transformedData.front.text && (
              <div>
                <p className="text-sm font-medium mb-1">Texto</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.front.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* COSTAS */}
      {transformedData.back && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 COSTAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Só exibir campos que foram habilitados pelo cliente */}
            <div className="grid grid-cols-2 gap-2">
              {transformedData.back.name?.enabled && renderCheckBox(true, "Nome")}
              {transformedData.back.instagram?.enabled && renderCheckBox(true, "Instagram")}
              {transformedData.back.website?.enabled && renderCheckBox(true, "Website")}
              {transformedData.back.email?.enabled && renderCheckBox(true, "Email")}
              {transformedData.back.whatsapp?.enabled && renderCheckBox(true, "WhatsApp")}
            </div>

            {transformedData.back.name?.enabled && transformedData.back.name?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Nome</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.back.name.value}</p>
              </div>
            )}

            {transformedData.back.instagram?.enabled && transformedData.back.instagram?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Instagram</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.back.instagram.value}</p>
              </div>
            )}

            {transformedData.back.website?.enabled && transformedData.back.website?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Website</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.back.website.value}</p>
              </div>
            )}

            {transformedData.back.email?.enabled && transformedData.back.email?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Email</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.back.email.value}</p>
              </div>
            )}

            {transformedData.back.whatsapp?.enabled && transformedData.back.whatsapp?.value && (
              <div>
                <p className="text-sm font-medium mb-1">WhatsApp</p>
                <p className="text-sm bg-muted p-2 rounded">{transformedData.back.whatsapp.value}</p>
              </div>
            )}

            {renderImage(transformedData.back.logo, "Logo das Costas")}

            {transformedData.back.sponsors && transformedData.back.sponsors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Patrocinadores</p>
                <div className="grid grid-cols-2 gap-3">
                  {transformedData.back.sponsors.map((sponsor: any, index: number) => (
                    <div key={index} className="space-y-2">
                      {sponsor.logo && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={sponsor.logo}
                            alt={`Patrocinador ${index + 1}`}
                            className="w-32 h-32 object-cover rounded border-2 border-border cursor-pointer hover:border-primary transition-colors"
                            onClick={() => window.open(sponsor.logo, '_blank')}
                            title="Clique para ver em tamanho completo"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(sponsor.logo, `Patrocinador ${index + 1}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MANGAS */}
      {(transformedData.leftSleeve || transformedData.rightSleeve) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 MANGAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manga Esquerda */}
            {transformedData.leftSleeve && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Manga Esquerda</h4>
                
                {renderImage(transformedData.leftSleeve.flag, "Bandeira")}
                {renderImage(transformedData.leftSleeve.logo, "Logo")}
                
                {transformedData.leftSleeve.text && (
                  <div>
                    <p className="text-sm font-medium mb-1">Texto</p>
                    <p className="text-sm bg-muted p-2 rounded">{transformedData.leftSleeve.text}</p>
                  </div>
                )}
              </div>
            )}

            {/* Manga Direita */}
            {transformedData.rightSleeve && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Manga Direita</h4>
                
                {renderImage(transformedData.rightSleeve.flag, "Bandeira")}
                {renderImage(transformedData.rightSleeve.logo, "Logo")}
                
                {transformedData.rightSleeve.text && (
                  <div>
                    <p className="text-sm font-medium mb-1">Texto</p>
                    <p className="text-sm bg-muted p-2 rounded">{transformedData.rightSleeve.text}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

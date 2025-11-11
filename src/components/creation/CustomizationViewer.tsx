import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Check, X } from "lucide-react";

interface CustomizationViewerProps {
  data: any;
}

export const CustomizationViewer = ({ data }: CustomizationViewerProps) => {
  if (!data) {
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
            className="w-20 h-20 object-cover rounded border"
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
      {data.front && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 FRENTE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.front.logoSize && (
              <div>
                <p className="text-sm font-medium mb-1">Tamanho do Logo</p>
                <Badge variant="secondary">{data.front.logoSize}</Badge>
              </div>
            )}
            
            {renderImage(data.front.logoFile, "Logo da Frente")}
            
            {data.front.text && (
              <div>
                <p className="text-sm font-medium mb-1">Texto</p>
                <p className="text-sm bg-muted p-2 rounded">{data.front.text}</p>
              </div>
            )}
            
            {data.front.textColor && (
              <div>
                <p className="text-sm font-medium mb-1">Cor do Texto</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: data.front.textColor }}
                  />
                  <Badge variant="outline">{data.front.textColor}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* COSTAS */}
      {data.back && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 COSTAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {renderCheckBox(data.back.name?.enabled, "Nome")}
              {renderCheckBox(data.back.instagram?.enabled, "Instagram")}
              {renderCheckBox(data.back.website?.enabled, "Website")}
              {renderCheckBox(data.back.email?.enabled, "Email")}
              {renderCheckBox(data.back.whatsapp?.enabled, "WhatsApp")}
            </div>

            {data.back.name?.enabled && data.back.name?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Nome</p>
                <p className="text-sm bg-muted p-2 rounded">{data.back.name.value}</p>
              </div>
            )}

            {data.back.instagram?.enabled && data.back.instagram?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Instagram</p>
                <p className="text-sm bg-muted p-2 rounded">{data.back.instagram.value}</p>
              </div>
            )}

            {data.back.website?.enabled && data.back.website?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Website</p>
                <p className="text-sm bg-muted p-2 rounded">{data.back.website.value}</p>
              </div>
            )}

            {data.back.email?.enabled && data.back.email?.value && (
              <div>
                <p className="text-sm font-medium mb-1">Email</p>
                <p className="text-sm bg-muted p-2 rounded">{data.back.email.value}</p>
              </div>
            )}

            {data.back.whatsapp?.enabled && data.back.whatsapp?.value && (
              <div>
                <p className="text-sm font-medium mb-1">WhatsApp</p>
                <p className="text-sm bg-muted p-2 rounded">{data.back.whatsapp.value}</p>
              </div>
            )}

            {renderImage(data.back.logo, "Logo das Costas")}

            {data.back.sponsors && data.back.sponsors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Patrocinadores</p>
                <div className="grid grid-cols-2 gap-3">
                  {data.back.sponsors.map((sponsor: any, index: number) => (
                    <div key={index} className="space-y-2">
                      {sponsor.logo && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={sponsor.logo}
                            alt={`Patrocinador ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border"
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
      {(data.leftSleeve || data.rightSleeve) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📍 MANGAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manga Esquerda */}
            {data.leftSleeve && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Manga Esquerda</h4>
                
                {renderImage(data.leftSleeve.flag, "Bandeira")}
                {renderImage(data.leftSleeve.logo, "Logo")}
                
                {data.leftSleeve.text && (
                  <div>
                    <p className="text-sm font-medium mb-1">Texto</p>
                    <p className="text-sm bg-muted p-2 rounded">{data.leftSleeve.text}</p>
                  </div>
                )}
              </div>
            )}

            {/* Manga Direita */}
            {data.rightSleeve && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Manga Direita</h4>
                
                {renderImage(data.rightSleeve.flag, "Bandeira")}
                {renderImage(data.rightSleeve.logo, "Logo")}
                
                {data.rightSleeve.text && (
                  <div>
                    <p className="text-sm font-medium mb-1">Texto</p>
                    <p className="text-sm bg-muted p-2 rounded">{data.rightSleeve.text}</p>
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

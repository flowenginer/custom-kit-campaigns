import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface CustomizationSummaryProps {
  front?: any;
  back?: any;
  leftSleeve?: any;
  rightSleeve?: any;
  totalAssets: number;
}

export const CustomizationSummary = ({ 
  front, 
  back, 
  leftSleeve, 
  rightSleeve,
  totalAssets 
}: CustomizationSummaryProps) => {
  const getFrontSummary = () => {
    if (!front) return null;
    const parts = [];
    if (front.logoFile) parts.push("Logo");
    if (front.text) parts.push("Texto");
    return parts.join(" + ") || "Personalizado";
  };

  const getBackSummary = () => {
    if (!back) return null;
    const parts = [];
    if (back.logo || back.logoLarge) parts.push("Logo grande");
    const textFields = [back.name, back.instagram, back.website, back.email, back.whatsapp]
      .filter(field => field?.enabled).length;
    if (textFields > 0) parts.push(`${textFields} texto${textFields > 1 ? 's' : ''}`);
    if (back.sponsors?.length > 0) parts.push(`${back.sponsors.length} patroc.`);
    return parts.join(" + ") || "Personalizado";
  };

  const getSleeveSummary = () => {
    if (!leftSleeve && !rightSleeve) return null;
    const parts = [];
    let flags = 0, logos = 0, texts = 0;
    
    if (leftSleeve?.flag) flags++;
    if (rightSleeve?.flag) flags++;
    if (leftSleeve?.logo) logos++;
    if (rightSleeve?.logo) logos++;
    if (leftSleeve?.text) texts++;
    if (rightSleeve?.text) texts++;
    
    if (flags > 0) parts.push(`${flags} band.`);
    if (logos > 0) parts.push(`${logos} logo${logos > 1 ? 's' : ''}`);
    if (texts > 0) parts.push(`${texts} texto${texts > 1 ? 's' : ''}`);
    
    return parts.join(" + ") || "Personalizado";
  };

  const frontAssetCount = (front?.logoFile ? 1 : 0) + (front?.text ? 1 : 0);
  const backAssetCount = (back?.logo || back?.logoLarge ? 1 : 0) + 
    (back?.sponsors?.length || 0) +
    [back?.name, back?.instagram, back?.website, back?.email, back?.whatsapp]
      .filter(f => f?.enabled).length;
  const sleeveAssetCount = 
    (leftSleeve?.flag ? 1 : 0) + (leftSleeve?.logo ? 1 : 0) + (leftSleeve?.text ? 1 : 0) +
    (rightSleeve?.flag ? 1 : 0) + (rightSleeve?.logo ? 1 : 0) + (rightSleeve?.text ? 1 : 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* FRENTE */}
      {front && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm">FRENTE</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {getFrontSummary()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {frontAssetCount} asset{frontAssetCount !== 1 ? 's' : ''}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* COSTAS */}
      {back && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm">COSTAS</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {getBackSummary()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {backAssetCount} asset{backAssetCount !== 1 ? 's' : ''}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* MANGAS */}
      {(leftSleeve || rightSleeve) && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm">MANGAS</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {getSleeveSummary()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {sleeveAssetCount} asset{sleeveAssetCount !== 1 ? 's' : ''}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* TOTAL */}
      <Card className="border-2 border-accent bg-accent/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm">TOTAL</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todos os assets
              </p>
            </div>
          </div>
          <Badge variant="default" className="text-xs">
            {totalAssets} arquivo{totalAssets !== 1 ? 's' : ''}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";

interface Asset {
  url: string;
  label: string;
}

interface AssetGalleryProps {
  assets: Asset[];
  columns?: 2 | 3;
  imageHeight?: string;
}

export const AssetGallery = ({ 
  assets, 
  columns = 2,
  imageHeight = "h-48"
}: AssetGalleryProps) => {
  const [zoomImage, setZoomImage] = useState<Asset | null>(null);

  const handleDownload = async (url: string, label: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${label.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <div className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
        {assets.map((asset, index) => (
          <div key={index} className="space-y-2">
            <div className="relative group">
              <img
                src={asset.url}
                alt={asset.label}
                className={`w-full ${imageHeight} object-contain rounded-lg border-2 border-border cursor-pointer hover:border-primary transition-colors bg-muted`}
                onClick={() => setZoomImage(asset)}
                title="Clique para ampliar"
              />
              
              {/* Overlay com botão de download */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(asset.url, asset.label);
                  }}
                  className="shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Label do asset */}
            <p className="text-xs font-medium text-center truncate" title={asset.label}>
              {asset.label}
            </p>
            
            {/* Info do arquivo (placeholder - pode ser expandido) */}
            <p className="text-[10px] text-muted-foreground text-center">
              Clique para ampliar
            </p>
          </div>
        ))}
      </div>

      {/* Modal de Zoom */}
      {zoomImage && (
        <ImageZoomModal
          isOpen={!!zoomImage}
          onClose={() => setZoomImage(null)}
          imageUrl={zoomImage.url}
          alt={zoomImage.label}
        />
      )}
    </>
  );
};

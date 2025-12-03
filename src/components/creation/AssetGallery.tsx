import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileImage, FileArchive, File, Palette } from "lucide-react";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";

interface Asset {
  url: string;
  label: string;
  fileName?: string;
  fileSize?: number;
}

interface AssetGalleryProps {
  assets: Asset[];
  columns?: 2 | 3;
  imageHeight?: string;
}

// Helper functions for file type detection
const getFileExtension = (url: string, fileName?: string): string => {
  const name = fileName || url.split('/').pop() || '';
  return name.split('.').pop()?.toLowerCase() || '';
};

const getFileType = (extension: string): 'image' | 'design' | 'pdf' | 'archive' | 'document' | 'other' => {
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
  const designExtensions = ['cdr', 'ai', 'eps', 'psd', 'indd', 'sketch', 'fig', 'xd', 'svg'];
  const pdfExtensions = ['pdf'];
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  const documentExtensions = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];

  if (imageExtensions.includes(extension)) return 'image';
  if (designExtensions.includes(extension)) return 'design';
  if (pdfExtensions.includes(extension)) return 'pdf';
  if (archiveExtensions.includes(extension)) return 'archive';
  if (documentExtensions.includes(extension)) return 'document';
  return 'other';
};

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'image':
      return <FileImage className="h-12 w-12 text-blue-400" />;
    case 'design':
      return <Palette className="h-12 w-12 text-purple-400" />;
    case 'pdf':
      return <FileText className="h-12 w-12 text-red-400" />;
    case 'archive':
      return <FileArchive className="h-12 w-12 text-yellow-400" />;
    case 'document':
      return <FileText className="h-12 w-12 text-green-400" />;
    default:
      return <File className="h-12 w-12 text-muted-foreground" />;
  }
};

const getFileTypeBadge = (extension: string): string => {
  const badges: Record<string, string> = {
    cdr: 'CDR',
    ai: 'AI',
    eps: 'EPS',
    psd: 'PSD',
    svg: 'SVG',
    pdf: 'PDF',
    zip: 'ZIP',
    rar: 'RAR',
    '7z': '7Z',
    indd: 'INDD',
    sketch: 'Sketch',
    fig: 'Figma',
    xd: 'XD',
  };
  return badges[extension] || extension.toUpperCase();
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImagePreviewable = (extension: string): boolean => {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
};

export const AssetGallery = ({ 
  assets, 
  columns = 2,
  imageHeight = "h-48"
}: AssetGalleryProps) => {
  const [zoomImage, setZoomImage] = useState<Asset | null>(null);

  const handleDownload = async (url: string, label: string, fileName?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Use original filename if available, otherwise generate from label
      const extension = getFileExtension(url, fileName);
      const downloadName = fileName || `${label.replace(/\s+/g, '_')}.${extension || 'file'}`;
      link.download = downloadName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <div className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
        {assets.map((asset, index) => {
          const extension = getFileExtension(asset.url, asset.fileName);
          const fileType = getFileType(extension);
          const canPreview = isImagePreviewable(extension);
          const fileName = asset.fileName || asset.url.split('/').pop() || 'arquivo';

          return (
            <div key={index} className="space-y-2">
              <div className="relative group">
                {canPreview ? (
                  // Image preview
                  <img
                    src={asset.url}
                    alt={asset.label}
                    className={`w-full ${imageHeight} object-contain rounded-lg border-2 border-border cursor-pointer hover:border-primary transition-colors bg-muted`}
                    onClick={() => setZoomImage(asset)}
                    title="Clique para ampliar"
                  />
                ) : (
                  // Non-image file display
                  <div 
                    className={`w-full ${imageHeight} flex flex-col items-center justify-center rounded-lg border-2 border-border bg-muted/50 p-4`}
                  >
                    {getFileIcon(fileType)}
                    <span className="mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
                      {getFileTypeBadge(extension)}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground text-center truncate max-w-full px-2" title={fileName}>
                      {fileName}
                    </p>
                    {asset.fileSize && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(asset.fileSize)}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Overlay com botão de download */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset.url, asset.label, asset.fileName);
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
              
              {/* Info do arquivo */}
              <p className="text-[10px] text-muted-foreground text-center">
                {canPreview ? 'Clique para ampliar' : 'Clique para baixar'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Modal de Zoom - only for images */}
      {zoomImage && isImagePreviewable(getFileExtension(zoomImage.url, zoomImage.fileName)) && (
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

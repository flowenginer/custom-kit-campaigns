import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface MultiFileUploadProps {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  error?: string;
}

export const MultiFileUpload = ({ 
  label, 
  files, 
  onChange, 
  accept = "image/*",
  maxFiles = 10,
  error
}: MultiFileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const totalFiles = files.length + newFiles.length;
    
    if (totalFiles > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const updatedFiles = [...files, ...newFiles];
    onChange(updatedFiles);

    // Generate previews
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>
        {label}
        {error && <span className="text-destructive text-xs ml-2">{error}</span>}
      </Label>
      
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={previews[index] || URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              <p className="text-xs text-muted-foreground truncate mt-1">{file.name}</p>
            </div>
          ))}
        </div>
      )}
      
      {files.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className={error ? "border-destructive" : ""}
          >
            <Upload className="h-4 w-4 mr-2" />
            Escolher Arquivos
          </Button>
        </div>
      )}
    </div>
  );
};

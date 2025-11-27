import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TextEditPopoverProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  multiline?: boolean;
  children: React.ReactNode;
}

export const TextEditPopover = ({ value, onChange, label, multiline, children }: TextEditPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
    toast.success("Texto atualizado!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <Label>{label}</Label>
          {multiline ? (
            <Textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
            />
          )}
          <Button onClick={handleApply} className="w-full">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface ColorEditPopoverProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}

export const ColorEditPopover = ({ value, onChange, label, children }: ColorEditPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
    toast.success("Cor atualizada!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <Label>{label}</Label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-10 w-20 rounded-md border border-input cursor-pointer"
            />
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
          <Button onClick={handleApply} className="w-full">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface ImageEditPopoverProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}

export const ImageEditPopover = ({ value, onChange, label, children }: ImageEditPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('campaign-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(filePath);

      setLocalValue(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
    toast.success("Imagem atualizada!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <Label>{label}</Label>
          {localValue && (
            <img src={localValue} alt="Preview" className="w-full h-32 object-contain bg-muted rounded" />
          )}
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="URL da imagem"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </>
            )}
          </Button>
          <Button onClick={handleApply} className="w-full">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface ModificationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onSuccess: () => void;
}

export const ModificationRequestDialog = ({
  open,
  onOpenChange,
  taskId,
  onSuccess,
}: ModificationRequestDialogProps) => {
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Descreva as alterações necessárias");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload de anexos se houver
      const uploadedAttachments: Array<{ name: string; url: string }> = [];
      
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}/${Date.now()}_${file.name}`;
        const filePath = `modification-requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('customer-logos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('customer-logos')
          .getPublicUrl(filePath);

        uploadedAttachments.push({ name: file.name, url: publicUrl });
      }

      // Inserir solicitação
      const { error } = await supabase
        .from("pending_modification_requests")
        .insert({
          task_id: taskId,
          description: description.trim(),
          attachments: uploadedAttachments,
          requested_by: user.id,
        });

      if (error) throw error;

      toast.success("Solicitação de alteração enviada com sucesso!");
      setDescription("");
      setAttachments([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting modification request:", error);
      toast.error("Erro ao enviar solicitação");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração</DialogTitle>
          <DialogDescription>
            Descreva as alterações necessárias nesta tarefa. Esta solicitação será
            enviada para aprovação do administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição das Alterações *</Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhadamente as alterações necessárias..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Anexos (opcional)</Label>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('mod-file-input')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Arquivos
              </Button>
              <input
                id="mod-file-input"
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !description.trim()}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

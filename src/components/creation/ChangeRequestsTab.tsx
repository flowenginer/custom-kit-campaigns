import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, Download, CheckCircle, AlertCircle, Paperclip, X } from "lucide-react";
import { ChangeRequest } from "@/types/design-task";

interface ChangeRequestsTabProps {
  taskId: string;
  onChangeRequestAdded?: () => void;
}

export const ChangeRequestsTab = ({ taskId, onChangeRequestAdded }: ChangeRequestsTabProps) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadChangeRequests();
    getCurrentUser();
  }, [taskId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadChangeRequests = async () => {
    const { data, error } = await supabase
      .from("change_requests")
      .select(`
        *,
        creator:profiles!change_requests_created_by_fkey (full_name),
        resolver:profiles!change_requests_resolved_by_fkey (full_name)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading change requests:", error);
      return;
    }

    const formatted: ChangeRequest[] = (data || []).map((cr: any) => ({
      ...cr,
      creator_name: cr.creator?.full_name,
      resolver_name: cr.resolver?.full_name,
      attachments: cr.attachments || []
    }));

    setChangeRequests(formatted);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validação de tamanho
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversized = selectedFiles.find(f => f.size > maxSize);
      if (oversized) {
        toast.error(`Arquivo ${oversized.name} é muito grande. Máximo: 10MB`);
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddChangeRequest = async () => {
    if (!description.trim()) {
      toast.error("Descreva a alteração solicitada");
      return;
    }

    if (!currentUserId) {
      toast.error("Usuário não autenticado");
      return;
    }

    setUploading(true);
    try {
      // Upload de arquivos anexados
      const attachments: Array<{ name: string; url: string }> = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `change_requests/${taskId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('customer-logos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('customer-logos')
          .getPublicUrl(fileName);

        attachments.push({
          name: file.name,
          url: publicUrl
        });
      }

      // Inserir solicitação de alteração
      const { error } = await supabase
        .from("change_requests")
        .insert([{
          task_id: taskId,
          description: description.trim(),
          attachments: attachments,
          created_by: currentUserId
        }]);

      if (error) throw error;

      toast.success("Solicitação de alteração adicionada!");
      setDescription("");
      setFiles([]);
      loadChangeRequests();
      onChangeRequestAdded?.();
    } catch (error) {
      console.error("Error adding change request:", error);
      toast.error("Erro ao adicionar solicitação");
    } finally {
      setUploading(false);
    }
  };

  const handleMarkAsResolved = async (requestId: string) => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("change_requests")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: currentUserId
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao marcar como resolvida");
      return;
    }

    toast.success("Alteração marcada como resolvida");
    loadChangeRequests();
  };

  const unresolvedCount = changeRequests.filter(cr => !cr.resolved_at).length;

  return (
    <div className="space-y-6">
      {/* Formulário para nova alteração */}
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Solicitar Nova Alteração</h3>
        </div>

        <div className="space-y-2">
          <Label>Descreva a alteração solicitada pelo cliente</Label>
          <Textarea
            placeholder="Ex: Trocar a logo do lado direito pela nova logo do patrocinador..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Anexar arquivos (logos, referências, etc.)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.ai,.psd"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button variant="outline" size="icon" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip className="h-4 w-4" />
              </label>
            </Button>
          </div>
          
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {file.name}
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button 
          onClick={handleAddChangeRequest}
          disabled={uploading || !description.trim()}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Adicionando..." : "Adicionar Alteração"}
        </Button>
      </div>

      {/* Histórico de alterações */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Histórico de Alterações</h3>
          {unresolvedCount > 0 && (
            <Badge variant="destructive">{unresolvedCount} pendente(s)</Badge>
          )}
        </div>

        {changeRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma alteração solicitada ainda
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {changeRequests.map((cr, index) => (
              <Card key={cr.id} className={cr.resolved_at ? "border-green-200" : "border-red-200"}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {cr.resolved_at ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">
                          Alteração #{changeRequests.length - index}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(cr.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {cr.creator_name && ` • ${cr.creator_name}`}
                        </div>
                      </div>
                    </div>
                    
                    {!cr.resolved_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsResolved(cr.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>

                  <p className="text-sm pl-7">{cr.description}</p>

                  {cr.attachments && cr.attachments.length > 0 && (
                    <div className="pl-7 space-y-2">
                      <Label className="text-xs">Anexos:</Label>
                      <div className="flex flex-wrap gap-2">
                        {cr.attachments.map((att: any, idx: number) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {cr.resolved_at && (
                    <div className="pl-7 text-xs text-green-600">
                      ✓ Resolvida em {format(new Date(cr.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {cr.resolver_name && ` por ${cr.resolver_name}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Segment {
  id: string;
  name: string;
}

interface ShirtModel {
  id: string;
  name: string;
  segment_id: string;
  photo_main: string;
  image_front: string;
  image_back: string;
  image_right: string;
  image_left: string;
  image_front_small_logo?: string | null;
  image_front_large_logo?: string | null;
  image_front_clean?: string | null;
  features?: string[] | null;
  created_at: string;
  segments?: Segment;
}

const Models = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const segmentFilter = searchParams.get("segment");
  
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
    sku: "",
    features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState('');
  const [imageFiles, setImageFiles] = useState<{
    photo_main: File | null;
    image_front: File | null;
    image_back: File | null;
    image_right: File | null;
    image_left: File | null;
    image_front_small_logo: File | null;
    image_front_large_logo: File | null;
    image_front_clean: File | null;
  }>({
    photo_main: null,
    image_front: null,
    image_back: null,
    image_right: null,
    image_left: null,
    image_front_small_logo: null,
    image_front_large_logo: null,
    image_front_clean: null,
  });
  const [imagePreviews, setImagePreviews] = useState<{
    photo_main: string;
    image_front: string;
    image_back: string;
    image_right: string;
    image_left: string;
    image_front_small_logo: string;
    image_front_large_logo: string;
    image_front_clean: string;
  }>({
    photo_main: "",
    image_front: "",
    image_back: "",
    image_right: "",
    image_left: "",
    image_front_small_logo: "",
    image_front_large_logo: "",
    image_front_clean: "",
  });

  useEffect(() => {
    loadModels();
    loadSegments();
  }, []);

  const loadModels = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("*, segments(id, name)")
      .order("created_at", { ascending: false });
    
    if (data) setModels(data);
  };

  const loadSegments = async () => {
    const { data } = await supabase
      .from("segments")
      .select("*")
      .order("name");
    
    if (data) setSegments(data);
  };

  const handleFileChange = (field: keyof typeof imageFiles, file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setImageFiles(prev => ({ ...prev, [field]: file }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (modelId: string, field: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${formData.segment_id}/${modelId}/${field}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("shirt-models-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("shirt-models-images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all images are selected
    const requiredImages: (keyof typeof imageFiles)[] = [
      "photo_main",
      "image_front",
      "image_back",
      "image_right",
      "image_left"
    ];
    
    for (const field of requiredImages) {
      if (!imageFiles[field]) {
        toast.error(`Por favor, selecione a imagem: ${field.replace("_", " ")}`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create model first to get ID
      const { data: model, error: insertError } = await supabase
        .from("shirt_models")
        .insert({
          name: formData.name,
          segment_id: formData.segment_id,
          sku: formData.sku || null,
          photo_main: "temp",
          image_front: "temp",
          image_back: "temp",
          image_right: "temp",
          image_left: "temp",
          features: formData.features.length > 0 ? formData.features : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload all images (required + optional variations)
      const imageUrls: Record<string, string> = {};
      let progress = 0;
      const progressStep = 100 / (requiredImages.length + 3); // +3 for optional variations

      for (const field of requiredImages) {
        const file = imageFiles[field];
        if (file) {
          imageUrls[field] = await uploadImage(model.id, field, file);
          progress += progressStep;
          setUploadProgress(progress);
        }
      }

      // Upload optional front variations
      const optionalImages: (keyof typeof imageFiles)[] = [
        "image_front_small_logo",
        "image_front_large_logo",
        "image_front_clean"
      ];
      
      for (const field of optionalImages) {
        const file = imageFiles[field];
        if (file) {
          imageUrls[field] = await uploadImage(model.id, field, file);
          progress += progressStep;
          setUploadProgress(progress);
        }
      }

      // Update model with image URLs
      const { error: updateError } = await supabase
        .from("shirt_models")
        .update(imageUrls)
        .eq("id", model.id);

      if (updateError) throw updateError;

      toast.success("Modelo criado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", segment_id: "", sku: "", features: [] });
      setNewFeature('');
      setImageFiles({
        photo_main: null,
        image_front: null,
        image_back: null,
        image_right: null,
        image_left: null,
        image_front_small_logo: null,
        image_front_large_logo: null,
        image_front_clean: null,
      });
      setImagePreviews({
        photo_main: "",
        image_front: "",
        image_back: "",
        image_right: "",
        image_left: "",
        image_front_small_logo: "",
        image_front_large_logo: "",
        image_front_clean: "",
      });
      loadModels();
    } catch (error: any) {
      toast.error("Erro ao criar modelo: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, segmentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;

    try {
      // Delete images from storage
      const imageFields = ["photo_main", "image_front", "image_back", "image_right", "image_left"];
      const filesToDelete = imageFields.map(field => `${segmentId}/${id}/${field}.jpg`);
      
      await supabase.storage
        .from("shirt-models-images")
        .remove(filesToDelete);

      // Delete model from database
      const { error } = await supabase.from("shirt_models").delete().eq("id", id);
      
      if (error) throw error;
      
      toast.success("Modelo excluído!");
      loadModels();
    } catch (error: any) {
      toast.error("Erro ao excluir modelo: " + error.message);
    }
  };

  const filteredModels = segmentFilter
    ? models.filter((m) => m.segment_id === segmentFilter)
    : models;

  const filteredSegment = segments.find((s) => s.id === segmentFilter);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Camisa</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os modelos disponíveis para suas campanhas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Modelo de Camisa</DialogTitle>
              <DialogDescription>
                Faça upload das imagens do modelo (máx. 5MB cada). As variações da frente são opcionais.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Nome do Modelo*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Regata Performance, Camisa Gola V"
                  required
                  disabled={uploading}
                />
              </div>

              <div>
                <Label htmlFor="segment">Segmento*</Label>
                <Select
                  value={formData.segment_id}
                  onValueChange={(value) => setFormData({ ...formData, segment_id: value })}
                  disabled={uploading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ex: CM-001, REG-PERF-01"
                  disabled={uploading}
                />
              </div>

              <div className="space-y-3">
                <Label>Características do Modelo</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: UV50+, Dry-fit, Absorção rápida"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newFeature.trim()) {
                          setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
                          setNewFeature('');
                        }
                      }
                    }}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => {
                      if (newFeature.trim()) {
                        setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
                        setNewFeature('');
                      }
                    }}
                    disabled={uploading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                        <span>{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              features: formData.features.filter((_, i) => i !== index)
                            });
                          }}
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Imagens Obrigatórias*</Label>
                
                {[
                  { field: "photo_main" as const, label: "Foto Principal (para seleção)" },
                  { field: "image_front" as const, label: "Imagem - Frente" },
                  { field: "image_back" as const, label: "Imagem - Costas" },
                  { field: "image_right" as const, label: "Imagem - Lado Direito" },
                  { field: "image_left" as const, label: "Imagem - Lado Esquerdo" },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field} className="text-sm text-muted-foreground">
                      {label}
                    </Label>
                    <div className="flex gap-2 items-start">
                      <Input
                        id={field}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                        disabled={uploading}
                        required
                      />
                      {imagePreviews[field] && (
                        <div className="w-20 h-20 border rounded flex-shrink-0">
                          <img
                            src={imagePreviews[field]}
                            alt={label}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <Label className="text-sm">Variações da Frente (Opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Faça upload das variações da frente para permitir preview durante a personalização
                </p>
                
                {[
                  { field: "image_front_small_logo" as const, label: "Frente - Logo Pequena no Peito" },
                  { field: "image_front_large_logo" as const, label: "Frente - Logo Grande no Centro" },
                  { field: "image_front_clean" as const, label: "Frente - Limpa (sem logo)" },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field} className="text-sm text-muted-foreground">
                      {label}
                    </Label>
                    <div className="flex gap-2 items-start">
                      <Input
                        id={field}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                        disabled={uploading}
                      />
                      {imagePreviews[field] && (
                        <div className="w-20 h-20 border rounded flex-shrink-0">
                          <img
                            src={imagePreviews[field]}
                            alt={label}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Label>Fazendo upload...</Label>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Criando Modelo..." : "Criar Modelo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {segmentFilter && filteredSegment && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Exibindo modelos do segmento: <strong>{filteredSegment.name}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredModels.length} {filteredModels.length === 1 ? "modelo encontrado" : "modelos encontrados"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/models")}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar Filtro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className="overflow-hidden">
            <div className="aspect-square bg-muted relative">
              <img
                src={model.photo_main}
                alt={model.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span className="line-clamp-1">{model.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(model.id, model.segment_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                {model.segments?.name || "Sem segmento"} • 5 imagens
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {segmentFilter
              ? "Nenhum modelo encontrado para este segmento."
              : "Nenhum modelo cadastrado. Clique em \"Novo Modelo\" para começar!"}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Models;

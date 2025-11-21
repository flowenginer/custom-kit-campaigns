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
import { Plus, Trash2, Upload, ImageIcon, X, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Segment {
  id: string;
  name: string;
}

interface ShirtModel {
  id: string;
  name: string;
  segment_id: string;
  segment_tag: string;
  model_tag: string;
  sku?: string | null;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ShirtModel | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
    segment_tag: "",
    model_tag: "",
    sku: "",
    features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState('');
  const [searchName, setSearchName] = useState("");
  const [filterSegmentTag, setFilterSegmentTag] = useState<string>("all");
  const [filterModelTag, setFilterModelTag] = useState<string>("all");
  const [availableSegmentTags, setAvailableSegmentTags] = useState<string[]>([]);
  const [availableModelTags, setAvailableModelTags] = useState<string[]>([]);
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
    loadTags();
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

  const loadTags = async () => {
    // Buscar segment_tags
    const { data: segmentTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "segment_tag")
      .order("tag_value");
    
    if (segmentTagsData) {
      setAvailableSegmentTags(segmentTagsData.map(t => t.tag_value));
    }

    // Buscar model_tags
    const { data: modelTagsData } = await supabase
      .from("tags")
      .select("tag_value")
      .eq("tag_type", "model_tag")
      .order("tag_value");
    
    if (modelTagsData) {
      setAvailableModelTags(modelTagsData.map(t => t.tag_value));
    }
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

  const detectImageType = (filename: string): keyof typeof imageFiles | null => {
    // Remove extensão e converte para uppercase
    const name = filename
      .replace(/\.[^/.]+$/, '') // Remove extensão (.jpg, .png, etc)
      .toUpperCase()
      .trim();
    
    // Remove números do início (01, 02, etc)
    const cleanName = name.replace(/^\d+\s*/, '');
    
    // Mapeamento
    if (cleanName.includes('CAPA')) return 'photo_main';
    if (cleanName.includes('FRENTE')) return 'image_front';
    if (cleanName.includes('COSTAS')) return 'image_back';
    if (cleanName.includes('LATERAL DIREITO') || cleanName.includes('DIREITO')) return 'image_right';
    if (cleanName.includes('LATERAL ESQUERDO') || cleanName.includes('ESQUERDO')) return 'image_left';
    if (cleanName.includes('LOGO PEQUENO') || cleanName.includes('SMALL LOGO')) return 'image_front_small_logo';
    if (cleanName.includes('LOGO GRANDE') || cleanName.includes('LARGE LOGO')) return 'image_front_large_logo';
    if (cleanName.includes('LIMPA') || cleanName.includes('CLEAN')) return 'image_front_clean';
    
    return null; // Arquivo não reconhecido
  };

  const handleMultipleFilesUpload = (files: FileList) => {
    const newImageFiles = { ...imageFiles };
    const newImagePreviews = { ...imagePreviews };
    const recognized: string[] = [];
    const unrecognized: string[] = [];
    
    Array.from(files).forEach(file => {
      // Validar tipo
      if (!file.type.startsWith("image/")) {
        unrecognized.push(file.name);
        return;
      }
      
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx. 5MB)`);
        return;
      }
      
      // Detectar tipo
      const fieldType = detectImageType(file.name);
      
      if (fieldType) {
        // Arquivo reconhecido!
        newImageFiles[fieldType] = file;
        
        // Gerar preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => ({
            ...prev,
            [fieldType]: reader.result as string
          }));
        };
        reader.readAsDataURL(file);
        
        recognized.push(file.name);
      } else {
        unrecognized.push(file.name);
      }
    });
    
    // Atualizar estado
    setImageFiles(newImageFiles);
    
    // Feedback ao usuário
    if (recognized.length > 0) {
      toast.success(
        `✅ ${recognized.length} ${recognized.length === 1 ? 'imagem distribuída' : 'imagens distribuídas'} automaticamente!`,
        { duration: 3000 }
      );
    }
    
    if (unrecognized.length > 0) {
      toast.warning(
        `⚠️ ${unrecognized.length} ${unrecognized.length === 1 ? 'arquivo não reconhecido' : 'arquivos não reconhecidos'}. Verifique os nomes.`,
        { duration: 5000 }
      );
    }
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
          segment_tag: formData.segment_tag,
          model_tag: formData.model_tag,
          segment_id: segments.find((s: any) => s.segment_tag === formData.segment_tag)?.id || null,
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
      setFormData({ name: "", segment_id: "", segment_tag: "", model_tag: "", sku: "", features: [] });
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
    // Avisar ao usuário se houver orders associados
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('model_id', id);

    let confirmMessage = "Tem certeza que deseja excluir este modelo?";
    
    if (orderCount && orderCount > 0) {
      confirmMessage = `⚠️ ATENÇÃO: Este modelo possui ${orderCount} pedido(s) associado(s).\n\nTem certeza que deseja excluir mesmo assim?`;
    }

    if (!confirm(confirmMessage)) return;

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
      
      toast.success("Modelo excluído com sucesso!");
      loadModels();
    } catch (error: any) {
      toast.error("Erro ao excluir modelo: " + error.message);
    }
  };

  const openEditDialog = (model: ShirtModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      segment_id: model.segment_id,
      segment_tag: model.segment_tag || "",
      model_tag: model.model_tag || "",
      sku: model.sku || "",
      features: model.features || [],
    });
    setImagePreviews({
      photo_main: model.photo_main,
      image_front: model.image_front,
      image_back: model.image_back,
      image_right: model.image_right,
      image_left: model.image_left,
      image_front_small_logo: model.image_front_small_logo || "",
      image_front_large_logo: model.image_front_large_logo || "",
      image_front_clean: model.image_front_clean || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Atualizar dados básicos
      const { error: updateError } = await supabase
        .from("shirt_models")
        .update({
          name: formData.name,
          sku: formData.sku || null,
          features: formData.features.length > 0 ? formData.features : null,
        })
        .eq("id", editingModel.id);

      if (updateError) throw updateError;

      // Upload apenas das novas imagens
      const imageUrls: Record<string, string> = {};
      const imageFieldsToCheck: (keyof typeof imageFiles)[] = [
        "photo_main",
        "image_front",
        "image_back",
        "image_right",
        "image_left",
        "image_front_small_logo",
        "image_front_large_logo",
        "image_front_clean"
      ];

      let progress = 0;
      const changedImages = imageFieldsToCheck.filter(field => imageFiles[field]);
      const progressStep = changedImages.length > 0 ? 100 / changedImages.length : 0;

      for (const field of imageFieldsToCheck) {
        const file = imageFiles[field];
        if (file) {
          imageUrls[field] = await uploadImage(editingModel.id, field, file);
          progress += progressStep;
          setUploadProgress(progress);
        }
      }

      // Atualizar URLs das imagens se houver
      if (Object.keys(imageUrls).length > 0) {
        const { error: imagesUpdateError } = await supabase
          .from("shirt_models")
          .update(imageUrls)
          .eq("id", editingModel.id);

        if (imagesUpdateError) throw imagesUpdateError;
      }

      toast.success("Modelo atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingModel(null);
      setFormData({ name: "", segment_id: "", segment_tag: "", model_tag: "", sku: "", features: [] });
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
      toast.error("Erro ao atualizar modelo: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredModels = models.filter((model) => {
    // Filtro por segment_id (via URL)
    if (segmentFilter && model.segment_id !== segmentFilter) {
      return false;
    }

    // Filtro por nome (busca case-insensitive)
    if (searchName.trim() !== "") {
      const searchLower = searchName.toLowerCase();
      if (!model.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Filtro por segment_tag
    if (filterSegmentTag !== "all" && model.segment_tag !== filterSegmentTag) {
      return false;
    }

    // Filtro por model_tag
    if (filterModelTag !== "all" && model.model_tag !== filterModelTag) {
      return false;
    }

    return true;
  });

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
                <Label htmlFor="segment_tag">Tag do Segmento*</Label>
                <Select
                  value={formData.segment_tag}
                  onValueChange={(value) => setFormData({ ...formData, segment_tag: value })}
                  disabled={uploading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tag do segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment: any) => (
                      <SelectItem key={segment.id} value={segment.segment_tag || ""}>
                        {segment.name} ({segment.segment_tag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model_tag">Tipo de Uniforme*</Label>
                <Select
                  value={formData.model_tag}
                  onValueChange={(value) => setFormData({ ...formData, model_tag: value })}
                  disabled={uploading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de uniforme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manga_longa">👕 Manga Longa</SelectItem>
                    <SelectItem value="ziper">🧥 Zíper</SelectItem>
                    <SelectItem value="manga_curta">👔 Manga Curta</SelectItem>
                    <SelectItem value="regata">🎽 Regata</SelectItem>
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

              {/* UPLOAD MÚLTIPLO INTELIGENTE */}
              <div className="space-y-3 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    🚀 Upload Rápido (Recomendado)
                  </Label>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Selecione todas as fotos de uma vez. O sistema irá distribuí-las automaticamente baseado nos nomes dos arquivos:
                </p>
                
                <div className="bg-background/50 p-3 rounded text-xs space-y-1 font-mono">
                  <div>✓ <strong>CAPA</strong> → Foto Principal</div>
                  <div>✓ <strong>FRENTE</strong> → Imagem Frente</div>
                  <div>✓ <strong>COSTAS</strong> → Imagem Costas</div>
                  <div>✓ <strong>LATERAL DIREITO</strong> → Lado Direito</div>
                  <div>✓ <strong>LATERAL ESQUERDO</strong> → Lado Esquerdo</div>
                  <p className="text-muted-foreground mt-2">
                    * Números no início são ignorados (ex: "01 FRENTE")
                  </p>
                </div>
                
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMultipleFilesUpload(e.target.files);
                    }
                  }}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>Selecione 5 imagens ou mais</span>
                </div>
              </div>

              {/* SEPARADOR */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ou upload individual
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Imagens Obrigatórias* (ou use o upload rápido acima)</Label>
                
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
                      />
                      {imagePreviews[field] && (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-20 border rounded flex-shrink-0">
                            <img
                              src={imagePreviews[field]}
                              alt={label}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                          {imageFiles[field] && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Auto
                            </span>
                          )}
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

      {/* Seção de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca por Nome */}
          <div className="space-y-2">
            <Label htmlFor="search-name">Buscar por Nome</Label>
            <Input
              id="search-name"
              placeholder="Digite o nome do modelo..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Filtros de Tags */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Filtro Segment Tag */}
            <div className="space-y-2">
              <Label htmlFor="filter-segment-tag">Tag do Segmento</Label>
              <Select
                value={filterSegmentTag}
                onValueChange={(value) => setFilterSegmentTag(value)}
              >
                <SelectTrigger id="filter-segment-tag">
                  <SelectValue placeholder="Todos os segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📁 Todos os Segmentos</SelectItem>
                  {availableSegmentTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      📁 {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Model Tag */}
            <div className="space-y-2">
              <Label htmlFor="filter-model-tag">Tipo de Uniforme</Label>
              <Select
                value={filterModelTag}
                onValueChange={(value) => setFilterModelTag(value)}
              >
                <SelectTrigger id="filter-model-tag">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🎽 Todos os Tipos</SelectItem>
                  {availableModelTags.map((tag) => {
                    const icon = 
                      tag === 'manga_longa' ? '👕' :
                      tag === 'ziper' ? '🧥' :
                      tag === 'manga_curta' ? '👔' :
                      tag === 'regata' ? '🎽' : '👕';
                    const label = 
                      tag === 'manga_longa' ? 'Manga Longa' :
                      tag === 'ziper' ? 'Zíper' :
                      tag === 'manga_curta' ? 'Manga Curta' :
                      tag === 'regata' ? 'Regata' : tag;
                    return (
                      <SelectItem key={tag} value={tag}>
                        {icon} {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão Limpar Filtros */}
          {(searchName !== "" || filterSegmentTag !== "all" || filterModelTag !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchName("");
                setFilterSegmentTag("all");
                setFilterModelTag("all");
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Todos os Filtros
            </Button>
          )}

          {/* Contador de Resultados */}
          <p className="text-sm text-muted-foreground">
            {filteredModels.length} {filteredModels.length === 1 ? "modelo encontrado" : "modelos encontrados"}
          </p>
        </CardContent>
      </Card>

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
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(model)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(model.id, model.segment_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="space-y-1">
                <div>{model.segments?.name || "Sem segmento"} • 5 imagens</div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {model.segment_tag && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">
                      📁 {model.segment_tag}
                    </span>
                  )}
                  {model.model_tag && (
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                      {model.model_tag === 'manga_longa' && '👕'}
                      {model.model_tag === 'ziper' && '🧥'}
                      {model.model_tag === 'manga_curta' && '👔'}
                      {model.model_tag === 'regata' && '🎽'}
                      {' '}
                      {model.model_tag === 'manga_longa' ? 'Manga Longa' :
                       model.model_tag === 'ziper' ? 'Zíper' :
                       model.model_tag === 'manga_curta' ? 'Manga Curta' :
                       model.model_tag === 'regata' ? 'Regata' : model.model_tag}
                    </span>
                  )}
                </div>
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

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Modelo de Camisa</DialogTitle>
            <DialogDescription>
              Atualize as informações e fotos do modelo. Você pode alterar apenas as fotos que desejar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <Label htmlFor="edit-name">Nome do Modelo*</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Regata Performance, Camisa Gola V"
                required
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
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
              <Label>Imagens Atuais (selecione para substituir)</Label>
              <p className="text-xs text-muted-foreground">
                As imagens atuais serão mantidas, a menos que você selecione novos arquivos
              </p>
              
              {[
                { field: "photo_main" as const, label: "Foto Principal" },
                { field: "image_front" as const, label: "Frente" },
                { field: "image_back" as const, label: "Costas" },
                { field: "image_right" as const, label: "Lado Direito" },
                { field: "image_left" as const, label: "Lado Esquerdo" },
                { field: "image_front_small_logo" as const, label: "Frente - Logo Pequena" },
                { field: "image_front_large_logo" as const, label: "Frente - Logo Grande" },
                { field: "image_front_clean" as const, label: "Frente - Limpa" },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`edit-${field}`} className="text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      id={`edit-${field}`}
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
                <Label>Atualizando...</Label>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingModel(null);
                  setFormData({ name: "", segment_id: "", segment_tag: "", model_tag: "", sku: "", features: [] });
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
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Atualizando..." : "Atualizar Modelo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Models;

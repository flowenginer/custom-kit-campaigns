import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon, X, Pencil, LayoutGrid, LayoutList, Grid3x3, Grid2x2, Folder, FolderOpen, ChevronDown, ChevronRight, User, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Segment {
  id: string;
  name: string;
  segment_tag?: string;
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

type ViewMode = 'list' | 'small' | 'medium' | 'large';

// Formata tag em nome legível (ex: "manga_longa" → "Manga Longa")
const formatTagToName = (tag: string): string => {
  if (!tag) return '';
  return tag
    .replace(/_+$/, '') // Remove underscores do final
    .replace(/_/g, ' ')  // Substitui underscores por espaços
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .filter(word => word.length > 0)
    .join(' ');
};

// Gera nome do modelo no formato: "Segmento Tipo Modelo XX"
const generateModelName = (
  segmentTag: string, 
  modelTag: string, 
  modelNumber: string
): string => {
  const segmentName = formatTagToName(segmentTag);
  const typeName = formatTagToName(modelTag);
  const numberPadded = modelNumber.padStart(2, '0');
  
  return `${segmentName} ${typeName} Modelo ${numberPadded}`;
};

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
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
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

  // Estados para Upload em Massa
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkGroupedModels, setBulkGroupedModels] = useState<Record<string, Record<string, File>>>({});
  const [bulkSegmentId, setBulkSegmentId] = useState("");
  const [bulkModelTag, setBulkModelTag] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkCurrentModel, setBulkCurrentModel] = useState("");
  const [bulkBasePrice, setBulkBasePrice] = useState("");
  const [bulkApplyDimensions, setBulkApplyDimensions] = useState(true);
  const [defaultDimensionPreset, setDefaultDimensionPreset] = useState<any>(null);
  
  // Constantes de tamanhos
  const ADULT_STANDARD_SIZES = ["PP", "P", "M", "G", "GG", "XG"];
  const ADULT_PLUS_SIZES = ["G1", "G2", "G3", "G4", "G5"];
  const INFANT_SIZES = ["1 ANO", "2 ANOS", "4 ANOS", "6 ANOS", "8 ANOS", "10 ANOS", "12 ANOS", "14 ANOS"];

  // Estados para criação automática de variações por gênero
  const [bulkCreateVariations, setBulkCreateVariations] = useState(false);
  const [genderConfigs, setGenderConfigs] = useState({
    masculino: {
      enabled: true,
      standardSizes: [...ADULT_STANDARD_SIZES],
      standardPrice: '',
      plusSizes: [...ADULT_PLUS_SIZES],
      plusPrice: ''
    },
    feminino: {
      enabled: true,
      standardSizes: [...ADULT_STANDARD_SIZES],
      standardPrice: '',
      plusSizes: [...ADULT_PLUS_SIZES],
      plusPrice: ''
    },
    infantil: {
      enabled: false,
      sizes: [...INFANT_SIZES],
      price: ''
    }
  });

  // Função para calcular total de variações
  const calculateTotalVariationsForBulk = () => {
    let total = 0;
    if (genderConfigs.masculino.enabled) {
      total += genderConfigs.masculino.standardSizes.length + genderConfigs.masculino.plusSizes.length;
    }
    if (genderConfigs.feminino.enabled) {
      total += genderConfigs.feminino.standardSizes.length + genderConfigs.feminino.plusSizes.length;
    }
    if (genderConfigs.infantil.enabled) {
      total += genderConfigs.infantil.sizes.length;
    }
    return total;
  };

  // Helpers para manipular genderConfigs
  const toggleGenderSize = (gender: 'masculino' | 'feminino', sizeType: 'standard' | 'plus', size: string) => {
    const key = sizeType === 'standard' ? 'standardSizes' : 'plusSizes';
    setGenderConfigs(prev => ({
      ...prev,
      [gender]: {
        ...prev[gender],
        [key]: prev[gender][key].includes(size)
          ? prev[gender][key].filter((s: string) => s !== size)
          : [...prev[gender][key], size]
      }
    }));
  };

  const toggleInfantSize = (size: string) => {
    setGenderConfigs(prev => ({
      ...prev,
      infantil: {
        ...prev.infantil,
        sizes: prev.infantil.sizes.includes(size)
          ? prev.infantil.sizes.filter(s => s !== size)
          : [...prev.infantil.sizes, size]
      }
    }));
  };

  // Estados para seleção múltipla
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const refreshData = useCallback(async () => {
    await loadModels();
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  useEffect(() => {
    loadModels();
    loadSegments();
    loadTags();
    
    // Load view mode preference
    const savedView = localStorage.getItem('models-view-mode');
    if (savedView) setViewMode(savedView as ViewMode);
  }, []);

  // Buscar dimension_presets quando bulkModelTag mudar
  useEffect(() => {
    if (!bulkModelTag) {
      setDefaultDimensionPreset(null);
      return;
    }
    
    const loadDimensionPreset = async () => {
      const { data: preset } = await supabase
        .from("dimension_presets")
        .select("*")
        .eq("model_tag", bulkModelTag)
        .eq("is_default", true)
        .maybeSingle();
      
      setDefaultDimensionPreset(preset || null);
    };
    
    loadDimensionPreset();
  }, [bulkModelTag]);

  const setAndSaveViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('models-view-mode', mode);
  };

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

  // Extrai o número do modelo do nome do arquivo
  // Ex: "01 CAPA.jpg" -> "01", "02 FRENTE.png" -> "02"
  const extractModelNumber = (filename: string): string | null => {
    const match = filename.match(/^(\d+)/);
    return match ? match[1] : null;
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

  // Gerar SKU automático
  const generateSKU = (modelTag: string, segmentTag: string, modelNumber: string): string => {
    const typeAbbrev: Record<string, string> = {
      'manga_curta': 'MC',
      'manga_longa': 'ML',
      'regata': 'REG',
      'ziper': 'ZIP',
      'ziper_manga_longa': 'ZIP-ML',
    };
    
    const typeCode = typeAbbrev[modelTag] || modelTag.substring(0, 3).toUpperCase();
    const segmentCode = segmentTag.substring(0, 4).toUpperCase();
    const numberPadded = modelNumber.padStart(3, '0');
    
    return `${typeCode}-${segmentCode}-${numberPadded}`;
  };

  const processBulkFiles = (files: FileList) => {
    const grouped: Record<string, Record<string, File>> = {};
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      // Validar tipo
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name} não é uma imagem`);
        return;
      }
      
      // Validar tamanho
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name} é muito grande (máx. 5MB)`);
        return;
      }
      
      // Extrair número do modelo
      const modelNumber = extractModelNumber(file.name);
      if (!modelNumber) {
        errors.push(`${file.name} não tem número no início`);
        return;
      }
      
      // Detectar tipo de imagem
      const imageType = detectImageType(file.name);
      if (!imageType) {
        errors.push(`${file.name} não foi reconhecido (use: CAPA, FRENTE, COSTAS, etc.)`);
        return;
      }
      
      // Agrupar por modelo
      if (!grouped[modelNumber]) {
        grouped[modelNumber] = {};
      }
      
      grouped[modelNumber][imageType] = file;
    });
    
    // Validar grupos (cada modelo precisa ter as 5 imagens obrigatórias)
    const requiredImages = ['photo_main', 'image_front', 'image_back', 'image_right', 'image_left'];
    const validGroups: Record<string, Record<string, File>> = {};
    
    Object.entries(grouped).forEach(([modelNumber, images]) => {
      const missingImages = requiredImages.filter(img => !images[img]);
      
      if (missingImages.length > 0) {
        errors.push(`Modelo ${modelNumber}: faltam imagens (${missingImages.join(', ')})`);
      } else {
        validGroups[modelNumber] = images;
      }
    });
    
    // Mostrar erros se houver
    if (errors.length > 0) {
      toast.error(
        <div>
          <p className="font-bold">Alguns arquivos têm problemas:</p>
          <ul className="text-xs mt-2 space-y-1">
            {errors.slice(0, 5).map((err, i) => <li key={i}>• {err}</li>)}
            {errors.length > 5 && <li>... e mais {errors.length - 5}</li>}
          </ul>
        </div>,
        { duration: 8000 }
      );
    }
    
    // Atualizar estados
    setBulkFiles(Array.from(files));
    setBulkGroupedModels(validGroups);
    
    // Feedback de sucesso
    const modelCount = Object.keys(validGroups).length;
    if (modelCount > 0) {
      toast.success(`✅ ${modelCount} modelo(s) detectado(s) e pronto(s) para upload!`);
    }
  };

  const handleBulkUpload = async () => {
    if (Object.keys(bulkGroupedModels).length === 0) {
      toast.error("Nenhum modelo válido para criar");
      return;
    }
    
    if (!bulkSegmentId || !bulkModelTag) {
      toast.error("Selecione o Segmento e o Tipo de Uniforme");
      return;
    }
    
    setBulkUploading(true);
    setBulkProgress(0);
    
    const modelNumbers = Object.keys(bulkGroupedModels).sort();
    const totalModels = modelNumbers.length;
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (let i = 0; i < modelNumbers.length; i++) {
        const modelNumber = modelNumbers[i];
        const images = bulkGroupedModels[modelNumber];
        
        // Recuperar segment_tag a partir do ID selecionado
        const selectedSegment = segments.find((s: any) => s.id === bulkSegmentId);
        const segmentTag = selectedSegment?.segment_tag || "";
        
        // Gerar nome do modelo inteligente
        const modelName = generateModelName(segmentTag, bulkModelTag, modelNumber);
        
        setBulkCurrentModel(modelName);
        
        try {
          // Gerar SKU automático
          const generatedSKU = generateSKU(bulkModelTag, segmentTag, modelNumber);
          
          // Preparar dados do modelo
          const modelData: any = {
            name: modelName,
            segment_tag: segmentTag,
            model_tag: bulkModelTag,
            segment_id: bulkSegmentId,
            sku: generatedSKU,
            photo_main: "temp",
            image_front: "temp",
            image_back: "temp",
            image_right: "temp",
            image_left: "temp",
          };
          
          // Adicionar preço base se fornecido
          if (bulkBasePrice && parseFloat(bulkBasePrice) > 0) {
            modelData.base_price = parseFloat(bulkBasePrice);
          }
          
          // Aplicar dimensões padrão se checkbox marcado
          if (bulkApplyDimensions && defaultDimensionPreset) {
            modelData.peso = defaultDimensionPreset.peso;
            modelData.altura = defaultDimensionPreset.altura;
            modelData.largura = defaultDimensionPreset.largura;
            modelData.profundidade = defaultDimensionPreset.profundidade;
            modelData.volumes = defaultDimensionPreset.volumes;
          }
          
          // Criar modelo no banco
          const { data: model, error: insertError } = await supabase
            .from("shirt_models")
            .insert(modelData)
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          // Upload das imagens
          const tempSegmentId = bulkSegmentId;
          const imageUrls: Record<string, string> = {};
          const requiredImages = ['photo_main', 'image_front', 'image_back', 'image_right', 'image_left'];
          
          for (const field of requiredImages) {
            if (images[field]) {
              const file = images[field];
              const fileExt = file.name.split('.').pop();
              const filePath = `${tempSegmentId}/${model.id}/${field}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from("shirt-models-images")
                .upload(filePath, file, { upsert: true });

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from("shirt-models-images")
                .getPublicUrl(filePath);

              imageUrls[field] = urlData.publicUrl;
            }
          }
          
          // Upload das variações opcionais (se existirem)
          const optionalImages = ['image_front_small_logo', 'image_front_large_logo', 'image_front_clean'];
          for (const field of optionalImages) {
            if (images[field]) {
              const file = images[field];
              const fileExt = file.name.split('.').pop();
              const filePath = `${tempSegmentId}/${model.id}/${field}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from("shirt-models-images")
                .upload(filePath, file, { upsert: true });

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from("shirt-models-images")
                .getPublicUrl(filePath);

              imageUrls[field] = urlData.publicUrl;
            }
          }
          
          // Atualizar modelo com URLs das imagens
          const { error: updateError } = await supabase
            .from("shirt_models")
            .update(imageUrls)
            .eq("id", model.id);
          
          if (updateError) throw updateError;
          
          // Criar variações automáticas se habilitado
          if (bulkCreateVariations) {
            const variationsToCreate: any[] = [];
            
            // Masculino
            if (genderConfigs.masculino.enabled) {
              // Tamanhos padrão
              genderConfigs.masculino.standardSizes.forEach(size => {
                variationsToCreate.push({
                  model_id: model.id,
                  size,
                  gender: 'masculino',
                  price_adjustment: genderConfigs.masculino.standardPrice ? parseFloat(genderConfigs.masculino.standardPrice) : 0,
                  is_active: true,
                  stock_quantity: 0
                });
              });
              // Tamanhos plus
              genderConfigs.masculino.plusSizes.forEach(size => {
                variationsToCreate.push({
                  model_id: model.id,
                  size,
                  gender: 'masculino',
                  price_adjustment: genderConfigs.masculino.plusPrice ? parseFloat(genderConfigs.masculino.plusPrice) : 0,
                  is_active: true,
                  stock_quantity: 0
                });
              });
            }
            
            // Feminino
            if (genderConfigs.feminino.enabled) {
              // Tamanhos padrão
              genderConfigs.feminino.standardSizes.forEach(size => {
                variationsToCreate.push({
                  model_id: model.id,
                  size,
                  gender: 'feminino',
                  price_adjustment: genderConfigs.feminino.standardPrice ? parseFloat(genderConfigs.feminino.standardPrice) : 0,
                  is_active: true,
                  stock_quantity: 0
                });
              });
              // Tamanhos plus
              genderConfigs.feminino.plusSizes.forEach(size => {
                variationsToCreate.push({
                  model_id: model.id,
                  size,
                  gender: 'feminino',
                  price_adjustment: genderConfigs.feminino.plusPrice ? parseFloat(genderConfigs.feminino.plusPrice) : 0,
                  is_active: true,
                  stock_quantity: 0
                });
              });
            }
            
            // Infantil
            if (genderConfigs.infantil.enabled) {
              genderConfigs.infantil.sizes.forEach(size => {
                variationsToCreate.push({
                  model_id: model.id,
                  size,
                  gender: 'infantil',
                  price_adjustment: genderConfigs.infantil.price ? parseFloat(genderConfigs.infantil.price) : 0,
                  is_active: true,
                  stock_quantity: 0
                });
              });
            }
            
            if (variationsToCreate.length > 0) {
              const { error: variationsError } = await supabase
                .from('shirt_model_variations')
                .insert(variationsToCreate);
              
              if (variationsError) {
                console.error(`Erro ao criar variações do modelo ${modelNumber}:`, variationsError);
              }
            }
          }
          
          successCount++;
        } catch (error: any) {
          console.error(`Erro ao criar modelo ${modelNumber}:`, error);
          errorCount++;
        }
        
        // Atualizar progresso
        setBulkProgress(((i + 1) / totalModels) * 100);
      }
      
      // Feedback final
      if (successCount > 0) {
        const totalVariations = bulkCreateVariations ? calculateTotalVariationsForBulk() : 0;
        const totalCreated = successCount * totalVariations;
        const message = bulkCreateVariations 
          ? `🎉 ${successCount} modelo(s) criado(s) com ${totalCreated} variações!`
          : `🎉 ${successCount} modelo(s) criado(s) com sucesso!`;
        toast.success(message);
        loadModels();
      }
      
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} modelo(s) falharam`);
      }
      
      // Fechar diálogo e resetar
      setIsBulkUploadDialogOpen(false);
      setBulkFiles([]);
      setBulkGroupedModels({});
      setBulkSegmentId("");
      setBulkModelTag("");
      setBulkBasePrice("");
      setBulkApplyDimensions(true);
      setBulkCreateVariations(false);
      setGenderConfigs({
        masculino: { enabled: true, standardSizes: [...ADULT_STANDARD_SIZES], standardPrice: '', plusSizes: [...ADULT_PLUS_SIZES], plusPrice: '' },
        feminino: { enabled: true, standardSizes: [...ADULT_STANDARD_SIZES], standardPrice: '', plusSizes: [...ADULT_PLUS_SIZES], plusPrice: '' },
        infantil: { enabled: false, sizes: [...INFANT_SIZES], price: '' }
      });
      
    } catch (error: any) {
      toast.error("Erro no upload em massa: " + error.message);
    } finally {
      setBulkUploading(false);
      setBulkProgress(0);
      setBulkCurrentModel("");
    }
  };

  // Alternar seleção de um modelo individual
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  // Selecionar/Desselecionar todos os modelos filtrados
  const toggleSelectAll = () => {
    if (selectedModels.length === filteredModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(filteredModels.map(m => m.id));
    }
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedModels([]);
  };

  const handleBulkDelete = async () => {
    if (selectedModels.length === 0) {
      toast.error("Nenhum modelo selecionado");
      return;
    }

    // Verificar se há pedidos associados a QUALQUER um dos modelos
    let totalOrders = 0;
    for (const modelId of selectedModels) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', modelId);
      
      if (count) totalOrders += count;
    }

    // Montar mensagem de confirmação
    let confirmMessage = `Tem certeza que deseja excluir ${selectedModels.length} modelo(s)?`;
    
    if (totalOrders > 0) {
      confirmMessage = `⚠️ ATENÇÃO: Os modelos selecionados possuem ${totalOrders} pedido(s) associado(s).\n\n` +
                       `Tem certeza que deseja excluir ${selectedModels.length} modelo(s) mesmo assim?\n\n` +
                       `Esta ação NÃO pode ser desfeita!`;
    }

    if (!confirm(confirmMessage)) {
      setIsDeleteDialogOpen(false);
      return;
    }

    // Iniciar exclusão
    setUploading(true);
    setUploadProgress(0);
    
    let successCount = 0;
    let errorCount = 0;
    const total = selectedModels.length;

    try {
      for (let i = 0; i < selectedModels.length; i++) {
        const modelId = selectedModels[i];
        const model = models.find(m => m.id === modelId);
        
        if (!model) {
          errorCount++;
          continue;
        }

        try {
          // Excluir imagens do storage
          const imageFields = ["photo_main", "image_front", "image_back", "image_right", "image_left"];
          const filesToDelete = imageFields.map(field => 
            `${model.segment_id}/${modelId}/${field}.jpg`
          );
          
          await supabase.storage
            .from("shirt-models-images")
            .remove(filesToDelete);

          // Excluir modelo do banco
          const { error } = await supabase
            .from("shirt_models")
            .delete()
            .eq("id", modelId);
          
          if (error) throw error;
          
          successCount++;
        } catch (error) {
          console.error(`Erro ao excluir modelo ${modelId}:`, error);
          errorCount++;
        }

        // Atualizar progresso
        setUploadProgress(((i + 1) / total) * 100);
      }

      // Feedback final
      if (successCount > 0) {
        toast.success(`✅ ${successCount} modelo(s) excluído(s) com sucesso!`);
        loadModels();
      }
      
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} modelo(s) falharam na exclusão`);
      }

      // Limpar seleção e fechar dialog
      clearSelection();
      setIsDeleteDialogOpen(false);
      
    } catch (error: any) {
      toast.error("Erro ao excluir modelos: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const groupedModels = useMemo(() => {
    const groups: Record<string, ShirtModel[]> = {};
    
    filteredModels.forEach(model => {
      const folder = model.segment_tag || 'sem_categoria';
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(model);
    });
    
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredModels]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(f => f !== folderId)
        : [...prev, folderId]
    );
  };

  const expandAllFolders = () => {
    setExpandedFolders(groupedModels.map(([folder]) => folder));
  };

  const collapseAllFolders = () => {
    setExpandedFolders([]);
  };

  const renderListView = (modelsToRender: ShirtModel[]) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedModels.length === modelsToRender.length && modelsToRender.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[80px]">Imagem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Segmento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modelsToRender.map((model) => (
            <TableRow 
              key={model.id}
              className={selectedModels.includes(model.id) ? "bg-blue-50" : ""}
            >
              <TableCell>
                <Checkbox
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={() => toggleModelSelection(model.id)}
                />
              </TableCell>
              <TableCell>
                <div className="w-16 h-16 rounded overflow-hidden">
                  <img
                    src={model.photo_main}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </TableCell>
              <TableCell className="font-medium">{model.name}</TableCell>
              <TableCell>
                {model.segment_tag && (
                  <Badge variant="outline">📁 {model.segment_tag}</Badge>
                )}
              </TableCell>
              <TableCell>
                {model.model_tag && (
                  <Badge variant="secondary">
                    {model.model_tag === 'manga_longa' && '👕 Manga Longa'}
                    {model.model_tag === 'ziper' && '🧥 Zíper'}
                    {model.model_tag === 'manga_curta' && '👔 Manga Curta'}
                    {model.model_tag === 'regata' && '🎽 Regata'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const renderSmallView = (modelsToRender: ShirtModel[]) => (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {modelsToRender.map((model) => (
        <Card 
          key={model.id} 
          className={`overflow-hidden hover:shadow-md transition-shadow ${
            selectedModels.includes(model.id) ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="aspect-square bg-muted relative group">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedModels.includes(model.id)}
                onCheckedChange={() => toggleModelSelection(model.id)}
                className="bg-white shadow-md"
              />
            </div>
            <img
              src={model.photo_main}
              alt={model.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => openEditDialog(model)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => handleDelete(model.id, model.segment_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-2">
            <p className="text-xs font-medium truncate">{model.name}</p>
            {model.model_tag && (
              <p className="text-[10px] text-muted-foreground truncate">
                {model.model_tag === 'manga_longa' && '👕'}
                {model.model_tag === 'ziper' && '🧥'}
                {model.model_tag === 'manga_curta' && '👔'}
                {model.model_tag === 'regata' && '🎽'}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMediumView = (modelsToRender: ShirtModel[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {modelsToRender.map((model) => (
        <Card 
          key={model.id} 
          className={`overflow-hidden ${
            selectedModels.includes(model.id) ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="aspect-square bg-muted relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedModels.includes(model.id)}
                onCheckedChange={() => toggleModelSelection(model.id)}
                className="bg-white shadow-md"
              />
            </div>
            <img
              src={model.photo_main}
              alt={model.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardHeader className="p-4">
            <CardTitle className="flex items-start justify-between text-base">
              <span className="line-clamp-1">{model.name}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(model)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(model.id, model.segment_id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="space-y-1 text-xs">
              <div>{model.segments?.name || "Sem segmento"} • 5 imagens</div>
              <div className="flex gap-1 flex-wrap mt-2">
                {model.segment_tag && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    📁 {model.segment_tag}
                  </Badge>
                )}
                {model.model_tag && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {model.model_tag === 'manga_longa' && '👕'}
                    {model.model_tag === 'ziper' && '🧥'}
                    {model.model_tag === 'manga_curta' && '👔'}
                    {model.model_tag === 'regata' && '🎽'}
                  </Badge>
                )}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const renderLargeView = (modelsToRender: ShirtModel[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {modelsToRender.map((model) => (
        <Card 
          key={model.id} 
          className={`overflow-hidden ${
            selectedModels.includes(model.id) ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="aspect-video bg-muted relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedModels.includes(model.id)}
                onCheckedChange={() => toggleModelSelection(model.id)}
                className="bg-white shadow-md"
              />
            </div>
            <img
              src={model.photo_main}
              alt={model.name}
              className="w-full h-full object-contain"
            />
          </div>
          <CardHeader>
            <CardTitle className="flex items-start justify-between">
              <span>{model.name}</span>
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
            <CardDescription className="space-y-3">
              <div className="flex items-center gap-2">
                <span>{model.segments?.name || "Sem segmento"}</span>
                <span>•</span>
                <span>5 imagens</span>
                {model.sku && (
                  <>
                    <span>•</span>
                    <span>SKU: {model.sku}</span>
                  </>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {model.segment_tag && (
                  <Badge variant="outline">
                    📁 {model.segment_tag}
                  </Badge>
                )}
                {model.model_tag && (
                  <Badge variant="secondary">
                    {model.model_tag === 'manga_longa' && '👕 Manga Longa'}
                    {model.model_tag === 'ziper' && '🧥 Zíper'}
                    {model.model_tag === 'manga_curta' && '👔 Manga Curta'}
                    {model.model_tag === 'regata' && '🎽 Regata'}
                  </Badge>
                )}
              </div>

              {model.features && model.features.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Características:</p>
                  <div className="flex flex-wrap gap-1">
                    {model.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Camisa</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os modelos disponíveis para suas campanhas
          </p>
        </div>

        {/* Modo de Visualização e Botões */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
          
          <div className="flex gap-1 bg-muted/30 p-1.5 rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('list')}
              className="h-8"
            >
              <LayoutList className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'small' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('small')}
              className="h-8"
            >
              <Grid3x3 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Pequeno</span>
            </Button>
            <Button
              variant={viewMode === 'medium' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('medium')}
              className="h-8"
            >
              <Grid2x2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Médio</span>
            </Button>
            <Button
              variant={viewMode === 'large' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAndSaveViewMode('large')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Grande</span>
            </Button>
          </div>

          <Button onClick={expandAllFolders} variant="outline" size="sm">
            <FolderOpen className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Expandir Tudo</span>
          </Button>
          <Button onClick={collapseAllFolders} variant="outline" size="sm">
            <Folder className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Fechar Tudo</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Modelo
              </Button>
            </DialogTrigger>
          </Dialog>

          <Button 
            variant="secondary"
            onClick={() => setIsBulkUploadDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            🚀 Upload em Massa
          </Button>
        </div>
      </div>

      {/* Barra de Seleção Múltipla */}
      {selectedModels.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-sm px-3 py-1">
                  {selectedModels.length} selecionado(s)
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Limpar Seleção
                </Button>
              </div>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Selecionados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de Seleção e Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedModels.length === filteredModels.length && filteredModels.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectAll}
            disabled={filteredModels.length === 0}
          >
            {selectedModels.length === filteredModels.length && filteredModels.length > 0
              ? "✓ Desselecionar Todos"
              : "☐ Selecionar Todos"
            }
          </Button>
          
          {selectedModels.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({selectedModels.length} de {filteredModels.length})
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nome..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="sm:w-64"
          />
          <Select value={filterSegmentTag} onValueChange={setFilterSegmentTag}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filtrar por segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Segmentos</SelectItem>
              {availableSegmentTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  📁 {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterModelTag} onValueChange={setFilterModelTag}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="manga_longa">👕 Manga Longa</SelectItem>
              <SelectItem value="ziper">🧥 Zíper</SelectItem>
              <SelectItem value="manga_curta">👔 Manga Curta</SelectItem>
              <SelectItem value="regata">🎽 Regata</SelectItem>
            </SelectContent>
          </Select>
          {segmentFilter && (
            <Button variant="outline" onClick={() => navigate('/admin/models')}>
              Limpar Filtro de Segmento
            </Button>
          )}
        </div>
      </div>

      {/* Mostrar qual segmento está filtrado */}
      {filteredSegment && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm">
            Filtrando por segmento: <strong>{filteredSegment.name}</strong>
          </p>
        </div>
      )}

      {/* Lista de Modelos */}
      {filteredModels.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">Nenhum modelo encontrado</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Modelo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedModels.map(([folderName, folderModels]) => (
            <Collapsible
              key={folderName}
              open={expandedFolders.includes(folderName)}
              onOpenChange={() => toggleFolder(folderName)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  {expandedFolders.includes(folderName) ? (
                    <>
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <ChevronDown className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Folder className="h-5 w-5 text-muted-foreground" />
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                  <span className="font-medium capitalize">
                    {folderName.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {folderModels.length} modelo{folderModels.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3 ml-4">
                {viewMode === 'list' && renderListView(folderModels)}
                {viewMode === 'small' && renderSmallView(folderModels)}
                {viewMode === 'medium' && renderMediumView(folderModels)}
                {viewMode === 'large' && renderLargeView(folderModels)}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Dialog: Novo Modelo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            features: formData.features.filter((_, i) => i !== index)
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Imagens do Modelo*</Label>
                <div className="text-sm text-muted-foreground">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const files = e.target?.files;
                        if (files && files.length > 0) {
                          handleMultipleFilesUpload(files);
                        }
                      };
                      input.click();
                    }}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Rápido (Múltiplas Imagens)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'photo_main' as const, label: '📷 Foto Principal (CAPA)' },
                  { field: 'image_front' as const, label: '👕 Frente (FRENTE)' },
                  { field: 'image_back' as const, label: '🔙 Costas (COSTAS)' },
                  { field: 'image_right' as const, label: '➡️ Lateral Direita' },
                  { field: 'image_left' as const, label: '⬅️ Lateral Esquerda' },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{label}*</Label>
                    <Input
                      id={field}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {imagePreviews[field] && (
                      <div className="relative w-full h-32 rounded overflow-hidden border">
                        <img
                          src={imagePreviews[field]}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => {
                            setImageFiles(prev => ({ ...prev, [field]: null }));
                            setImagePreviews(prev => ({ ...prev, [field]: "" }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Variações Opcionais da Frente</Label>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { field: 'image_front_small_logo' as const, label: '🔹 Logo Pequeno' },
                    { field: 'image_front_large_logo' as const, label: '🔷 Logo Grande' },
                    { field: 'image_front_clean' as const, label: '✨ Limpa' },
                  ].map(({ field, label }) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="text-xs">{label}</Label>
                      <Input
                        id={field}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                        disabled={uploading}
                        className="cursor-pointer text-xs"
                      />
                      {imagePreviews[field] && (
                        <div className="relative w-full h-24 rounded overflow-hidden border">
                          <img
                            src={imagePreviews[field]}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5"
                            onClick={() => {
                              setImageFiles(prev => ({ ...prev, [field]: null }));
                              setImagePreviews(prev => ({ ...prev, [field]: "" }));
                            }}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fazendo upload...</Label>
                  <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={uploading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Criando..." : "Criar Modelo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Upload em Massa */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🚀 Upload em Massa de Modelos</DialogTitle>
            <DialogDescription>
              Selecione TODOS os arquivos de uma vez. O sistema vai detectar automaticamente os modelos baseado nos números dos arquivos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Instruções */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">📋 Como usar:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>1. Nomeie seus arquivos com números no início: <code className="bg-muted px-1 py-0.5 rounded">01 CAPA.jpg</code>, <code className="bg-muted px-1 py-0.5 rounded">01 FRENTE.jpg</code>, etc.</li>
                  <li>2. Selecione TODOS os arquivos de uma vez (pode ser 20, 50, 100...)</li>
                  <li>3. O sistema agrupa automaticamente por número</li>
                  <li>4. Cada modelo precisa ter: CAPA, FRENTE, COSTAS, LATERAL DIREITO, LATERAL ESQUERDO</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Upload de Arquivos */}
            <div className="space-y-3">
              <Label>Selecionar Arquivos:</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processBulkFiles(e.target.files);
                  }
                }}
                disabled={bulkUploading}
                className="cursor-pointer"
              />
              {bulkFiles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {bulkFiles.length} arquivo(s) selecionado(s)
                </p>
              )}
            </div>
            
            {/* Preview dos Modelos Detectados */}
            {Object.keys(bulkGroupedModels).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    ✅ {Object.keys(bulkGroupedModels).length} Modelo(s) Detectado(s)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto">
                    {Object.entries(bulkGroupedModels)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([modelNumber, images]) => (
                        <div key={modelNumber} className="border rounded p-2 text-center">
                          <p className="font-bold text-sm">Modelo {modelNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {Object.keys(images).length} imagem(ns)
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Configurações do Lote */}
            {Object.keys(bulkGroupedModels).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">⚙️ Configurações do Lote</CardTitle>
                  <p className="text-xs text-muted-foreground">Configurações aplicadas a todos os modelos</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Grid com 3 campos principais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tag do Segmento */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1">
                        Tag do Segmento
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={bulkSegmentId}
                        onValueChange={setBulkSegmentId}
                        disabled={bulkUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[100]">
                          {segments.map((segment: any) => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Tipo de Uniforme */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1">
                        Tipo de Uniforme
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={bulkModelTag}
                        onValueChange={setBulkModelTag}
                        disabled={bulkUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manga_longa">👕 Manga Longa</SelectItem>
                          <SelectItem value="ziper">🧥 Zíper</SelectItem>
                          <SelectItem value="manga_curta">👔 Manga Curta</SelectItem>
                          <SelectItem value="regata">🎽 Regata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Preço Base */}
                    <div className="space-y-2">
                      <Label htmlFor="bulkBasePrice" className="text-sm">
                        Preço Base (R$)
                      </Label>
                      <Input
                        id="bulkBasePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkBasePrice}
                        onChange={(e) => setBulkBasePrice(e.target.value)}
                        placeholder="39.90"
                        disabled={bulkUploading}
                      />
                    </div>
                  </div>

                  <Separator />
                  
                  {/* Opções Adicionais */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Opções Adicionais</h4>
                    
                    {/* Aplicar Dimensões Padrão */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="bulkApplyDimensions"
                        checked={bulkApplyDimensions}
                        onCheckedChange={(checked) => setBulkApplyDimensions(checked as boolean)}
                        disabled={bulkUploading || !defaultDimensionPreset}
                      />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="bulkApplyDimensions" className="cursor-pointer text-sm">
                          Aplicar dimensões padrão automaticamente
                        </Label>
                        {defaultDimensionPreset && bulkModelTag && (
                          <p className="text-xs text-muted-foreground">
                            {bulkModelTag}: {defaultDimensionPreset.peso}kg • 
                            {defaultDimensionPreset.altura}×{defaultDimensionPreset.largura}×{defaultDimensionPreset.profundidade}cm
                          </p>
                        )}
                        {!defaultDimensionPreset && bulkModelTag && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Nenhum preset encontrado para este tipo
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Criar Variações Automáticas */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="bulkCreateVariations"
                        checked={bulkCreateVariations}
                        onCheckedChange={(checked) => setBulkCreateVariations(checked as boolean)}
                        disabled={bulkUploading}
                      />
                      <div className="flex-1 space-y-4">
                        <Label htmlFor="bulkCreateVariations" className="cursor-pointer text-sm font-medium">
                          ✨ Criar variações automáticas
                        </Label>
                        
                        {bulkCreateVariations && (
                          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                            {/* MASCULINO */}
                            <Collapsible defaultOpen={genderConfigs.masculino.enabled}>
                              <div className="flex items-center justify-between">
                                <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                                  <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                  <User className="h-4 w-4" />
                                  <span className="text-sm font-medium">Masculino</span>
                                </CollapsibleTrigger>
                                <Switch
                                  checked={genderConfigs.masculino.enabled}
                                  onCheckedChange={(checked) => setGenderConfigs(prev => ({
                                    ...prev,
                                    masculino: { ...prev.masculino, enabled: checked }
                                  }))}
                                  disabled={bulkUploading}
                                />
                              </div>
                              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                                {/* Tamanhos Padrão */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tamanhos Padrão (PP-XG)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={genderConfigs.masculino.standardPrice}
                                      onChange={(e) => setGenderConfigs(prev => ({
                                        ...prev,
                                        masculino: { ...prev.masculino, standardPrice: e.target.value }
                                      }))}
                                      placeholder="R$ Preço"
                                      className="h-7 w-24 text-xs"
                                      disabled={bulkUploading}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ADULT_STANDARD_SIZES.map((size) => (
                                      <Badge
                                        key={size}
                                        variant={genderConfigs.masculino.standardSizes.includes(size) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleGenderSize('masculino', 'standard', size)}
                                      >
                                        {size}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                {/* Tamanhos Plus */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tamanhos Plus (G1-G5)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={genderConfigs.masculino.plusPrice}
                                      onChange={(e) => setGenderConfigs(prev => ({
                                        ...prev,
                                        masculino: { ...prev.masculino, plusPrice: e.target.value }
                                      }))}
                                      placeholder="R$ Preço"
                                      className="h-7 w-24 text-xs"
                                      disabled={bulkUploading}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ADULT_PLUS_SIZES.map((size) => (
                                      <Badge
                                        key={size}
                                        variant={genderConfigs.masculino.plusSizes.includes(size) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleGenderSize('masculino', 'plus', size)}
                                      >
                                        {size}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>

                            <Separator />

                            {/* FEMININO */}
                            <Collapsible defaultOpen={genderConfigs.feminino.enabled}>
                              <div className="flex items-center justify-between">
                                <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                                  <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                  <Users className="h-4 w-4" />
                                  <span className="text-sm font-medium">Feminino</span>
                                </CollapsibleTrigger>
                                <Switch
                                  checked={genderConfigs.feminino.enabled}
                                  onCheckedChange={(checked) => setGenderConfigs(prev => ({
                                    ...prev,
                                    feminino: { ...prev.feminino, enabled: checked }
                                  }))}
                                  disabled={bulkUploading}
                                />
                              </div>
                              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                                {/* Tamanhos Padrão */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tamanhos Padrão (PP-XG)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={genderConfigs.feminino.standardPrice}
                                      onChange={(e) => setGenderConfigs(prev => ({
                                        ...prev,
                                        feminino: { ...prev.feminino, standardPrice: e.target.value }
                                      }))}
                                      placeholder="R$ Preço"
                                      className="h-7 w-24 text-xs"
                                      disabled={bulkUploading}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ADULT_STANDARD_SIZES.map((size) => (
                                      <Badge
                                        key={size}
                                        variant={genderConfigs.feminino.standardSizes.includes(size) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleGenderSize('feminino', 'standard', size)}
                                      >
                                        {size}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                {/* Tamanhos Plus */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tamanhos Plus (G1-G5)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={genderConfigs.feminino.plusPrice}
                                      onChange={(e) => setGenderConfigs(prev => ({
                                        ...prev,
                                        feminino: { ...prev.feminino, plusPrice: e.target.value }
                                      }))}
                                      placeholder="R$ Preço"
                                      className="h-7 w-24 text-xs"
                                      disabled={bulkUploading}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ADULT_PLUS_SIZES.map((size) => (
                                      <Badge
                                        key={size}
                                        variant={genderConfigs.feminino.plusSizes.includes(size) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleGenderSize('feminino', 'plus', size)}
                                      >
                                        {size}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>

                            <Separator />

                            {/* INFANTIL */}
                            <Collapsible defaultOpen={genderConfigs.infantil.enabled}>
                              <div className="flex items-center justify-between">
                                <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                                  <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                  <span className="text-sm">👶</span>
                                  <span className="text-sm font-medium">Infantil</span>
                                </CollapsibleTrigger>
                                <Switch
                                  checked={genderConfigs.infantil.enabled}
                                  onCheckedChange={(checked) => setGenderConfigs(prev => ({
                                    ...prev,
                                    infantil: { ...prev.infantil, enabled: checked }
                                  }))}
                                  disabled={bulkUploading}
                                />
                              </div>
                              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Tamanhos Infantis</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={genderConfigs.infantil.price}
                                      onChange={(e) => setGenderConfigs(prev => ({
                                        ...prev,
                                        infantil: { ...prev.infantil, price: e.target.value }
                                      }))}
                                      placeholder="R$ Preço"
                                      className="h-7 w-24 text-xs"
                                      disabled={bulkUploading}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {INFANT_SIZES.map((size) => (
                                      <Badge
                                        key={size}
                                        variant={genderConfigs.infantil.sizes.includes(size) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleInfantSize(size)}
                                      >
                                        {size}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>

                            {/* Preview */}
                            {calculateTotalVariationsForBulk() > 0 && (
                              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2 mt-4">
                                <p className="text-xs text-primary font-medium">📊 Prévia das Variações:</p>
                                {genderConfigs.masculino.enabled && (
                                  <p className="text-xs text-muted-foreground">
                                    • 👤 Masculino: {genderConfigs.masculino.standardSizes.length} padrão 
                                    {genderConfigs.masculino.standardPrice && ` (R$ ${genderConfigs.masculino.standardPrice})`} + {genderConfigs.masculino.plusSizes.length} plus
                                    {genderConfigs.masculino.plusPrice && ` (R$ ${genderConfigs.masculino.plusPrice})`}
                                  </p>
                                )}
                                {genderConfigs.feminino.enabled && (
                                  <p className="text-xs text-muted-foreground">
                                    • 👩 Feminino: {genderConfigs.feminino.standardSizes.length} padrão 
                                    {genderConfigs.feminino.standardPrice && ` (R$ ${genderConfigs.feminino.standardPrice})`} + {genderConfigs.feminino.plusSizes.length} plus
                                    {genderConfigs.feminino.plusPrice && ` (R$ ${genderConfigs.feminino.plusPrice})`}
                                  </p>
                                )}
                                {genderConfigs.infantil.enabled && (
                                  <p className="text-xs text-muted-foreground">
                                    • 👶 Infantil: {genderConfigs.infantil.sizes.length} tamanhos
                                    {genderConfigs.infantil.price && ` (R$ ${genderConfigs.infantil.price})`}
                                  </p>
                                )}
                                <p className="text-xs font-semibold text-primary pt-1 border-t border-primary/20">
                                  Total: {calculateTotalVariationsForBulk()} variações × {Object.keys(bulkGroupedModels).length} modelo(s) = {Object.keys(bulkGroupedModels).length * calculateTotalVariationsForBulk()} variações
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview do SKU */}
                  {bulkModelTag && bulkSegmentId && Object.keys(bulkGroupedModels).length > 0 && (
                    <>
                      <Separator />
                      <div className="bg-muted/50 p-3 rounded-md border">
                        <p className="text-xs font-medium mb-1.5 text-muted-foreground">Preview do SKU:</p>
                        <p className="text-sm font-mono font-medium">
                          {(() => {
                            const selectedSegment = segments.find((s: any) => s.id === bulkSegmentId);
                            const segmentTag = selectedSegment?.segment_tag || "";
                            const sortedModels = Object.keys(bulkGroupedModels).sort();
                            const firstModel = sortedModels[0];
                            const secondModel = sortedModels[1];
                            const typeAbbrev: Record<string, string> = {
                              'manga_curta': 'MC',
                              'manga_longa': 'ML',
                              'regata': 'REG',
                              'ziper': 'ZIP',
                              'ziper_manga_longa': 'ZIP-ML',
                            };
                            const typeCode = typeAbbrev[bulkModelTag] || bulkModelTag.substring(0, 3).toUpperCase();
                            const segmentCode = segmentTag.substring(0, 4).toUpperCase();
                            const firstSku = `${typeCode}-${segmentCode}-${firstModel.padStart(3, '0')}`;
                            const secondSku = secondModel ? `${typeCode}-${segmentCode}-${secondModel.padStart(3, '0')}` : '...';
                            return `${firstSku}, ${secondSku}, ...`;
                          })()}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Progresso */}
            {bulkUploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Criando modelos...</Label>
                  <span className="text-sm font-medium">{Math.round(bulkProgress)}%</span>
                </div>
                <Progress value={bulkProgress} />
                {bulkCurrentModel && (
                  <p className="text-sm text-muted-foreground text-center">
                    Processando: {bulkCurrentModel}
                  </p>
                )}
              </div>
            )}
            
            {/* Botões de Ação */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBulkUploadDialogOpen(false);
                  setBulkFiles([]);
                  setBulkGroupedModels({});
                  setBulkSegmentId("");
                  setBulkModelTag("");
                  setBulkBasePrice("");
                  setBulkApplyDimensions(true);
                }}
                disabled={bulkUploading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleBulkUpload}
                disabled={bulkUploading || Object.keys(bulkGroupedModels).length === 0}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {bulkUploading 
                  ? `Criando ${Object.keys(bulkGroupedModels).length} Modelo(s)...` 
                  : `Criar ${Object.keys(bulkGroupedModels).length} Modelo(s)`
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Modelo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Modelo de Camisa</DialogTitle>
            <DialogDescription>
              Atualize os dados e imagens do modelo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
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
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            features: formData.features.filter((_, i) => i !== index)
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Imagens do Modelo</Label>
              <div className="grid grid-cols-2 gap-4">
                {[ 
                  { field: 'photo_main' as const, label: '📷 Foto Principal (CAPA)' },
                  { field: 'image_front' as const, label: '👕 Frente (FRENTE)' },
                  { field: 'image_back' as const, label: '🔙 Costas (COSTAS)' },
                  { field: 'image_right' as const, label: '➡️ Lateral Direita' },
                  { field: 'image_left' as const, label: '⬅️ Lateral Esquerda' },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{label}</Label>
                    <Input
                      id={field}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {imagePreviews[field] && (
                      <div className="relative w-full h-32 rounded overflow-hidden border">
                        <img
                          src={imagePreviews[field]}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => {
                            setImageFiles(prev => ({ ...prev, [field]: null }));
                            setImagePreviews(prev => ({ ...prev, [field]: "" }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Variações Opcionais da Frente</Label>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { field: 'image_front_small_logo' as const, label: '🔹 Logo Pequeno' },
                    { field: 'image_front_large_logo' as const, label: '🔷 Logo Grande' },
                    { field: 'image_front_clean' as const, label: '✨ Limpa' },
                  ].map(({ field, label }) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="text-xs">{label}</Label>
                      <Input
                        id={field}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                        disabled={uploading}
                        className="cursor-pointer text-xs"
                      />
                      {imagePreviews[field] && (
                        <div className="relative w-full h-24 rounded overflow-hidden border">
                          <img
                            src={imagePreviews[field]}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5"
                            onClick={() => {
                              setImageFiles(prev => ({ ...prev, [field]: null }));
                              setImagePreviews(prev => ({ ...prev, [field]: "" }));
                            }}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fazendo upload...</Label>
                  <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={uploading}
                className="flex-1"
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

      {/* Dialog de Confirmação de Exclusão em Massa */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🗑️ Confirmar Exclusão em Massa</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir <strong>{selectedModels.length} modelo(s)</strong>.
            </DialogDescription>
          </DialogHeader>
          
          {uploading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Excluindo modelos...</Label>
                <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Por favor, aguarde...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-red-900">
                    ⚠️ Esta ação não pode ser desfeita!
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Os modelos e suas imagens serão permanentemente removidos.
                  </p>
                </CardContent>
              </Card>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir {selectedModels.length} Modelo(s)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Models;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { MultiWhatsAppInput } from "./MultiWhatsAppInput";
import { MultiFileUpload } from "./MultiFileUpload";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

const createOrderSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  whatsappNumbers: z.array(z.string().min(10, "Formato inválido")).min(1, "Pelo menos 1 WhatsApp é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  segmentId: z.string().min(1, "Selecione um segmento"),
  modelId: z.string().min(1, "Selecione um modelo"),
  quantity: z.number().min(1, "Mínimo 1").max(9999, "Máximo 9999"),
  frontLogoSmall: z.boolean().optional(),
  frontLogoLarge: z.boolean().optional(),
  backLogo: z.boolean().optional(),
  hasFlag: z.boolean().optional(),
  hasSponsors: z.boolean().optional(),
  sponsorsLocation: z.enum(["top", "bottom"]).optional(),
  rightSleeveText: z.string().max(50, "Máximo 50 caracteres").optional(),
  leftSleeveText: z.string().max(50, "Máximo 50 caracteres").optional(),
  observations: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type FormData = z.infer<typeof createOrderSchema>;

interface CreateOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateOrderForm = ({ onSuccess, onCancel }: CreateOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [logoFile, setLogoFile] = useState<File[]>([]);
  const [flagFile, setFlagFile] = useState<File[]>([]);
  const [sponsorFiles, setSponsorFiles] = useState<File[]>([]);
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([""]);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      whatsappNumbers: [""],
      quantity: 1,
      frontLogoSmall: true,
      frontLogoLarge: false,
      backLogo: true,
      hasFlag: false,
      hasSponsors: false,
      sponsorsLocation: "bottom",
    },
  });

  const selectedSegmentId = watch("segmentId");
  const hasFlag = !!watch("hasFlag");
  const hasSponsors = !!watch("hasSponsors");

  useEffect(() => {
    loadSegments();
  }, []);

  useEffect(() => {
    if (selectedSegmentId) {
      loadModels(selectedSegmentId);
    }
  }, [selectedSegmentId]);

  const loadSegments = async () => {
    const { data } = await supabase.from("segments").select("*").order("name");
    if (data) setSegments(data);
  };

  const loadModels = async (segmentId: string) => {
    const { data } = await supabase
      .from("shirt_models")
      .select("*")
      .eq("segment_id", segmentId)
      .order("name");
    if (data) setModels(data);
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-logos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("customer-logos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onInvalid = (errors: any) => {
    console.error("Erros de validação:", errors);
    
    const firstErrorKey = Object.keys(errors)[0];
    const firstErrorMessage = errors[firstErrorKey]?.message;

    toast.error("Verifique os campos do formulário", {
      description: firstErrorMessage || "Existem campos obrigatórios não preenchidos ou inválidos."
    });
  };

  const onSubmit = async (data: FormData) => {
    console.log("=== INÍCIO DO SUBMIT ===");
    console.log("Dados do formulário:", data);
    
    if (logoFile.length === 0) {
      toast.error("Logo é obrigatória");
      return;
    }

    setLoading(true);
    try {
      console.log("Obtendo usuário...");
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("Usuário não autenticado!");
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      console.log("Usuário autenticado:", user.id);
      console.log("Fazendo upload da logo...");
      
      // Upload logo principal
      const logoUrl = await uploadFile(logoFile[0], "orders");
      console.log("Logo uploaded:", logoUrl);

      // Upload bandeira (se houver)
      let flagUrl = "";
      if (hasFlag && flagFile.length > 0) {
        flagUrl = await uploadFile(flagFile[0], "flags");
      }

      // Upload patrocinadores (se houver)
      const sponsorsUrls: string[] = [];
      if (hasSponsors && sponsorFiles.length > 0) {
        for (const file of sponsorFiles) {
          const url = await uploadFile(file, "sponsors");
          sponsorsUrls.push(url);
        }
      }

      // Montar customization_data
      const customizationData = {
        front: {
          logoType: data.frontLogoSmall ? "small_left" : (data.frontLogoLarge ? "large_center" : "none"),
          logoUrl: logoUrl,
          textColor: "#FFFFFF",
          text: "",
        },
        back: {
          logoLarge: data.backLogo,
          logoUrl: logoUrl,
          name: false,
          nameText: "",
          whatsapp: whatsappNumbers.length > 1,
          whatsappText: whatsappNumbers.slice(1).join(", "),
          instagram: !!data.instagram,
          instagramText: data.instagram || "",
          email: !!data.email,
          emailText: data.email || "",
          website: !!data.website,
          websiteText: data.website || "",
          facebook: !!data.facebook,
          facebookText: data.facebook || "",
          hasSponsors: hasSponsors && sponsorFiles.length > 0,
          sponsorsLocation: data.sponsorsLocation || "bottom",
          sponsors: sponsors,
          sponsorsLogosUrls: sponsorsUrls,
        },
        sleeves: {
          right: {
            flag: hasFlag,
            flagUrl: flagUrl,
            logoSmall: false,
            logoUrl: "",
            text: !!data.rightSleeveText,
            textContent: data.rightSleeveText || "",
          },
          left: {
            flag: hasFlag,
            flagUrl: flagUrl,
            logoSmall: false,
            logoUrl: "",
            text: !!data.leftSleeveText,
            textContent: data.leftSleeveText || "",
          },
        },
        notes: data.observations || "",
      };

      console.log("Criando lead...");
      // Criar lead
      const sessionId = `salesperson-${Date.now()}`;
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          session_id: sessionId,
          name: data.name,
          phone: whatsappNumbers[0],
          email: data.email || null,
          quantity: data.quantity.toString(),
          customization_summary: customizationData,
          created_by_salesperson: true,
          created_by: user.id,
          needs_logo: false,
          salesperson_status: "sent_to_designer",
          uploaded_logo_url: logoUrl,
          campaign_id: null,
        })
        .select()
        .single();

      if (leadError) {
        console.error("Erro ao criar lead:", leadError);
        throw leadError;
      }
      console.log("Lead criado:", lead.id);

      console.log("Criando order...");
      // Criar order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          session_id: sessionId,
          customer_name: data.name,
          customer_phone: whatsappNumbers[0],
          customer_email: data.email || null,
          quantity: data.quantity,
          customization_data: customizationData,
          model_id: data.modelId,
          campaign_id: null,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Erro ao criar order:", orderError);
        throw orderError;
      }
      console.log("Order criado:", order.id);

      console.log("Atualizando lead com order_id...");
      // Atualizar lead com order_id
      const { error: updateError } = await supabase
        .from("leads")
        .update({ order_id: order.id })
        .eq("id", lead.id);
      
      if (updateError) {
        console.error("Erro ao atualizar lead:", updateError);
        throw updateError;
      }

      console.log("=== PEDIDO CRIADO COM SUCESSO ===");
      toast.success("Pedido criado e enviado para designer!");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {/* Dados do Cliente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Dados do Cliente</h3>
        
        <div>
          <Label htmlFor="name">Nome Completo *</Label>
          <Input id="name" {...register("name")} placeholder="João Silva" />
          {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
        </div>

        <MultiWhatsAppInput
          values={whatsappNumbers}
          onChange={(values) => {
            setWhatsappNumbers(values);
            setValue("whatsappNumbers", values);
          }}
          error={errors.whatsappNumbers?.message}
        />

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} placeholder="joao@example.com" />
          {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" {...register("instagram")} placeholder="@empresa" />
          </div>
          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" {...register("facebook")} placeholder="facebook.com/empresa" />
          </div>
        </div>

        <div>
          <Label htmlFor="website">Site</Label>
          <Input id="website" {...register("website")} placeholder="https://www.empresa.com.br" />
          {errors.website && <p className="text-destructive text-sm mt-1">{errors.website.message}</p>}
        </div>
      </div>

      <Separator />

      {/* Produto */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Produto</h3>
        
        <div>
          <Label>Segmento *</Label>
          <Select onValueChange={(value) => setValue("segmentId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              {segments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.segmentId && <p className="text-destructive text-sm mt-1">{errors.segmentId.message}</p>}
        </div>

        <div>
          <Label>Modelo *</Label>
          <Select onValueChange={(value) => setValue("modelId", value)} disabled={!selectedSegmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.sku ? `${model.sku} - ` : ""}{model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.modelId && <p className="text-destructive text-sm mt-1">{errors.modelId.message}</p>}
        </div>

        <div>
          <Label htmlFor="quantity">Quantidade *</Label>
          <Input
            id="quantity"
            type="number"
            {...register("quantity", { valueAsNumber: true })}
            min={1}
            max={9999}
          />
          {errors.quantity && <p className="text-destructive text-sm mt-1">{errors.quantity.message}</p>}
        </div>
      </div>

      <Separator />

      {/* Personalização */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Personalização</h3>
        
        <div className="space-y-2">
          <Label>Posição da Logo *</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Controller
                name="frontLogoSmall"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="frontSmall"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                )}
              />
              <label htmlFor="frontSmall" className="text-sm">Frente Pequena</label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="frontLogoLarge"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="frontLarge"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                )}
              />
              <label htmlFor="frontLarge" className="text-sm">Frente Grande</label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="backLogo"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="backLogo"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                )}
              />
              <label htmlFor="backLogo" className="text-sm">Costas</label>
            </div>
          </div>
        </div>

        <MultiFileUpload
          label="Upload da Logo *"
          files={logoFile}
          onChange={setLogoFile}
          maxFiles={1}
          error={logoFile.length === 0 ? "Logo é obrigatória" : undefined}
        />

        <div className="flex items-center space-x-2">
          <Controller
            name="hasFlag"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="hasFlag"
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(!!checked)}
              />
            )}
          />
          <label htmlFor="hasFlag" className="text-sm">Adicionar Bandeira nas Mangas</label>
        </div>

        {hasFlag && (
          <MultiFileUpload
            label="Upload da Bandeira"
            files={flagFile}
            onChange={setFlagFile}
            maxFiles={1}
          />
        )}

        <div className="flex items-center space-x-2">
          <Controller
            name="hasSponsors"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="hasSponsors"
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(!!checked)}
              />
            )}
          />
          <label htmlFor="hasSponsors" className="text-sm">Adicionar Patrocínios nas Costas</label>
        </div>

        {hasSponsors && (
          <>
            <div>
              <Label>Posição dos Patrocínios</Label>
              <Select onValueChange={(value: "top" | "bottom") => setValue("sponsorsLocation", value)} defaultValue="bottom">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Parte Superior</SelectItem>
                  <SelectItem value="bottom">Parte Inferior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nomes dos Patrocinadores</Label>
              <Input
                placeholder="Digite o nome e pressione Enter"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      setSponsors([...sponsors, value]);
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              {sponsors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {sponsors.map((sponsor, index) => (
                    <div key={index} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                      {sponsor}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => setSponsors(sponsors.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MultiFileUpload
              label="Upload dos Logos dos Patrocinadores"
              files={sponsorFiles}
              onChange={setSponsorFiles}
              maxFiles={5}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rightSleeve">Texto Manga Direita</Label>
            <Input id="rightSleeve" {...register("rightSleeveText")} placeholder="ENERGIA SOLAR" maxLength={50} />
          </div>
          <div>
            <Label htmlFor="leftSleeve">Texto Manga Esquerda</Label>
            <Input id="leftSleeve" {...register("leftSleeveText")} placeholder="BRASIL" maxLength={50} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Observações */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Observações</h3>
        <div>
          <Label htmlFor="observations">Observações Adicionais</Label>
          <Textarea
            id="observations"
            {...register("observations")}
            placeholder="Informações adicionais sobre o pedido..."
            rows={3}
            maxLength={500}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Pedido
        </Button>
      </div>
    </form>
  );
};

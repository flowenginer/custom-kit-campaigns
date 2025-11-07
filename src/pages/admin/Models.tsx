import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

interface ShirtModel {
  id: string;
  name: string;
  photo_main: string;
  image_front: string;
  image_back: string;
  image_right: string;
  image_left: string;
  created_at: string;
}

const Models = () => {
  const [models, setModels] = useState<ShirtModel[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    photo_main: "",
    image_front: "",
    image_back: "",
    image_right: "",
    image_left: "",
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    const { data } = await supabase
      .from("shirt_models")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setModels(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("shirt_models").insert(formData);
      
      if (error) throw error;
      toast.success("Modelo criado!");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        photo_main: "",
        image_front: "",
        image_back: "",
        image_right: "",
        image_left: "",
      });
      loadModels();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;

    const { error } = await supabase.from("shirt_models").delete().eq("id", id);
    
    if (error) {
      toast.error("Erro ao excluir modelo");
    } else {
      toast.success("Modelo excluído!");
      loadModels();
    }
  };

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Modelo de Camisa</DialogTitle>
              <DialogDescription>
                Adicione todas as imagens do modelo (use URLs de imagens)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Modelo*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Regata Performance, Camisa Gola V"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Imagens do Modelo* (URLs)</Label>
                
                <div>
                  <Label htmlFor="photo_main" className="text-sm text-muted-foreground">
                    Foto Principal (para seleção)
                  </Label>
                  <Input
                    id="photo_main"
                    value={formData.photo_main}
                    onChange={(e) => setFormData({ ...formData, photo_main: e.target.value })}
                    placeholder="https://exemplo.com/foto-principal.jpg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image_front" className="text-sm text-muted-foreground">
                    Imagem - Frente
                  </Label>
                  <Input
                    id="image_front"
                    value={formData.image_front}
                    onChange={(e) => setFormData({ ...formData, image_front: e.target.value })}
                    placeholder="https://exemplo.com/frente.jpg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image_back" className="text-sm text-muted-foreground">
                    Imagem - Costas
                  </Label>
                  <Input
                    id="image_back"
                    value={formData.image_back}
                    onChange={(e) => setFormData({ ...formData, image_back: e.target.value })}
                    placeholder="https://exemplo.com/costas.jpg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image_right" className="text-sm text-muted-foreground">
                    Imagem - Lado Direito
                  </Label>
                  <Input
                    id="image_right"
                    value={formData.image_right}
                    onChange={(e) => setFormData({ ...formData, image_right: e.target.value })}
                    placeholder="https://exemplo.com/direito.jpg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image_left" className="text-sm text-muted-foreground">
                    Imagem - Lado Esquerdo
                  </Label>
                  <Input
                    id="image_left"
                    value={formData.image_left}
                    onChange={(e) => setFormData({ ...formData, image_left: e.target.value })}
                    placeholder="https://exemplo.com/esquerdo.jpg"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Criar Modelo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
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
                  onClick={() => handleDelete(model.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                5 imagens configuradas
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {models.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum modelo cadastrado. Clique em "Novo Modelo" para começar!
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Models;

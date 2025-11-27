import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shirt, TrendingUp, Palette, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  console.log("Index page rendering...");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 mb-16">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Shirt className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Sistema de Campanhas
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crie campanhas personalizadas de camisas, gerencie segmentos e acompanhe 
            todo o funil de conversão em tempo real
          </p>
          <div className="flex gap-4 justify-center pt-6">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Acessar Painel Admin
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <div className="bg-card p-6 rounded-xl shadow-md border hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Gestão de Segmentos</h3>
            <p className="text-sm text-muted-foreground">
              Organize suas campanhas por segmentos como Futevôlei, Telecom, Futsal e mais
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-md border hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Shirt className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Modelos Personalizados</h3>
            <p className="text-sm text-muted-foreground">
              Upload de múltiplas visões de cada modelo (frente, costas, laterais)
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-md border hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Editor Visual</h3>
            <p className="text-sm text-muted-foreground">
              Clientes personalizam suas camisas com editor intuitivo em 5 etapas
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-md border hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Dashboard de Funil</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe visitas, etapas e conversões de cada campanha em tempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

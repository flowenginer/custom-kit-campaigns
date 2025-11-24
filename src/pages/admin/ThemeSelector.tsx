import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { ThemeCard } from '@/components/theme/ThemeCard';
import { GLOBAL_THEMES } from '@/lib/themes';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function ThemeSelector() {
  const { currentTheme, changeTheme, resetToDefault, isLoading } = useGlobalTheme();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🎨 Temas do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Escolha uma paleta de cores para personalizar toda a interface administrativa
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={resetToDefault}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span className="text-lg">🔄</span>
          Restaurar Padrão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {GLOBAL_THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onClick={() => changeTheme(theme.id)}
          />
        ))}
      </div>

      {/* Seção de Preview ao vivo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          👁️ Preview do tema "{currentTheme.name}"
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Botões</p>
            <Button>Botão Primário</Button>
            <Button variant="outline">Botão Outline</Button>
            <Button variant="secondary">Botão Secundário</Button>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Cards</p>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Card Exemplo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Este é um exemplo de card com o tema atual aplicado.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Inputs</p>
            <Input placeholder="Campo de texto exemplo" />
            <Input placeholder="Outro campo exemplo" />
          </div>
        </div>
      </Card>
    </div>
  );
}

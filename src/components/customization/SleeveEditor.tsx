import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { useState, useRef, useMemo } from "react";
import { Maximize2, Upload, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PAISES, ESTADOS_BRASILEIROS, CIDADES_BRASILEIRAS } from "@/lib/flagData";

interface ShirtModel {
  id: string;
  name: string;
  image_left: string;
  image_right: string;
}

type FlagType = 'country' | 'state' | 'city';

interface SleeveCustomization {
  flag: boolean;
  flagType?: FlagType;
  flagCountry?: string;
  flagState?: string;
  flagCity?: string;
  flagObservation?: string;
  flagUrl: string;
  logoSmall: boolean;
  logoFile?: File | null;
  logoUrl: string;
  text: boolean;
  textContent: string;
}

interface SleeveEditorProps {
  model: ShirtModel;
  side: 'left' | 'right';
  value: SleeveCustomization;
  onChange: (data: SleeveCustomization) => void;
  onNext: () => void;
}

export const SleeveEditor = ({ model, side, value, onChange, onNext }: SleeveEditorProps) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUrl = side === 'left' ? model.image_left : model.image_right;
  const title = side === 'left' ? 'Manga Esquerda' : 'Manga Direita';

  const selectedCountryLabel = useMemo(() => {
    return PAISES.find(p => p.value === value.flagCountry)?.label || "";
  }, [value.flagCountry]);

  const selectedStateLabel = useMemo(() => {
    return ESTADOS_BRASILEIROS.find(e => e.value === value.flagState)?.label || "";
  }, [value.flagState]);

  const selectedCityLabel = useMemo(() => {
    return CIDADES_BRASILEIRAS.find(c => c.value === value.flagCity)?.label || "";
  }, [value.flagCity]);

  const handleFlagTypeChange = (type: FlagType) => {
    onChange({
      ...value,
      flagType: type,
      flagCountry: undefined,
      flagState: undefined,
      flagCity: undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pb-4">
      <Card className="order-1 md:order-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base md:text-lg">Preview - {title}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsZoomOpen(true)}
            className="md:hidden h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div 
            className="relative bg-muted rounded-lg overflow-hidden h-[200px] md:min-h-[600px] cursor-pointer flex items-center justify-center"
            onClick={() => setIsZoomOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`Preview ${title}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageUrl={imageUrl}
        alt={`Preview ${title} - Zoom`}
      />

      <Card className="order-2 md:order-2 max-h-[calc(100vh-180px)] md:max-h-none overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Personalizações - {title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha abaixo o que você quer que tenha no seu modelo
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 md:pb-6">
          {/* Bandeira */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar bandeira?</Label>
            <RadioGroup 
              value={value.flag ? "sim" : "nao"}
              onValueChange={(val) => onChange({ 
                ...value, 
                flag: val === "sim", 
                flagType: val === "nao" ? undefined : value.flagType,
                flagCountry: val === "nao" ? undefined : value.flagCountry,
                flagState: val === "nao" ? undefined : value.flagState,
                flagCity: val === "nao" ? undefined : value.flagCity,
                flagObservation: val === "nao" ? undefined : value.flagObservation,
              })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-flag-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-flag-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-flag-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-flag-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            
            {value.flag && (
              <div className="ml-6 md:ml-8 space-y-4">
                {/* Flag Type Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Tipo de bandeira</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={value.flagType === 'country' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFlagTypeChange('country')}
                      className="min-h-[40px]"
                    >
                      País
                    </Button>
                    <Button
                      type="button"
                      variant={value.flagType === 'state' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFlagTypeChange('state')}
                      className="min-h-[40px]"
                    >
                      Estado
                    </Button>
                    <Button
                      type="button"
                      variant={value.flagType === 'city' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFlagTypeChange('city')}
                      className="min-h-[40px]"
                    >
                      Cidade
                    </Button>
                  </div>
                </div>

                {/* Country Dropdown */}
                {value.flagType === 'country' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Selecione o país</Label>
                    <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryOpen}
                          className="w-full justify-between min-h-[48px]"
                        >
                          {value.flagCountry ? selectedCountryLabel : "Buscar país..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar país..." />
                          <CommandList>
                            <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                            <CommandGroup>
                              {PAISES.map((pais) => (
                                <CommandItem
                                  key={pais.value}
                                  value={pais.label}
                                  onSelect={() => {
                                    onChange({ ...value, flagCountry: pais.value });
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      value.flagCountry === pais.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {pais.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* State Dropdown */}
                {value.flagType === 'state' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Selecione o estado</Label>
                    <Popover open={stateOpen} onOpenChange={setStateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={stateOpen}
                          className="w-full justify-between min-h-[48px]"
                        >
                          {value.flagState ? selectedStateLabel : "Buscar estado..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar estado..." />
                          <CommandList>
                            <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                            <CommandGroup>
                              {ESTADOS_BRASILEIROS.map((estado) => (
                                <CommandItem
                                  key={estado.value}
                                  value={estado.label}
                                  onSelect={() => {
                                    onChange({ ...value, flagState: estado.value });
                                    setStateOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      value.flagState === estado.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {estado.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* City Dropdown */}
                {value.flagType === 'city' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Selecione a cidade</Label>
                    <Popover open={cityOpen} onOpenChange={setCityOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cityOpen}
                          className="w-full justify-between min-h-[48px]"
                        >
                          {value.flagCity ? selectedCityLabel : "Buscar cidade..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cidade..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                            <CommandGroup>
                              {CIDADES_BRASILEIRAS.map((cidade) => (
                                <CommandItem
                                  key={cidade.value}
                                  value={cidade.label}
                                  onSelect={() => {
                                    onChange({ ...value, flagCity: cidade.value });
                                    setCityOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      value.flagCity === cidade.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {cidade.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Flag Observation */}
                {value.flagType && (
                  <div className="space-y-2">
                    <Label className="text-sm">Observação da bandeira (opcional)</Label>
                    <Textarea
                      placeholder="Adicione observações sobre a bandeira, caso necessário..."
                      value={value.flagObservation || ""}
                      onChange={(e) => onChange({ ...value, flagObservation: e.target.value })}
                      className="min-h-[80px] text-base resize-none"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(value.flagObservation || "").length}/200 caracteres
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logo Pequena */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar logo pequena?</Label>
            <RadioGroup 
              value={value.logoSmall ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, logoSmall: val === "sim", logoFile: val === "nao" ? null : value.logoFile })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-logo-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-logo-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-logo-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-logo-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            
            {value.logoSmall && (
              <div className="ml-6 md:ml-8 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {value.logoFile ? value.logoFile.name : "Carregar logo"}
                </Button>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onChange({ ...value, logoFile: file });
                  }}
                />
                {value.logoFile && (
                  <p className="text-xs text-muted-foreground">
                    Logo selecionada: {value.logoFile.name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Texto */}
          <div className="space-y-3">
            <Label className="text-base">Quer adicionar texto?</Label>
            <RadioGroup 
              value={value.text ? "sim" : "nao"}
              onValueChange={(val) => onChange({ ...value, text: val === "sim", textContent: val === "nao" ? "" : value.textContent })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id={`${side}-text-sim`} className="h-5 w-5" />
                <Label htmlFor={`${side}-text-sim`} className="font-normal cursor-pointer text-base">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id={`${side}-text-nao`} className="h-5 w-5" />
                <Label htmlFor={`${side}-text-nao`} className="font-normal cursor-pointer text-base">
                  Não
                </Label>
              </div>
            </RadioGroup>
            {value.text && (
              <div className="ml-6 md:ml-8">
                <Input 
                  placeholder="Digite o texto para a manga"
                  value={value.textContent}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      onChange({ ...value, textContent: e.target.value });
                    }
                  }}
                  className="min-h-[48px] text-base"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {value.textContent.length}/50 caracteres
                </p>
              </div>
            )}
          </div>
          
          {/* Botão para confirmar e continuar */}
          <div className="pt-6 pb-2 border-t sticky bottom-0 md:static">
            <Button
              onClick={() => {
                setTimeout(() => onNext(), 200);
              }}
              size="lg"
              className="w-full h-14 text-lg"
            >
              Confirmar e Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

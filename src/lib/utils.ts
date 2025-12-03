import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bug #4: Gerar slugs amigáveis para URLs de campanhas
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por -
    .replace(/^-+|-+$/g, ''); // Remove - do início/fim
};

export const generateUniqueSlug = async (
  name: string, 
  table: string = 'campaigns', 
  column: string = 'unique_link'
): Promise<string> => {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data } = await supabase
      .from(table as any)
      .select(column)
      .eq(column, slug)
      .maybeSingle();
    
    if (!data) break; // Slug disponível
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

// Formatar tag de segmento para exibição amigável
export const formatSegmentTag = (tag: string | null | undefined): string => {
  if (!tag) return 'Sem Segmento';
  return tag
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .filter(word => word.length > 0)
    .join(' ');
};

// Extrair tipo de uniforme do código do produto ou nome do modelo
export const extractUniformType = (
  modelName: string | null | undefined,
  modelCode: string | null | undefined,
  campaignName?: string | null
): string => {
  // Nota: Mesmo para campanhas "Layout do Zero", precisamos extrair o tipo real do uniforme

  // Método 1: Extrair do código do produto (mais confiável)
  if (modelCode) {
    const parts = modelCode.split('-');
    if (parts.length >= 2) {
      const typeCode = parts[1].toUpperCase();
      const codeMap: Record<string, string> = {
        'MC': 'Manga Curta',
        'ML': 'Manga Longa',
        'MLZ': 'Manga Longa Zíper',
        'REG': 'Regata',
        'ZIP': 'Zíper',
        'ZP': 'Zíper',
      };
      if (codeMap[typeCode]) {
        return codeMap[typeCode];
      }
    }
  }

  // Método 2: Extrair do nome do modelo
  if (modelName) {
    const name = modelName.toLowerCase();
    
    // Verificar padrões específicos (ordem importa - mais específico primeiro)
    if (name.includes('manga longa ziper') || name.includes('manga longa zíper')) {
      return 'Manga Longa Zíper';
    }
    if (name.includes('manga longa')) {
      return 'Manga Longa';
    }
    if (name.includes('manga curta')) {
      return 'Manga Curta';
    }
    if (name.includes('regata')) {
      return 'Regata';
    }
    if (name.includes('ziper') || name.includes('zíper')) {
      return 'Zíper';
    }
  }

  return 'Não definido';
};

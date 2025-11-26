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

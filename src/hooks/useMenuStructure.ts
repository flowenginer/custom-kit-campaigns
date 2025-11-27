import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  slug: string;
  icon: string;
  route: string;
  description: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  children?: MenuItem[];
}

export const useMenuStructure = () => {
  const { data: menuItems = [], isLoading, refetch } = useQuery({
    queryKey: ["menu-structure"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as MenuItem[];
    },
  });

  // Construir árvore hierárquica de menus
  const getMenuTree = (): MenuItem[] => {
    const itemsMap = new Map<string, MenuItem>();
    const rootItems: MenuItem[] = [];

    // Primeiro criar o map de todos os itens
    menuItems.forEach((item) => {
      itemsMap.set(item.id, { ...item, children: [] });
    });

    // Depois construir a hierarquia
    menuItems.forEach((item) => {
      const menuItem = itemsMap.get(item.id)!;
      
      // Validar se não é pai de si mesmo (proteção contra ciclos)
      if (item.parent_id && item.parent_id !== item.id) {
        const parent = itemsMap.get(item.parent_id);
        if (parent && parent.id !== item.id) {
          parent.children = parent.children || [];
          parent.children.push(menuItem);
        } else {
          // Se não encontrar o pai ou criar ciclo, colocar como root
          rootItems.push(menuItem);
        }
      } else {
        rootItems.push(menuItem);
      }
    });

    return rootItems;
  };

  // Obter ícone Lucide por nome
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Circle;
    return Icon;
  };

  // Obter todos os menus (flat)
  const getAllMenus = () => menuItems;

  // Obter apenas menus principais (sem parent)
  const getMainMenus = () => menuItems.filter((item) => !item.parent_id);

  // Obter label de um menu por slug
  const getLabel = (slug: string): string => {
    const item = menuItems.find((m) => m.slug === slug);
    return item?.label || slug;
  };

  return {
    menuItems,
    isLoading,
    refetch,
    getMenuTree,
    getIcon,
    getAllMenus,
    getMainMenus,
    getLabel,
  };
};

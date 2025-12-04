import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, Sun, Cloud, Moon, ChevronRight, Volume2 } from "lucide-react";
import { NavLink } from "./NavLink";
import { Session } from "@supabase/supabase-js";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUserRole } from "@/hooks/useUserRole";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { useTotalPendingApprovalsCount } from "@/hooks/useTotalPendingApprovalsCount";
import { useReturnedTasksCount } from "@/hooks/useReturnedTasksCount";
import { useMenuStructure } from "@/hooks/useMenuStructure";
import { cn } from "@/lib/utils";
import logoSS from "@/assets/logo-ss.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SoundPreferencesPanel } from "@/components/creation/SoundPreferencesPanel";

const SidebarLogo = () => {
  const { open } = useSidebar();
  
  return (
    <div className="flex items-center gap-2">
      <img src={logoSS} alt="Space Sports Logo" className="h-10 w-10 object-contain flex-shrink-0" />
      {open && (
        <h1 className="font-bold text-xl">Space Sports</h1>
      )}
    </div>
  );
};

const SidebarControls = () => {
  const { open } = useSidebar();
  
  return (
    <div className={cn(
      "flex gap-2 pt-2",
      open ? "items-center" : "flex-col items-center"
    )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="h-9 w-9 flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Recolher menu lateral</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <NotificationsDropdown />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Notificações</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

const SidebarThemeButtons = ({ currentTheme, changeTheme }: { currentTheme: any, changeTheme: (id: string) => void }) => {
  const { open } = useSidebar();
  const [soundDialogOpen, setSoundDialogOpen] = useState(false);
  
  return (
    <>
      <div className="p-3 border-b border-border/50">
        {open && <span className="text-xs text-muted-foreground mb-2 block">Tema</span>}
        <div className={cn(
          "flex gap-2",
          open ? "items-center justify-center" : "flex-col items-center"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTheme?.id === 'light' ? 'default' : 'outline'}
                size="icon"
                onClick={() => changeTheme('light')}
                className="h-8 w-8"
              >
                <Sun className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={open ? "top" : "right"}>Tema Claro</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTheme?.id === 'gray' ? 'default' : 'outline'}
                size="icon"
                onClick={() => changeTheme('gray')}
                className="h-8 w-8"
              >
                <Cloud className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={open ? "top" : "right"}>Tema Médio</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTheme?.id === 'dark' ? 'default' : 'outline'}
                size="icon"
                onClick={() => changeTheme('dark')}
                className="h-8 w-8"
              >
                <Moon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={open ? "top" : "right"}>Tema Escuro</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSoundDialogOpen(true)}
                className="h-8 w-8"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={open ? "top" : "right"}>Configurações de Sons</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Sheet open={soundDialogOpen} onOpenChange={setSoundDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notificações Sonoras</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SoundPreferencesPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const SidebarLogoutButton = ({ onSignOut, userName }: { onSignOut: () => void; userName: string | null }) => {
  const { open } = useSidebar();
  
  return (
    <div className={cn(
      "p-3",
      open ? "flex items-center gap-2" : "flex justify-center"
    )}>
      {open && userName && (
        <>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1 truncate">{userName}</span>
        </>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={open ? "default" : "ghost"}
            size={open ? "default" : "icon"}
            onClick={onSignOut}
            className={cn(
              open ? "px-4" : "h-9 w-9"
            )}
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Sair</span>}
          </Button>
        </TooltipTrigger>
        {!open && <TooltipContent side="right">Sair</TooltipContent>}
      </Tooltip>
    </div>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  
  const {
    isSuperAdmin,
    isAdmin,
    isDesigner,
    isSalesperson,
    isLoading,
    allowedMenuItems,
  } = useUserRole();
  
  const { currentTheme, changeTheme } = useGlobalTheme();
  const { count: pendingCount } = useTotalPendingApprovalsCount();
  const { count: returnedCount } = useReturnedTasksCount();
  const { getMenuTree, getIcon, isLoading: menusLoading } = useMenuStructure();
  
  const menuTree = getMenuTree();

  useEffect(() => {
    setIsNavigating(false);
  }, [location]);

  // Redirecionar vendedores para /admin/orders
  useEffect(() => {
    if (!isLoading && isSalesperson && !isSuperAdmin && !isAdmin && !isDesigner) {
      if (location.pathname === '/admin/dashboard' || location.pathname === '/admin') {
        navigate('/admin/orders');
      }
    }
  }, [isLoading, isSalesperson, isSuperAdmin, isAdmin, isDesigner, location.pathname, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Buscar o primeiro nome do usuário
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        if (data?.full_name) {
          const firstName = data.full_name.split(' ')[0];
          setUserFirstName(firstName);
        }
      }
    };
    
    fetchUserProfile();
  }, [session?.user?.id]);

  // Auto-expand menu que contém rota ativa
  useEffect(() => {
    menuTree.forEach(menu => {
      if (menu.children && menu.children.length > 0) {
        const hasActiveChild = menu.children.some(child => location.pathname === child.route);
        if (hasActiveChild) {
          setExpandedMenus(prev => new Set([...prev, menu.id]));
        }
      }
    });
  }, [location.pathname, menuTree]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isMenuItemAllowed = (slug: string): boolean => {
    return allowedMenuItems.includes(slug);
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  if (!session) return null;
  if (isLoading || menusLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="bg-card border-r border-primary/20 overflow-hidden">
          <SidebarHeader className="border-b p-6 space-y-4">
            <SidebarLogo />
            <SidebarControls />
          </SidebarHeader>

          <SidebarContent className="py-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {menuTree
                    .filter(menu => menu.is_active && isMenuItemAllowed(menu.slug))
                    .map(menu => {
                      const Icon = getIcon(menu.icon);
                      const hasChildren = menu.children && menu.children.length > 0;
                      const isExpanded = expandedMenus.has(menu.id);
                      const isActive = location.pathname === menu.route;

                      // Se tem submenus
                      if (hasChildren) {
                        return (
                          <Collapsible
                            key={menu.id}
                            open={isExpanded}
                            onOpenChange={() => toggleMenu(menu.id)}
                          >
                            <SidebarMenuItem>
                              <div className="flex items-center w-full gap-1">
                                {/* Área clicável do menu pai */}
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  className={cn(
                                    "transition-colors flex-1",
                                    isActive
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "hover:bg-accent/10 hover:text-primary"
                                  )}
                                >
                                  <NavLink to={menu.route} onClick={() => setIsNavigating(true)}>
                                    <Icon className="h-5 w-5" />
                                    <span className="text-base">{menu.label}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                                
                                {/* Botão para expandir/colapsar submenus */}
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                  >
                                    <ChevronRight
                                      className={cn(
                                        "h-4 w-4 transition-transform",
                                        isExpanded && "rotate-90"
                                      )}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </SidebarMenuItem>
                            <CollapsibleContent>
                              <SidebarMenu className="ml-4 mt-1 space-y-1">
                                {menu.children
                                  ?.filter(child => child.is_active && isMenuItemAllowed(child.slug))
                                  .map(child => {
                                    const ChildIcon = getIcon(child.icon);
                                    const isChildActive = location.pathname === child.route;
                                    const showBadge = child.slug === 'approvals' && pendingCount > 0;

                                    return (
                                      <SidebarMenuItem key={child.id}>
                                        <SidebarMenuButton
                                          asChild
                                          isActive={isChildActive}
                                          className={cn(
                                            "transition-colors",
                                            isChildActive
                                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                              : "hover:bg-accent/10 hover:text-primary"
                                          )}
                                        >
                                          <NavLink to={child.route} onClick={() => setIsNavigating(true)}>
                                            <ChildIcon className="h-4 w-4" />
                                            <span className="text-sm">{child.label}</span>
                                            {showBadge && (
                                              <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs">
                                                {pendingCount}
                                              </Badge>
                                            )}
                                          </NavLink>
                                        </SidebarMenuButton>
                                      </SidebarMenuItem>
                                    );
                                  })}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      }

                      // Menu sem submenus
                      const showApprovalsBadge = menu.slug === 'approvals' && pendingCount > 0;
                      const showReturnedBadge = menu.slug === 'returned' && returnedCount > 0;
                      
                      return (
                        <SidebarMenuItem key={menu.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            disabled={isNavigating}
                            className={cn(
                              "transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-accent/10 hover:text-primary"
                            )}
                          >
                            <NavLink to={menu.route} onClick={() => setIsNavigating(true)}>
                              <Icon className="h-5 w-5" />
                              <span className="text-base">{menu.label}</span>
                              {showApprovalsBadge && (
                                <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs">
                                  {pendingCount}
                                </Badge>
                              )}
                              {showReturnedBadge && (
                                <Badge className="ml-auto bg-amber-500 text-white text-xs">
                                  {returnedCount}
                                </Badge>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border">
            <SidebarThemeButtons currentTheme={currentTheme} changeTheme={changeTheme} />
            <SidebarLogoutButton onSignOut={handleSignOut} userName={userFirstName} />
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
};

export default AdminLayout;

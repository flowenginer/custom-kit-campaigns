import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Tag, Megaphone, Users, Workflow, FlaskConical, Palette, Code, Settings, ShoppingBag, PaintBucket, FileEdit, Trophy, Sun, Cloud, Moon, CheckCircle } from "lucide-react";
import { NavLink } from "./NavLink";
import { Session } from "@supabase/supabase-js";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUserRole } from "@/hooks/useUserRole";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { usePendingApprovalsCount } from "@/hooks/usePendingApprovalsCount";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  
  return (
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
          <TooltipContent>Tema Claro</TooltipContent>
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
          <TooltipContent>Tema Médio</TooltipContent>
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
          <TooltipContent>Tema Escuro</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

const SidebarLogoutButton = ({ onSignOut, userName }: { onSignOut: () => void; userName?: string | null }) => {
  const { open } = useSidebar();
  
  return (
    <div className="p-3">
      <div className={cn(
        "flex items-center",
        open ? "gap-2" : "justify-center"
      )}>
        {open && userName && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{userName}</span>
          </div>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-8 w-8 hover:bg-accent hover:text-accent-foreground flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sair</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

const ApprovalsMenuItem = ({ 
  isActive, 
  isNavigating, 
  setIsNavigating,
  pendingCount 
}: { 
  isActive: boolean; 
  isNavigating: boolean; 
  setIsNavigating: (val: boolean) => void;
  pendingCount: number;
}) => {
  const { open } = useSidebar();
  
  return (
    <SidebarMenuItem>
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
        <NavLink to="/admin/approvals" onClick={() => setIsNavigating(true)}>
          <div className="relative">
            <CheckCircle className="h-5 w-5" />
            {pendingCount > 0 && !open && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-semibold">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-base">Aprovações</span>
          {pendingCount > 0 && open && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-semibold">
              {pendingCount}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const {
    isSuperAdmin,
    isAdmin,
    isDesigner,
    isSalesperson,
    isLoading
  } = useUserRole();
  
  const { currentTheme, changeTheme } = useGlobalTheme();
  const { count: pendingCount } = usePendingApprovalsCount();
  
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session) return null;
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  const showAll = isSuperAdmin;
  const showAdminLinks = showAll || isAdmin;
  const showDesignerLinks = showAll || isDesigner || isSalesperson;
  const showSalespersonLinks = showAll || isSalesperson;
  const showDashboard = showAll || isAdmin || isDesigner; // Exclui vendedor

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="bg-card border-r border-primary/20">
          <SidebarHeader className="border-b p-6 space-y-4">
            <SidebarLogo />
            <SidebarControls />
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {showDashboard && !isDesigner && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/dashboard"}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/dashboard" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/dashboard">
                            <LayoutDashboard className="h-5 w-5" />
                            <span className="text-base">Dashboard</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Data Cross - Apenas para Super Admin e Admin */}
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/advanced-dashboard"}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/advanced-dashboard" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/advanced-dashboard">
                            <LayoutDashboard className="h-5 w-5" />
                            <span className="text-base">Data Cross</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}

                  {/* Ranking - Para Designer, Vendedor, Admin e Super Admin */}
                  {(showAll || isAdmin || isDesigner || isSalesperson) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/production-ranking"}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/production-ranking" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/production-ranking">
                          <Trophy className="h-5 w-5" />
                          <span className="text-base">Ranking</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {showAdminLinks && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/segments"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/segments" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/segments" onClick={() => setIsNavigating(true)}>
                            <Tag className="h-5 w-5" />
                            <span className="text-base">Segmentos</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/models"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/models" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/models" onClick={() => setIsNavigating(true)}>
                            <Tag className="h-5 w-5" />
                            <span className="text-base">Modelos</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/campaigns"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/campaigns" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/campaigns" onClick={() => setIsNavigating(true)}>
                            <Megaphone className="h-5 w-5" />
                            <span className="text-base">Campanhas</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/leads"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/leads" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/leads" onClick={() => setIsNavigating(true)}>
                            <Users className="h-5 w-5" />
                            <span className="text-base">Leads</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/workflows"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/workflows" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/workflows" onClick={() => setIsNavigating(true)}>
                            <Workflow className="h-5 w-5" />
                            <span className="text-base">Workflows</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location.pathname === "/admin/ab-tests"}
                          disabled={isNavigating}
                          className={cn(
                            "transition-colors",
                            location.pathname === "/admin/ab-tests" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "hover:bg-accent/10 hover:text-primary"
                          )}
                        >
                          <NavLink to="/admin/ab-tests" onClick={() => setIsNavigating(true)}>
                            <FlaskConical className="h-5 w-5" />
                            <span className="text-base">Testes A/B</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}

                  {/* Criação - Para Designer, Vendedor, Admin e Super Admin */}
                  {(showAll || isAdmin || isSalesperson || isDesigner) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/creation"}
                        disabled={isNavigating}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/creation" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/creation" onClick={() => setIsNavigating(true)}>
                          <Palette className="h-5 w-5" />
                          <span className="text-base">Criação</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Pedidos - Para Vendedor, Admin e Super Admin (não para Designer) */}
                  {(showAll || isAdmin || isSalesperson) && !isDesigner && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/orders"}
                        disabled={isNavigating}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/orders" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/orders" onClick={() => setIsNavigating(true)}>
                          <ShoppingBag className="h-5 w-5" />
                          <span className="text-base">Pedidos</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Aprovações - Apenas para Admins */}
                  {showAdminLinks && (
                    <ApprovalsMenuItem 
                      isActive={location.pathname === "/admin/approvals"}
                      isNavigating={isNavigating}
                      setIsNavigating={setIsNavigating}
                      pendingCount={pendingCount}
                    />
                  )}

                  {showAdminLinks && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/api"}
                        disabled={isNavigating}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/api" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/api" onClick={() => setIsNavigating(true)}>
                          <Code className="h-5 w-5" />
                          <span className="text-base">API</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {showAll && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/settings"}
                        disabled={isNavigating}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/settings" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/settings" onClick={() => setIsNavigating(true)}>
                          <Settings className="h-5 w-5" />
                          <span className="text-base">Configurações</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {(showAll || isSalesperson) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === "/admin/temas"}
                        disabled={isNavigating}
                        className={cn(
                          "transition-colors",
                          location.pathname === "/admin/temas" 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent/10 hover:text-primary"
                        )}
                      >
                        <NavLink to="/admin/temas" onClick={() => setIsNavigating(true)}>
                          <PaintBucket className="h-5 w-5" />
                          <span className="text-base">Temas</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
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

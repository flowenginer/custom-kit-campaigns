import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Tag, Megaphone, Users, Workflow, FlaskConical, Palette, Code, Settings, ShoppingBag, PaintBucket } from "lucide-react";
import { NavLink } from "./NavLink";
import { Session } from "@supabase/supabase-js";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const {
    isSuperAdmin,
    isAdmin,
    isDesigner,
    isSalesperson,
    isLoading
  } = useUserRole();
  
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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="bg-card border-r border-primary/20">
          <SidebarHeader className="border-b p-6 space-y-4">
            <SidebarLogo />
            
            {/* Controles: Trigger e Notificações */}
            <div className="flex items-center gap-2 pt-2">
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
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {showDashboard && (
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
                      {!isDesigner && (
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
                      )}
                    </>
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

                  {showDesignerLinks && (
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

                  {showSalespersonLinks && (
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

          <SidebarFooter className="bg-muted border-t border-border p-4">
            <SidebarMenu>
              <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-base">Sair</span>
              </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Tag, Megaphone, Users, Workflow, FlaskConical, Palette, Code, Settings, ShoppingBag } from "lucide-react";
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

const SidebarLogo = () => {
  const { open } = useSidebar();
  
  return (
    <div className="flex items-center gap-2">
      <img src={logoSS} alt="Space Sports Logo" className="h-10 w-10 object-contain flex-shrink-0" />
      {open && (
        <div>
            <h1 className="font-bold text-xl">Space Sports</h1>
            <p className="text-sm text-muted-foreground">Painel de Controle</p>
        </div>
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
  const showDesignerLinks = showAll || isDesigner;
  const showSalespersonLinks = showAll || isSalesperson;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="bg-card border-r border-primary/20">
          <SidebarHeader className="border-b p-6">
            <SidebarLogo />
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {showDesignerLinks && (
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
                            <span className="text-base font-medium">Dashboard</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

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
                            <span className="text-base font-medium">Data Cross</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
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
                            <span className="text-base font-medium">Segmentos</span>
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
                            <span className="text-base font-medium">Modelos</span>
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
                            <span className="text-base font-medium">Campanhas</span>
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
                            <span className="text-base font-medium">Leads</span>
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
                            <span className="text-base font-medium">Workflows</span>
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
                            <span className="text-base font-medium">Testes A/B</span>
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
                          <span className="text-base font-medium">Criação</span>
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
                          <span className="text-base font-medium">Pedidos</span>
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
                          <span className="text-base font-medium">API</span>
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
                          <span className="text-base font-medium">Configurações</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="bg-destructive border-t border-destructive/30 p-4">
            <SidebarMenu>
              <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut}
                className="hover:bg-destructive-foreground/10 text-destructive-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-base font-medium">Sair</span>
              </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1" />
                <h2 className="text-2xl font-bold">Painel de Controle</h2>
              </div>
              <NotificationsDropdown />
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

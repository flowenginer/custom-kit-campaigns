import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Tag, Megaphone, Users, Workflow, FlaskConical, Palette, Code, Settings, BarChart3 } from "lucide-react";
import { NavLink } from "./NavLink";
import { Session } from "@supabase/supabase-js";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import logoSS from "@/assets/logo-ss.png";
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
    // Resetar loading quando a rota mudar
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

  // Super admin vê tudo
  const showAll = isSuperAdmin;
  const showAdminLinks = showAll || isAdmin;
  const showDesignerLinks = showAll || isDesigner;
  const showSalespersonLinks = showAll || isSalesperson;
  return <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <img src={logoSS} alt="Space Sports Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="font-bold text-lg">Space Sports</h1>
              <p className="text-xs text-muted-foreground">Painel de Controle</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {showDesignerLinks && <>
              <NavLink to="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary" activeClassName="bg-primary text-primary-foreground hover:bg-primary">
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </NavLink>
              <NavLink to="/admin/advanced-dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary" activeClassName="bg-primary text-primary-foreground hover:bg-primary">
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-medium">Data Cross   </span>
              </NavLink>
            </>}

          {showAdminLinks && <>
              <NavLink 
                to="/admin/segments" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Tag className="h-5 w-5" />
                <span className="font-medium">Segmentos</span>
              </NavLink>

              <NavLink 
                to="/admin/models" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Tag className="h-5 w-5" />
                <span className="font-medium">Modelos</span>
              </NavLink>

              <NavLink 
                to="/admin/campaigns" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Megaphone className="h-5 w-5" />
                <span className="font-medium">Campanhas</span>
              </NavLink>

              <NavLink 
                to="/admin/leads" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Leads</span>
              </NavLink>

              <NavLink 
                to="/admin/workflows" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Workflow className="h-5 w-5" />
                <span className="font-medium">Workflows</span>
              </NavLink>

              <NavLink 
                to="/admin/ab-tests" 
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
                  isNavigating && "opacity-50 pointer-events-none"
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <FlaskConical className="h-5 w-5" />
                <span className="font-medium">Testes A/B</span>
              </NavLink>
            </>}

          {showDesignerLinks && <NavLink 
            to="/admin/creation" 
            onClick={() => setIsNavigating(true)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
              isNavigating && "opacity-50 pointer-events-none"
            )}
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
              <Palette className="h-5 w-5" />
              <span className="font-medium">Criação</span>
            </NavLink>}

          {showAdminLinks && <NavLink
            to="/admin/api"
            onClick={() => setIsNavigating(true)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
              isNavigating && "opacity-50 pointer-events-none"
            )}
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
              <Code className="h-5 w-5" />
              <span className="font-medium">API</span>
            </NavLink>}

          {showAll && <NavLink 
            to="/admin/settings" 
            onClick={() => setIsNavigating(true)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary",
              isNavigating && "opacity-50 pointer-events-none"
            )}
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Configurações</span>
            </NavLink>}
        </nav>

        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <h2 className="text-2xl font-bold">Painel de Controle</h2>
            <NotificationsDropdown />
          </div>
        </div>
        <Outlet />
      </main>
    </div>;
};
export default AdminLayout;
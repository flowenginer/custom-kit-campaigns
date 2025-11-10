import { useNavigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Tag, Shirt, Megaphone, Users, Workflow } from "lucide-react";
import { NavLink } from "./NavLink";
import { Session } from "@supabase/supabase-js";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shirt className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin</h1>
              <p className="text-xs text-muted-foreground">Painel de Controle</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/segments"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Tag className="h-5 w-5" />
            <span className="font-medium">Segmentos</span>
          </NavLink>

          <NavLink
            to="/admin/models"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Shirt className="h-5 w-5" />
            <span className="font-medium">Modelos</span>
          </NavLink>

          <NavLink
            to="/admin/campaigns"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Megaphone className="h-5 w-5" />
            <span className="font-medium">Campanhas</span>
          </NavLink>

          <NavLink
            to="/admin/leads"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Leads</span>
          </NavLink>

          <NavLink
            to="/admin/workflows"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-secondary"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Workflow className="h-5 w-5" />
            <span className="font-medium">Workflows</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

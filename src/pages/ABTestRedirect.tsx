import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ABTestRedirect() {
  const { testLink } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('[AB Test Redirect] Starting redirect for:', testLink);

        // Chamar edge function
        const { data, error } = await supabase.functions.invoke('ab-test-router', {
          body: { testLink }
        });

        if (error) {
          console.error('[AB Test Redirect] Error:', error);
          throw error;
        }

        console.log('[AB Test Redirect] Redirect URL:', data.redirect);

        // Redirecionar para a campanha escolhida
        navigate(data.redirect, { replace: true });

      } catch (error) {
        console.error('[AB Test Redirect] Failed to redirect:', error);
        navigate('/404', { replace: true });
      }
    };

    if (testLink) {
      handleRedirect();
    }
  }, [testLink, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-lg text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}

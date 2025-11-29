import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlingExportButtonProps {
  taskId: string;
  orderId: string;
  onExportSuccess: () => void;
}

export const BlingExportButton = ({ taskId, orderId, onExportSuccess }: BlingExportButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [blingEnabled, setBlingEnabled] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);

  useEffect(() => {
    const checkBlingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('bling_enabled')
          .single();

        if (!error && data) {
          setBlingEnabled(data.bling_enabled || false);
        }
      } catch (error) {
        console.error('Error checking Bling settings:', error);
      } finally {
        setCheckingSettings(false);
      }
    };

    checkBlingSettings();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Primeiro sincroniza o produto
      const { data: syncData, error: syncError } = await supabase.functions.invoke('bling-integration', {
        body: {
          action: 'sync_product',
          order_id: orderId
        }
      });

      if (syncError) throw syncError;

      if (syncData.error) {
        toast.error(syncData.error);
        setLoading(false);
        return;
      }

      toast.success("Produto sincronizado com sucesso!");

      // Depois exporta o pedido
      const { data: exportData, error: exportError } = await supabase.functions.invoke('bling-integration', {
        body: {
          action: 'export_order',
          order_id: orderId
        }
      });

      if (exportError) throw exportError;

      if (exportData.error) {
        toast.error(exportData.error);
        return;
      }

      // Atualizar task com dados do Bling
      if (exportData.order?.id && exportData.order?.numero) {
        await supabase
          .from('design_tasks')
          .update({
            bling_order_id: exportData.order.id,
            bling_order_number: exportData.order.numero
          })
          .eq('id', taskId);
      }

      toast.success(`Pedido exportado! Número: ${exportData.order?.numero || 'N/A'}`);
      onExportSuccess();
    } catch (error: any) {
      console.error('Erro ao exportar para Bling:', error);
      toast.error(error.message || "Erro ao exportar para Bling");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSettings) {
    return null;
  }

  if (!blingEnabled) {
    return null;
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="default"
      size="sm"
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Package className="mr-2 h-4 w-4" />
          Enviar para Bling
        </>
      )}
    </Button>
  );
};
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, Send, MessageCircle, Plus, RefreshCw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  quantity: string;
  customization_summary: any;
  salesperson_status: string | null;
  uploaded_logo_url: string | null;
  campaign_id: string | null;
  created_by_salesperson: boolean;
  order_id: string | null;
  campaign?: { name: string };
}

export default function Orders() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          campaign:campaigns(name)
        `)
        .or('needs_logo.eq.true,created_by_salesperson.eq.true')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async () => {
    if (!selectedLead || !logoFile) return;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${selectedLead.id}-${Date.now()}.${fileExt}`;
      const filePath = `customer-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-logos')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('leads')
        .update({ uploaded_logo_url: publicUrl })
        .eq('id', selectedLead.id);

      if (updateError) throw updateError;

      toast.success("Logo enviada com sucesso!");
      setUploadDialogOpen(false);
      setLogoFile(null);
      loadLeads();
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  };

  const sendToDesigner = async (lead: Lead) => {
    try {
      if (!lead.uploaded_logo_url) {
        toast.error("Por favor, faça upload da logo primeiro");
        return;
      }

      // Criar order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: lead.id,
          customer_name: lead.name,
          customer_phone: lead.phone,
          customer_email: lead.email,
          quantity: parseInt(lead.quantity) || 1,
          customization_data: {
            ...lead.customization_summary,
            frontLogoUrl: lead.uploaded_logo_url,
            backLogoUrl: lead.uploaded_logo_url,
          },
          campaign_id: lead.campaign_id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar design task
      const { error: taskError } = await supabase
        .from('design_tasks')
        .insert({
          order_id: orderData.id,
          lead_id: lead.id,
          campaign_id: lead.campaign_id,
          status: 'pending',
          priority: 'normal',
          created_by_salesperson: lead.created_by_salesperson,
        });

      if (taskError) throw taskError;

      // Atualizar lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          salesperson_status: 'sent_to_designer',
          order_id: orderData.id,
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      toast.success("Pedido enviado para designer!");
      loadLeads();
    } catch (error) {
      console.error("Error sending to designer:", error);
      toast.error("Erro ao enviar para designer");
    }
  };

  const approveFinal = async (lead: Lead) => {
    try {
      const { error: taskError } = await supabase
        .from('design_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('lead_id', lead.id);

      if (taskError) throw taskError;

      const { error: leadError } = await supabase
        .from('leads')
        .update({ salesperson_status: null, completed: true })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      toast.success("Pedido finalizado!");
      loadLeads();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Erro ao finalizar pedido");
    }
  };

  const requestChanges = async (lead: Lead) => {
    try {
      const { error } = await supabase
        .from('design_tasks')
        .update({ status: 'changes_requested' })
        .eq('lead_id', lead.id);

      if (error) throw error;

      toast.success("Ajustes solicitados!");
      loadLeads();
    } catch (error) {
      console.error("Error requesting changes:", error);
      toast.error("Erro ao solicitar ajustes");
    }
  };

  const getColumnLeads = (status: string) => {
    return leads.filter(lead => lead.salesperson_status === status);
  };

  const LeadCard = ({ lead }: { lead: Lead }) => {
    const initials = lead.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}`;

    return (
      <Card className="mb-3">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.phone}</p>
              </div>
            </div>
            {lead.created_by_salesperson && (
              <Badge variant="secondary" className="text-xs">Manual</Badge>
            )}
          </div>

          {lead.campaign && (
            <p className="text-xs text-muted-foreground">
              Campanha: {lead.campaign.name}
            </p>
          )}

          <div className="text-xs">
            <span className="text-muted-foreground">Qtd:</span> {lead.quantity}
          </div>

          {lead.uploaded_logo_url && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Logo enviada
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(whatsappUrl, '_blank')}
              className="flex-1"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              WhatsApp
            </Button>

            {lead.salesperson_status === 'awaiting_logo' && (
              <>
                {!lead.uploaded_logo_url ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedLead(lead);
                      setUploadDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Logo
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => sendToDesigner(lead)}
                    className="flex-1"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Enviar
                  </Button>
                )}
              </>
            )}

            {lead.salesperson_status === 'awaiting_final_confirmation' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requestChanges(lead)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Ajustes
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveFinal(lead)}
                  className="flex-1"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Aprovar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerenciar pedidos que precisam de logos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLeads} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pedido
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Pedido do Zero</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento. Em breve você poderá criar pedidos manualmente.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Aguardando Logo</h2>
            <Badge variant="secondary">{getColumnLeads('awaiting_logo').length}</Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-250px)]">
            {getColumnLeads('awaiting_logo').map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            {getColumnLeads('awaiting_logo').length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum pedido
              </p>
            )}
          </ScrollArea>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Enviado para Designer</h2>
            <Badge variant="secondary">{getColumnLeads('sent_to_designer').length}</Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-250px)]">
            {getColumnLeads('sent_to_designer').map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            {getColumnLeads('sent_to_designer').length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum pedido
              </p>
            )}
          </ScrollArea>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Aguardando Confirmação</h2>
            <Badge variant="secondary">{getColumnLeads('awaiting_final_confirmation').length}</Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-250px)]">
            {getColumnLeads('awaiting_final_confirmation').map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            {getColumnLeads('awaiting_final_confirmation').length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum pedido
              </p>
            )}
          </ScrollArea>
        </div>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="logo-upload">Selecione a Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={uploadLogo} disabled={!logoFile || uploading} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar Logo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
}

interface FunnelData {
  campaignId: string;
  campaignName: string;
  visits: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  completed: number;
}

const Dashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (campaignsData) {
        setCampaigns(campaignsData);
        
        const funnelPromises = campaignsData.map(async (campaign) => {
          const { data: events } = await supabase
            .from("funnel_events")
            .select("event_type")
            .eq("campaign_id", campaign.id);

          const counts = {
            visits: 0,
            step1: 0,
            step2: 0,
            step3: 0,
            step4: 0,
            step5: 0,
            completed: 0,
          };

          events?.forEach((event) => {
            if (event.event_type === "visit") counts.visits++;
            else if (event.event_type === "step_1") counts.step1++;
            else if (event.event_type === "step_2") counts.step2++;
            else if (event.event_type === "step_3") counts.step3++;
            else if (event.event_type === "step_4") counts.step4++;
            else if (event.event_type === "step_5") counts.step5++;
            else if (event.event_type === "completed") counts.completed++;
          });

          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            ...counts,
          };
        });

        const funnelResults = await Promise.all(funnelPromises);
        setFunnelData(funnelResults);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Funil</h1>
        <p className="text-muted-foreground mt-1">
          Visualize a performance de suas campanhas
        </p>
      </div>

      {funnelData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma campanha com dados ainda. Crie uma campanha para começar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {funnelData.map((campaign) => {
            const chartData = [
              { name: "Visitas", value: campaign.visits },
              { name: "Etapa 1", value: campaign.step1 },
              { name: "Etapa 2", value: campaign.step2 },
              { name: "Etapa 3", value: campaign.step3 },
              { name: "Etapa 4", value: campaign.step4 },
              { name: "Etapa 5", value: campaign.step5 },
              { name: "Concluído", value: campaign.completed },
            ];

            return (
              <Card key={campaign.campaignId}>
                <CardHeader>
                  <CardTitle>{campaign.campaignName}</CardTitle>
                  <CardDescription>
                    Taxa de conversão:{" "}
                    {campaign.visits > 0
                      ? ((campaign.completed / campaign.visits) * 100).toFixed(1)
                      : 0}
                    %
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

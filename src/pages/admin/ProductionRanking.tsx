import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ProductionCharts } from "@/components/ranking/ProductionCharts";
import { SalespersonRankingTable } from "@/components/ranking/SalespersonRankingTable";
import { DesignerRankingTable } from "@/components/ranking/DesignerRankingTable";
import { SegmentCrossTable } from "@/components/ranking/SegmentCrossTable";
import { subDays } from "date-fns";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";
import { CRMPageHeader } from "@/components/crm/CRMPageHeader";
import { useDesignMode } from "@/contexts/DesignModeContext";
import { cn } from "@/lib/utils";

const ProductionRanking = () => {
  const { isCRM } = useDesignMode();
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const refreshData = useCallback(async () => {
    // Forçar re-render dos componentes filhos atualizando as datas
    setStartDate(prev => new Date(prev));
  }, []);

  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(
    refreshData,
    { interval: 60000, enabled: true }
  );

  return (
    <div className="p-8 space-y-6">
      <CRMPageHeader
        title="🏆 Ranking de Produção"
        description="Análise de desempenho de vendedores e designers"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filtros</CardTitle>
          <RefreshIndicator 
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </CardHeader>
        <CardContent>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="salesperson">Vendedores</TabsTrigger>
          <TabsTrigger value="designer">Designers</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            <ProductionCharts startDate={startDate} endDate={endDate} />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>🥇 Top Vendedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalespersonRankingTable 
                    startDate={startDate} 
                    endDate={endDate}
                    limit={5}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>⚡ Top Designers</CardTitle>
                </CardHeader>
                <CardContent>
                  <DesignerRankingTable 
                    startDate={startDate} 
                    endDate={endDate}
                    limit={5}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="salesperson" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <SalespersonRankingTable 
                startDate={startDate} 
                endDate={endDate}
              />
            </CardContent>
          </Card>

          <SegmentCrossTable
            startDate={startDate}
            endDate={endDate}
            type="salesperson"
          />
        </TabsContent>

        <TabsContent value="designer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo de Designers</CardTitle>
            </CardHeader>
            <CardContent>
              <DesignerRankingTable 
                startDate={startDate} 
                endDate={endDate}
              />
            </CardContent>
          </Card>

          <SegmentCrossTable
            startDate={startDate}
            endDate={endDate}
            type="designer"
          />
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <div className="grid gap-6">
            <SegmentCrossTable
              startDate={startDate}
              endDate={endDate}
              type="salesperson"
            />

            <SegmentCrossTable
              startDate={startDate}
              endDate={endDate}
              type="designer"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionRanking;

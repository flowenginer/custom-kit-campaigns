import { useState } from "react";
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { SalespersonRankingTable } from "@/components/ranking/SalespersonRankingTable";
import { DesignerRankingTable } from "@/components/ranking/DesignerRankingTable";
import { SegmentCrossTable } from "@/components/ranking/SegmentCrossTable";
import { ProductionCharts } from "@/components/ranking/ProductionCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProductionRanking = () => {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🏆 Ranking de Produção</h1>
        <p className="text-muted-foreground">
          Análise de desempenho de vendedores e designers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o período para análise
          </CardDescription>
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
              <CardDescription>
                Todos os vendedores ordenados por número de solicitações
              </CardDescription>
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
              <CardDescription>
                Todos os designers ordenados por produtividade
              </CardDescription>
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

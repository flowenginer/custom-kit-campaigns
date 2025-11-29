import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLayout from "./components/AdminLayout";
import { GlobalThemeProvider } from "./components/theme/GlobalThemeProvider";
import Dashboard from "./pages/admin/Dashboard";
import AdvancedDashboard from "./pages/admin/AdvancedDashboard";
import Segments from "./pages/admin/Segments";
import Models from "./pages/admin/Models";
import Campaigns from "./pages/admin/Campaigns";
import Leads from "./pages/admin/Leads";
import Workflows from "./pages/admin/Workflows";
import ABTests from "./pages/admin/ABTests";
import Creation from "./pages/admin/Creation";
import Orders from "./pages/admin/Orders";
import Approvals from "./pages/admin/Approvals";
import Api from "./pages/admin/Api";
import Settings from "./pages/admin/Settings";
import PageBuilder from "./pages/admin/PageBuilder";
import Campaign from "./pages/Campaign";
import ABTestRedirect from "./pages/ABTestRedirect";
import { UploadLogos } from "./pages/UploadLogos";
import NotFound from "./pages/NotFound";
import TrafficDashboard from "./pages/admin/TrafficDashboard";
import ThemeSelector from "./pages/admin/ThemeSelector";
import CampaignPageBuilder from "./pages/admin/CampaignPageBuilder";
import CampaignStepBuilder from "./pages/admin/CampaignStepBuilder";
import CampaignVisualEditor from "./pages/admin/CampaignVisualEditor";
import ProductionRanking from "./pages/admin/ProductionRanking";
import DashboardBuilder from "./pages/admin/DashboardBuilder";
import Chat from "./pages/admin/Chat";
import CompanySettings from "./pages/admin/CompanySettings";
import ProductPricing from "./pages/admin/ProductPricing";
import Customers from "./pages/admin/Customers";

// Componente para rastrear mudanças de rota em SPAs
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Verifica se o dataLayer existe (GTM)
    if (typeof window !== 'undefined' && window.dataLayer) {
      console.log('📊 GTM Pageview:', location.pathname);
      
      window.dataLayer.push({
        event: 'pageview',
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title
      });
    }
  }, [location]);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/t/:testLink" element={<ABTestRedirect />} />
          <Route path="/c/:uniqueLink" element={<Campaign />} />
          <Route path="/c/:uniqueLink/upload-logos" element={<UploadLogos />} />
          <Route path="/admin" element={<GlobalThemeProvider><AdminLayout /></GlobalThemeProvider>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="traffic" element={<TrafficDashboard />} />
            <Route path="advanced-dashboard" element={<AdvancedDashboard />} />
            <Route path="production-ranking" element={<ProductionRanking />} />
            <Route path="segments" element={<Segments />} />
            <Route path="models" element={<Models />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="leads" element={<Leads />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="workflows/:workflowId/step/:stepId/builder" element={<PageBuilder />} />
            <Route path="campaign-pages" element={<CampaignPageBuilder />} />
            <Route path="campaigns/:campaignId/step/:stepId/builder" element={<CampaignStepBuilder />} />
            <Route path="campaigns/:id/visual-editor" element={<CampaignVisualEditor />} />
            <Route path="ab-tests" element={<ABTests />} />
            <Route path="creation" element={<Creation />} />
            <Route path="orders" element={<Orders />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="api" element={<Api />} />
            <Route path="settings" element={<Settings />} />
            <Route path="temas" element={<ThemeSelector />} />
            <Route path="dashboard-builder" element={<DashboardBuilder />} />
            <Route path="chat" element={<Chat />} />
            <Route path="company-settings" element={<CompanySettings />} />
            <Route path="product-pricing" element={<ProductPricing />} />
            <Route path="customers" element={<Customers />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

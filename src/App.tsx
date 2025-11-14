import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdvancedDashboard from "./pages/admin/AdvancedDashboard";
import Segments from "./pages/admin/Segments";
import Models from "./pages/admin/Models";
import Campaigns from "./pages/admin/Campaigns";
import Leads from "./pages/admin/Leads";
import Workflows from "./pages/admin/Workflows";
import Creation from "./pages/admin/Creation";
import Api from "./pages/admin/Api";
import Settings from "./pages/admin/Settings";
import Campaign from "./pages/Campaign";
import { UploadLogos } from "./pages/UploadLogos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/c/:uniqueLink" element={<Campaign />} />
          <Route path="/c/:uniqueLink/upload-logos" element={<UploadLogos />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="advanced-dashboard" element={<AdvancedDashboard />} />
            <Route path="segments" element={<Segments />} />
            <Route path="models" element={<Models />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="leads" element={<Leads />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="creation" element={<Creation />} />
            <Route path="api" element={<Api />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

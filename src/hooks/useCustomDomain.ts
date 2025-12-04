import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCustomDomain = () => {
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomDomain = async () => {
      try {
        const { data, error } = await supabase
          .from("company_settings")
          .select("custom_domain")
          .single();

        if (error) throw error;
        setCustomDomain(data?.custom_domain || null);
      } catch (error) {
        console.error("Erro ao carregar domínio personalizado:", error);
        setCustomDomain(null);
      } finally {
        setLoading(false);
      }
    };

    loadCustomDomain();
  }, []);

  const getBaseUrl = useCallback(() => {
    return customDomain ? `https://${customDomain}` : window.location.origin;
  }, [customDomain]);

  const buildUrl = useCallback((path: string) => {
    const baseUrl = getBaseUrl();
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }, [getBaseUrl]);

  // Pre-built URL generators for common links
  const urls = {
    quote: (token: string) => buildUrl(`/quote/${token}`),
    customerRegister: (token: string) => buildUrl(`/customer-register/${token}`),
    shipping: (token: string) => buildUrl(`/frete/${token}`),
    campaign: (link: string) => buildUrl(`/c/${link}`),
    abTest: (link: string) => buildUrl(`/t/${link}`),
    uploadLogos: (sessionId: string) => buildUrl(`/upload-logos/${sessionId}`),
  };

  return {
    customDomain,
    loading,
    getBaseUrl,
    buildUrl,
    urls,
  };
};

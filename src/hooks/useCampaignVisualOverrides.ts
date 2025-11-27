import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VisualOverrides {
  heading?: {
    text?: string;
    color?: string;
    fontSize?: string;
  };
  subheading?: {
    text?: string;
    color?: string;
  };
  logo?: {
    url?: string;
    height?: string;
  };
  primaryColor?: string;
  backgroundColor?: string;
  cardImages?: Record<string, string>;
  cardOrder?: string[];
  placeholder?: string;
  helpText?: string;
}

export function useCampaignVisualOverrides(campaignId: string | undefined, stepId: string) {
  return useQuery({
    queryKey: ["campaign-visual-overrides", campaignId, stepId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from("campaign_visual_overrides")
        .select("overrides")
        .eq("campaign_id", campaignId)
        .eq("step_id", stepId)
        .maybeSingle();

      if (error) throw error;
      return data?.overrides as VisualOverrides | null;
    },
    enabled: !!campaignId,
  });
}

export function useGlobalCampaignOverrides(campaignId: string | undefined) {
  return useCampaignVisualOverrides(campaignId, "global");
}

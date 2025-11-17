export interface ABTest {
  id: string;
  name: string;
  unique_link: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  campaigns: Array<{
    campaign_id: string;
    percentage: number;
  }>;
  completion_criteria: {
    days?: number;
    leads?: number;
    mode: 'first' | 'both';
  };
  total_visits: number;
  actual_distribution: Record<string, number>;
  started_at: string;
  paused_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ABTestMetrics {
  campaign_id: string;
  campaign_name: string;
  visits: number;
  leads: number;
  conversion_rate: number;
  distribution_percentage: number;
  target_percentage: number;
  is_winner: boolean;
  confidence_level?: number;
}

export interface CampaignOption {
  id: string;
  name: string;
  unique_link: string;
  segment_name?: string;
}

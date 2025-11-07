-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create segments table
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shirt_models table
CREATE TABLE public.shirt_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_main TEXT NOT NULL,
  image_front TEXT NOT NULL,
  image_back TEXT NOT NULL,
  image_right TEXT NOT NULL,
  image_left TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  segment_id UUID REFERENCES public.segments(id) ON DELETE CASCADE,
  unique_link TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_models junction table (many-to-many)
CREATE TABLE public.campaign_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.shirt_models(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, model_id)
);

-- Create funnel_events table for tracking
CREATE TABLE public.funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'visit', 'step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.shirt_models(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  customization_data JSONB NOT NULL, -- Store all customization details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shirt_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access (authenticated users)
CREATE POLICY "Admin full access to segments" ON public.segments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to shirt_models" ON public.shirt_models
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to campaigns" ON public.campaigns
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to campaign_models" ON public.campaign_models
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to funnel_events" ON public.funnel_events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to orders" ON public.orders
  FOR ALL USING (auth.role() = 'authenticated');

-- Public access policies for the campaign flow
CREATE POLICY "Public can view campaigns by link" ON public.campaigns
  FOR SELECT USING (true);

CREATE POLICY "Public can view campaign models" ON public.campaign_models
  FOR SELECT USING (true);

CREATE POLICY "Public can view shirt models" ON public.shirt_models
  FOR SELECT USING (true);

CREATE POLICY "Public can insert funnel events" ON public.funnel_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_unique_link ON public.campaigns(unique_link);
CREATE INDEX idx_funnel_events_campaign ON public.funnel_events(campaign_id);
CREATE INDEX idx_funnel_events_session ON public.funnel_events(session_id);
CREATE INDEX idx_orders_campaign ON public.orders(campaign_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shirt_models_updated_at BEFORE UPDATE ON public.shirt_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
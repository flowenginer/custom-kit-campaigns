-- Add public SELECT policy to orders table to allow reading newly created orders
-- This is needed because the campaign page does .insert().select().single()
-- Security note: This exposes order data (including PII) to public queries
-- Future improvement: Move order creation to a backend RPC function
create policy "Public can view orders"
  on public.orders
  for select
  using (true);
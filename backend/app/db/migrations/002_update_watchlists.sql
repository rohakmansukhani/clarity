ALTER TABLE public.watchlists 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS target_price numeric,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS rsi_alert boolean DEFAULT false;

-- Add index for tags if needed for searching later
CREATE INDEX IF NOT EXISTS idx_watchlists_tags ON public.watchlists USING GIN(tags);

-- Migration to add target prices and notes to watchlists
ALTER TABLE public.watchlists 
ADD COLUMN IF NOT EXISTS target_buy_price numeric(10,2),
ADD COLUMN IF NOT EXISTS target_sell_price numeric(10,2),
ADD COLUMN IF NOT EXISTS notes text;

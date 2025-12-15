-- Clarity Finance Schema
-- Run this in Supabase SQL Editor

-- 1. Enable UUID Extension (usually enabled by default)
create extension if not exists "uuid-ossp";

-- 2. Create Portfolios Table
create table public.portfolios (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  currency text default 'INR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Holdings Table
create table public.holdings (
  id uuid default uuid_generate_v4() primary key,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  ticker text not null,
  exchange text not null, -- NSE or BSE
  allocation_percent numeric(5,2) default 0,
  shares numeric(10,2) default 0,
  avg_price numeric(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;

-- 5. Create RLS Policies
-- Users can only see their own portfolios
create policy "Users can select their own portfolios" 
  on public.portfolios for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own portfolios" 
  on public.portfolios for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own portfolios" 
  on public.portfolios for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own portfolios" 
  on public.portfolios for delete 
  using (auth.uid() = user_id);

-- Holdings policies (inherit from portfolio ownership)
create policy "Users can manage holdings of their portfolios"
  on public.holdings for all
  using (
    exists (
      select 1 from public.portfolios
      where id = public.holdings.portfolio_id
      and user_id = auth.uid()
    )
  );

-- 6. Watchlists (Optional - doing basic for now)
create table public.watchlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  ticker text not null,
  exchange text default 'NSE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.watchlists enable row level security;

create policy "Users can manage their own watchlists"
  on public.watchlists for all
  using (auth.uid() = user_id);

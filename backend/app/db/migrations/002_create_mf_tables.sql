-- Create mf_holdings table
CREATE TABLE IF NOT EXISTS mf_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    portfolio_id UUID REFERENCES portfolios(id),  -- Links to existing portfolio
    scheme_code VARCHAR(20) NOT NULL,
    scheme_name VARCHAR(255) NOT NULL,
    amc_name VARCHAR(100),
    category VARCHAR(50),
    units DECIMAL(15, 4) NOT NULL,
    avg_nav DECIMAL(12, 4) NOT NULL,
    purchase_date DATE,
    folio_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id, scheme_code, folio_number)
);

-- RLS Policy
ALTER TABLE mf_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own MF holdings" ON mf_holdings
    FOR ALL USING (auth.uid() = user_id);

-- Create mf_watchlist table
CREATE TABLE IF NOT EXISTS mf_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    scheme_code VARCHAR(20) NOT NULL,
    scheme_name VARCHAR(255) NOT NULL,
    amc_name VARCHAR(100),
    category VARCHAR(50),
    notes TEXT,
    target_nav DECIMAL(12, 4),
    sip_amount DECIMAL(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id, scheme_code)
);

-- RLS Policy
ALTER TABLE mf_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own MF watchlist" ON mf_watchlist
    FOR ALL USING (auth.uid() = user_id);

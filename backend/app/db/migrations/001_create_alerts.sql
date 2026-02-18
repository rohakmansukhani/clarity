-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    ticker text NOT NULL,
    target_price numeric,
    target_percent_change numeric,
    initial_price numeric, -- Store price at time of alert creation for % calc
    condition text NOT NULL CHECK (condition IN ('ABOVE', 'BELOW', 'GAIN_PCT', 'LOSS_PCT')),
    is_active boolean DEFAULT true,
    email_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT alerts_pkey PRIMARY KEY (id)
);

-- RLS Policies (Optional but recommended if RLS is on)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts" ON public.alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" ON public.alerts
    FOR DELETE USING (auth.uid() = user_id);

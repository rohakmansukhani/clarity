import api from './api';

export interface StockDetails {
    symbol: string;
    name?: string;
    price: number;
    change: number;
    changePercent: number;
    logo?: string;
    fundamentals?: any;
}

export const marketService = {
    // Get aggregated stock details
    getStockDetails: async (symbol: string) => {
        const response = await api.get(`/stocks/${symbol}`);
        return response.data;
    },

    // Get historical data for chart
    getStockHistory: async (symbol: string, period: string = '1mo') => {
        const response = await api.get(`/stocks/${symbol}/history?period=${period}`);
        return response.data;
    },

    // Search for stocks
    searchStocks: async (query: string) => {
        const response = await api.get(`/stocks/search?q=${query}`);
        return response.data;
    },

    // Get Market Status (Nifty/Sensex)
    getMarketStatus: async () => {
        // Changed to /market/status to avoid conflict
        const response = await api.get('/market/status');
        return response.data;
    },

    // Get Top Top Gainers/Losers
    getTopMovers: async () => {
        const response = await api.get('/market/movers');
        return response.data;
    },

    // Get AI Analysis (The Brain)
    getAIAnalysis: async (symbol: string) => {
        const response = await api.post('/ai/chat', {
            query: `Analyze ${symbol}`,
            context: { type: 'stock_analysis', symbol: symbol }
        });
        return response.data;
    },

    // Get Optimized AI Summary (Faster)
    getAggregatedStockAnalysis: async (symbol: string) => {
        const response = await api.get(`/ai/stock/${symbol}/summary`);
        return response.data;
    },

    // Explain Financial Term
    explainFinancialTerm: async (term: string) => {
        const response = await api.post('/ai/explain', { term });
        return response.data;
    },

    // Generic Chat with AI Advisor
    chatWithAI: async (query: string, context?: any, conversationHistory?: Array<{ role: string; content: string }>) => {
        const response = await api.post('/ai/chat', {
            query,
            conversation_history: conversationHistory,
            context
        });
        // Backend now returns { response: "...", suggest_switch: {...} }
        return response.data;
    },

    // Compare multiple stocks
    compareStocks: async (symbols: string[]) => {
        const response = await api.post('/market/compare', { symbols });
        return response.data;
    },

    // Get comparison history for chart
    getComparisonHistory: async (symbols: string[], period: string = '1y') => {
        // Fetch history for all stocks in parallel
        const historyPromises = symbols.map(symbol =>
            api.get(`/stocks/${symbol}/history?period=${period}`)
                .then(res => ({ symbol, data: res.data }))
                .catch(err => ({ symbol, data: [] }))
        );
        const results = await Promise.all(historyPromises);
        return results;
    },

    // --- Chat History API ---
    getChatSessions: async (type?: 'advisor' | 'discovery_hub') => {
        const response = await api.get('/history/sessions', {
            params: { type }
        });
        return response.data;
    },

    getSessionMessages: async (sessionId: string) => {
        const response = await api.get(`/history/sessions/${sessionId}/messages`);
        return response.data;
    },

    createSession: async (title: string, initialMessages: any[] = [], type: 'advisor' | 'discovery_hub' = 'advisor') => {
        const response = await api.post('/history/sessions', {
            title,
            initial_messages: initialMessages,
            type
        });
        return response.data;
    },

    addMessageToSession: async (sessionId: string, role: string, content: string, metadata?: any) => {
        const response = await api.post(`/history/sessions/${sessionId}/messages`, { role, content, metadata });
        return response.data;
    },

    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/history/sessions/${sessionId}`);
        return response.data;
    },

    togglePinSession: async (sessionId: string, isPinned: boolean) => {
        const response = await api.patch(`/history/sessions/${sessionId}/pin`, { is_pinned: isPinned });
        return response.data;
    },

    generateSessionTitle: async (sessionId: string) => {
        const response = await api.post(`/history/sessions/${sessionId}/title`);
        return response.data;
    },

    // --- Watchlist API ---
    getWatchlist: async () => {
        const response = await api.get('/watchlists/');
        return response.data;
    },

    addToWatchlist: async (ticker: string, details?: { exchange?: string, target_buy_price?: number, target_sell_price?: number, notes?: string }) => {
        const payload = {
            ticker,
            exchange: details?.exchange || 'NSE',
            target_buy_price: details?.target_buy_price,
            target_sell_price: details?.target_sell_price,
            notes: details?.notes
        };
        const response = await api.post('/watchlists/', payload);
        return response.data;
    },

    removeFromWatchlist: async (ticker: string) => {
        const response = await api.delete(`/watchlists/${ticker}`);
        return response.data;
    },

    // --- Portfolio Helper ---
    addToPortfolio: async (portfolioId: string, holding: { ticker: string, shares: number, avg_price: number, exchange?: string }) => {
        // Matches the endpoint expected by portfolio service
        const response = await api.post(`/portfolios/${portfolioId}/holdings`, {
            ticker: holding.ticker,
            shares: holding.shares,
            avg_price: holding.avg_price,
            exchange: holding.exchange || 'NSE'
        });
        return response.data;
    },

    // --- Portfolio Management ---
    getPortfolios: async () => {
        const response = await api.get('/portfolios/');
        return response.data;
    },

    createPortfolio: async (name: string, currency: string = 'INR') => {
        const response = await api.post('/portfolios/', { name, currency });
        return response.data;
    },

    createPortfolioWithHoldings: async (name: string, holdings: Array<{ ticker: string; shares: number; avg_price: number }>) => {
        // First create the portfolio
        const portfolioResponse = await api.post('/portfolios/', { name, currency: 'INR' });
        const portfolio = portfolioResponse.data;

        // Then add all holdings
        const holdingPromises = holdings.map(holding =>
            api.post(`/portfolios/${portfolio.id}/holdings`, {
                ticker: holding.ticker,
                shares: holding.shares,
                avg_price: holding.avg_price,
                exchange: 'NSE'
            })
        );

        await Promise.all(holdingPromises);
        return portfolio;
    },

    backtest: async (ticker: string, date: string, shares?: number, investment_amount?: number, sell_date?: string) => {
        const response = await api.post('/market/backtest', { ticker, date, shares, investment_amount, sell_date });
        return response.data;
    },

    getListingDate: async (ticker: string) => {
        const response = await api.get(`/stocks/listing-date/${ticker}`);
        return response.data.listing_date;
    },

    getPriceAtDate: async (ticker: string, date: string) => {
        const response = await api.get(`/stocks/price/${ticker}/${date}`);
        return response.data.price;
    },

    // Get Sector Performance
    getSectorPerformance: async () => {
        const response = await api.get('/market/sectors');
        return response.data;
    }
};

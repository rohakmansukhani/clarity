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
    chatWithAI: async (query: string, context?: any) => {
        const response = await api.post('/ai/chat', {
            query,
            context
        });
        // Backend returns { response: "string" }
        return response.data.response;
    }
};

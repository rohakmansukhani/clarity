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

    // Get AI Analysis (The Brain)
    getAIAnalysis: async (symbol: string) => {
        // We use the chat endpoint for comprehensive analysis for now
        const response = await api.post('/ai/chat', {
            query: `Analyze ${symbol}`,
            context: { type: 'stock_analysis', symbol: symbol }
        });
        return response.data;
    }
};

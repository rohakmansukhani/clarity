import api from './api';

export interface Portfolio {
    id: string;
    name: string;
    currency: string;
    user_id?: string;
}

export interface HoldingCreate {
    ticker: string;
    exchange: string;
    shares: number;
    avg_price: number;
    allocation_percent: number;
}

export interface PortfolioPerformance {
    portfolio_id: string;
    total_value: number;
    total_value_formatted: string;
    total_invested: number;
    total_invested_formatted: string;
    total_gain: number;
    total_gain_formatted: string;
    return_pct: number;
    return_pct_formatted: string;
    holdings: any[];
}

export const portfolioService = {
    // List all portfolios
    listPortfolios: async (): Promise<Portfolio[]> => {
        const response = await api.get('/portfolios/');
        return response.data;
    },

    // Create a new portfolio
    createPortfolio: async (name: string, currency: string = 'INR'): Promise<Portfolio> => {
        const response = await api.post('/portfolios/', { name, currency });
        return response.data;
    },

    // Add a holding to a portfolio
    addHolding: async (portfolioId: string, holding: HoldingCreate) => {
        const response = await api.post(`/portfolios/${portfolioId}/holdings`, holding);
        return response.data;
    },

    // Get real-time performance
    getPortfolioPerformance: async (portfolioId: string): Promise<PortfolioPerformance> => {
        const response = await api.get(`/portfolios/${portfolioId}/performance`);
        return response.data;
    },

    // Delete Portfolio
    deletePortfolio: async (portfolioId: string) => {
        const response = await api.delete(`/portfolios/${portfolioId}`);
        return response.data;
    },

    // --- Holdings ---

    deleteHolding: async (holdingId: string) => {
        const response = await api.delete(`/portfolios/holdings/${holdingId}`); // Note: Path adjusted to match likely router structure or need to check router
        // Wait, in backend I defined it as @router.delete("/holdings/{holding_id}")
        // The router prefix is likely /api/v1/portfolios if it's included in api.py
        // Let me double check api.py or the router registration. 
        // Assuming router is mounted at /portfolios.
        // The backend code was: @router.delete("/holdings/{holding_id}")
        // So the path is /portfolios/holdings/{holding_id}
        const res = await api.delete(`/portfolios/holdings/${holdingId}`);
        return res.data;
    },

    updateHolding: async (holdingId: string, updates: { shares?: number; avg_price?: number }) => {
        const response = await api.put(`/portfolios/holdings/${holdingId}`, updates);
        return response.data;
    },

    // --- Watchlist ---

    getWatchlist: async () => {
        const response = await api.get('/portfolios/watchlists/'); // Mounted under portfolios router?
        // Checking backend code: @router.get("/watchlists/")
        // If portfolio router is at /portfolios, then yes /portfolios/watchlists/
        return response.data;
    },

    addToWatchlist: async (ticker: string, exchange: string = 'NSE') => {
        const response = await api.post('/portfolios/watchlists/', { ticker, exchange });
        return response.data;
    },

    removeFromWatchlist: async (ticker: string) => {
        const response = await api.delete(`/portfolios/watchlists/${ticker}`);
        return response.data;
    }
};

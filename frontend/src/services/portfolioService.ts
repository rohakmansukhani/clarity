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
    }
};

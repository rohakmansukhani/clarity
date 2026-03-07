// Mutual Fund Service
import api from './api'; // assuming api is an axios instance or similar wrapper configured in the project

export interface MutualFundSearchResult {
    schemeCode: string;
    schemeName: string;
}

export interface MutualFundDetails {
    meta: {
        fund_house: string;
        scheme_type: string;
        scheme_category: string;
        scheme_code: string;
        scheme_name: string;
    };
    data: {
        date: string;
        nav: string;
    }[];
}

export interface SIPCalculationRequest {
    type: 'sip' | 'lumpsum';
    amount: number;
    return_pct: number;
    tenure_years: number;
}

export interface SIPCalculationResponse {
    total_investment: number;
    maturity_value: number;
    wealth_gain: number;
    year_wise: {
        year: number;
        invested_amount: number;
        wealth_gain: number;
        total_value: number;
    }[];
}

export interface MutualFundHolding {
    id: string;
    scheme_code: string;
    scheme_name: string;
    units: number;
    avg_nav: number;
    current_nav?: number;
}

class MutualFundService {
    async searchFunds(query: string): Promise<MutualFundSearchResult[]> {
        const response = await api.get('/mutual-funds/search', { params: { q: query } });
        return response.data;
    }

    async getFundDetails(schemeCode: string): Promise<MutualFundDetails> {
        const response = await api.get(`/mutual-funds/${schemeCode}`);
        return response.data;
    }

    async calculateSIP(request: SIPCalculationRequest): Promise<SIPCalculationResponse> {
        const endpoint = request.type === 'sip' ? '/calculator/sip' : '/calculator/lumpsum';
        const payload = request.type === 'sip'
            ? { monthly_amount: request.amount, return_pct: request.return_pct, tenure_years: request.tenure_years }
            : { amount: request.amount, return_pct: request.return_pct, tenure_years: request.tenure_years };

        const response = await api.post(`/mutual-funds${endpoint}`, payload);
        return response.data;
    }

    // Holdings Endpoints
    async getHoldings(): Promise<MutualFundHolding[]> {
        const response = await api.get('/mutual-funds/holdings');
        return response.data;
    }

    async addHolding(holding: Omit<MutualFundHolding, 'id'>) {
        const response = await api.post('/mutual-funds/holdings', holding);
        return response.data;
    }

    async deleteHolding(id: string) {
        const response = await api.delete(`/mutual-funds/holdings/${id}`);
        return response.data;
    }
}

export const mutualFundService = new MutualFundService();

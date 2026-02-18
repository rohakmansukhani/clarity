import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Create Axios instance with base URL
// Helper to determine base URL
const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return '/api/v1';
    }
    return process.env.BACKEND_SERVER_URL
        ? `${process.env.BACKEND_SERVER_URL}/api/v1`
        : 'http://localhost:8000/api/v1';
};

const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        // Dynamic baseURL assignment to prevent build-time/init-time mismatches
        config.baseURL = getBaseUrl();

        try {
            // Auth Token Logic
            const { data: { session } } = await supabase.auth.getSession();
            let token = session?.access_token;

            if (!token && typeof window !== 'undefined') {
                token = localStorage.getItem('token') || undefined;
            }

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error setting auth header:", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;
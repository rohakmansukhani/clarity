import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Create Axios instance with base URL
// Default to relative path (Browser-safe)
const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        // "Brutal Fix": Force baseURL at request time to prevent any shared state/build issues
        if (typeof window !== 'undefined') {
            config.baseURL = '/api/v1';
            // console.debug('API Request (Browser):', config.url, 'Base:', config.baseURL);
        } else {
            const serverUrl = process.env.BACKEND_SERVER_URL || 'http://localhost:8000';
            config.baseURL = `${serverUrl}/api/v1`;
            // console.debug('API Request (Server):', config.url, 'Base:', config.baseURL);
        }

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
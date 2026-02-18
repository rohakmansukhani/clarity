import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Create Axios instance with base URL
const getBaseUrl = () => {
    // In the browser, always use relative path to route through Next.js proxy
    // This avoids Mixed Content errors (HTTPS -> HTTP) and CORS issues
    if (typeof window !== 'undefined') {
        return '/api/v1';
    }
    // Server-side (SSR), use the full URL from env or default
    return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_SERVER_URL || 'http://localhost:8000/api/v1';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor — attach auth token to every request
api.interceptors.request.use(
    async (config) => {
        try {
            // First try to get token from Supabase client session
            const { data: { session } } = await supabase.auth.getSession();
            let token = session?.access_token;

            // Fallback to localStorage 'token' (used by custom backend login in LoginPage.tsx)
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
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
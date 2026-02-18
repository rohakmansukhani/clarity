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
        // OVERRIDE for Server-Side only
        if (typeof window === 'undefined') {
            const serverUrl = process.env.BACKEND_SERVER_URL || 'http://localhost:8000';
            config.baseURL = `${serverUrl}/api/v1`;
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
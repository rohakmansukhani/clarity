'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // 1. Get Session from URL (Supabase handles the hash parsing)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) {
                    console.error("Auth Callback Error:", error);
                    router.push('/login?error=auth_failed');
                    return;
                }

                // 2. Set the 'token' cookie (required by Middleware)
                // Note: Security-wise, HttpOnly cookies via server are better, 
                // but this matches the existing 'login/page.tsx' implementation.
                document.cookie = `token=${session.access_token}; path=/; max-age=86400; SameSite=Lax`;

                // 3. Set localStorage (required by Dashboard UI)
                const userMetadata = session.user.user_metadata;

                // Construct a user object similar to what the manual login returns
                // to keep dashboard happy (it looks for user.user_metadata or user.full_name)
                const userObject = {
                    ...session.user,
                    // If your backend login returns a flat 'full_name', we simulate it here just in case
                    full_name: userMetadata.full_name || userMetadata.name || session.user.email,
                };

                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(userObject));

                // 4. Redirect to Dashboard
                router.push('/dashboard');

            } catch (err) {
                console.error("Callback Exception:", err);
                router.push('/login?error=callback_exception');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#0B0B0B',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
        }}>
            <CircularProgress size={40} sx={{ color: '#00E5FF' }} />
            <Typography sx={{ color: '#666', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                Authenticating...
            </Typography>
        </Box>
    );
}

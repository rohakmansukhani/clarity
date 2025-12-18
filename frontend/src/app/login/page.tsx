'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Container, Grid, CircularProgress } from '@mui/material';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User } from 'lucide-react';
import api from '@/services/api';
import { ErrorBanner } from '@/components/common/ErrorBanner';

// ... imports ...

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const controls = useAnimation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Call Backend API using configured instance
            const response = await api.post('/auth/login', {
                email,
                password
            });

            const { access_token, user } = response.data;

            // Save Token (Cookie for Middleware, LocalStorage for Client calls)
            document.cookie = `token=${access_token}; path=/; max-age=86400; SameSite=Lax`; // 1 day
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            router.push('/dashboard');
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");

            // Trigger Shake Animation
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
            });
            // Clear password on error for UX
            if (err.response?.status === 401) setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B', // Almost black, deeper than slate
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
                    {/* Left: Brand / Editorial */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem' },
                                    fontWeight: 700,
                                    lineHeight: { xs: 1, md: 0.9 },
                                    letterSpacing: '-0.04em',
                                    mb: { xs: 2, md: 4 },
                                    mt: { xs: 0, md: -5 }
                                }}
                            >
                                CLARITY
                                <Box component="span" sx={{ color: '#00E5FF' }}>.</Box>
                            </Typography>

                            <Typography variant="h5" sx={{
                                fontWeight: 400,
                                color: '#A0A0A0',
                                maxWidth: 400,
                                mb: { xs: 4, md: 6 },
                                fontSize: { xs: '1.2rem', md: '1.5rem' },
                                lineHeight: 1.4
                            }}>
                                Easy investing analysis for everyone.
                            </Typography>

                            <MarketMetrics />
                        </motion.div>
                    </Grid>

                    {/* Right: Minimal Form */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ ml: 'auto' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >

                            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {error && (
                                    <ErrorBanner error={error} onRetry={() => setError(null)} />
                                )}

                                <motion.div
                                    animate={controls}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
                                >
                                    <MinimalInput
                                        label="EMAIL"
                                        placeholder="name@example.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        icon={<User size={18} color="#666" />}
                                    />
                                    <MinimalInput
                                        label="PASSWORD"
                                        placeholder="••••••••"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        icon={<Lock size={18} color="#666" />}
                                    />
                                </motion.div>

                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        mt: 2,
                                        py: 2.5,
                                        borderRadius: '16px', // Apple-style rounded rect
                                        bgcolor: '#fff', // White primary
                                        color: '#000',
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                        textTransform: 'none', // Remove uppercase for friendlier UI
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        opacity: loading ? 0.7 : 1,
                                        boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
                                        '&:hover': {
                                            bgcolor: '#f0f0f0',
                                            transform: 'scale(1.02)',
                                            boxShadow: '0 8px 30px rgba(255,255,255,0.2)'
                                        },
                                        '&:active': { transform: 'scale(0.98)' }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                                </Button>

                                <Box sx={{ textAlign: 'center', mt: 1 }}>
                                    <Link href="/signup" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
                                        Don't have an account? <span style={{ color: '#fff' }}>Join Clarity</span>
                                    </Link>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Decorative Grid Lines or Footer */}
            <Box
                sx={{
                    position: 'absolute', // Fixed causing issues on small screens overlap
                    bottom: { xs: 20, md: 40 },
                    left: { xs: 20, md: 40 },
                    right: { xs: 20, md: 40 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#333',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                    letterSpacing: '0.1em',
                    width: 'auto'
                }}
            >
                <Typography variant="inherit">© 2025 Clarity Financial</Typography>
            </Box>
        </Box>
    );
}

// --- Components ---

function MarketMetrics() {
    const [status, setStatus] = useState<any[]>([]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // Use configured api instance
                const res = await api.get('/market/status');
                setStatus(res.data);
            } catch (e) {
                console.error("Market Status Error", e);
                // Fallback
                setStatus([
                    { index: "MARKET", current: "OPEN", status: "OPEN" },
                    { index: "SENSEX", current: "72,400", percent_change: 0 },
                    { index: "NIFTY 50", current: "21,800", percent_change: 0 }
                ]);
            }
        };
        fetchStatus();
    }, []);

    const nifty = status.find(s => s.index === "NIFTY 50");
    const sensex = status.find(s => s.index === "SENSEX");

    const isMarketOpen = nifty?.status === 'OPEN';
    const marketStatusColor = isMarketOpen ? '#10B981' : '#EF4444';
    const marketStatusText = isMarketOpen ? 'OPEN' : 'CLOSED';

    if (status.length === 0) return (
        <Box sx={{ display: 'flex', gap: 4 }}>
            <Metric label="MARKET" value="LOADING..." color="#666" />
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', gap: 4 }}>
            {/* 1. Market Status */}
            <Metric
                label="MARKET"
                value={marketStatusText}
                color={marketStatusColor}
            />

            {/* 2. Nifty */}
            <Metric
                label="NIFTY"
                value={nifty?.current && typeof nifty.current === 'number' ? nifty.current.toLocaleString() : (nifty?.error ? "N/A" : "...")}
                color={nifty?.percent_change && nifty.percent_change >= 0 ? '#10B981' : (nifty?.percent_change < 0 ? '#EF4444' : '#fff')}
            />

            {/* 3. Sensex */}
            <Metric
                label="SENSEX"
                value={typeof sensex?.current === 'number' ? sensex.current.toLocaleString() : "..."}
            />
        </Box>
    );
}

interface MinimalInputProps {
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon?: React.ReactNode;
}

function MinimalInput({ label, type, placeholder, value, onChange, icon }: MinimalInputProps) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: '#666',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        fontSize: '0.75rem'
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <TextField
                fullWidth
                variant="standard"
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                InputProps={{
                    disableUnderline: true,
                    endAdornment: icon ? <Box sx={{ opacity: 0.5 }}>{icon}</Box> : null,
                    sx: {
                        fontSize: '1.2rem',
                        color: '#fff',
                        fontWeight: 500,
                        pb: 1.5,
                        borderBottom: '1px solid #333',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        '&:hover': { borderBottom: '1px solid #666' },
                        '&.Mui-focused': { borderBottom: '1px solid #fff' }
                    }
                }}
                sx={{
                    '& input::placeholder': { color: '#444', opacity: 1 }
                }}
            />
        </Box>
    );
}

function Metric({ label, value, color }: { label: string, value: string, color?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: '#444', display: 'block', letterSpacing: '0.05em', mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h6" sx={{ color: color || '#fff', fontWeight: 600 }}>
                {value}
            </Typography>
        </Box>
    );
}

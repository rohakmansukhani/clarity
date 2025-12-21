'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Container, Grid, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { ErrorBanner } from '@/components/common/ErrorBanner';

import { supabase } from '@/lib/supabase';

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSocialLogin = async (provider: 'google') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error("Social signup error", err);
            setError(err.message || "Failed to start social signup");
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/register', {
                email,
                password,
                full_name: name
            });
            // Redirect to "Check Email" page
            router.push('/auth/check-email');
        } catch (err: any) {
            console.error("Signup failed", err);
            setError(err.response?.data?.detail || "Registration failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B',
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
                    {/* Left: Brand */}
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
                                JOIN
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
                                Start your journey to financial clarity today.
                            </Typography>
                        </motion.div>
                    </Grid>

                    {/* Right: Form */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ ml: 'auto' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {error && (
                                    <ErrorBanner error={error} onRetry={() => setError(null)} />
                                )}

                                <MinimalInput
                                    label="FULL NAME"
                                    placeholder="John Doe"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <MinimalInput
                                    label="EMAIL"
                                    placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <MinimalInput
                                    label="PASSWORD"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        mt: 4,
                                        py: 2.5,
                                        borderRadius: '4px',
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        opacity: loading ? 0.7 : 1,
                                        '&:hover': {
                                            bgcolor: '#fff',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>

                                <Box sx={{ textAlign: 'center' }}>
                                    <Link href="/login" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                        ALREADY HAVE AN ACCOUNT? <span style={{ color: '#fff', borderBottom: '1px solid #fff' }}>LOGIN</span>
                                    </Link>
                                </Box>

                                {/* Divider */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1, opacity: 0.5 }}>
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: '#333' }} />
                                    <Typography variant="caption" sx={{ color: '#666' }}>OR JOIN WITH</Typography>
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: '#333' }} />
                                </Box>

                                {/* Social Login Buttons */}
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        fullWidth
                                        onClick={() => handleSocialLogin('google')}
                                        sx={{
                                            py: 1.5,
                                            borderRadius: '8px', // Slightly rounded
                                            bgcolor: '#111',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            '&:hover': { bgcolor: '#222', borderColor: '#666' }
                                        }}
                                        startIcon={
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        }
                                    >
                                        Google
                                    </Button>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            <Box
                sx={{
                    position: 'absolute',
                    bottom: { xs: 20, md: 40 },
                    left: { xs: 20, md: 40 },
                    right: { xs: 20, md: 40 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#333',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                    letterSpacing: '0.1em'
                }}
            >
                <Typography variant="inherit">© 2025 Clarity Financial</Typography>
            </Box>
        </Box>
    );
}

interface MinimalInputProps {
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function MinimalInput({ label, type, placeholder, value, onChange }: MinimalInputProps) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{
                    color: '#666',
                    mb: 1,
                    display: 'block',
                    fontWeight: 600,
                    letterSpacing: '0.1em'
                }}
            >
                {label}
            </Typography>
            <TextField
                fullWidth
                variant="standard"
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                InputProps={{
                    disableUnderline: true,
                    sx: {
                        fontSize: '1.5rem',
                        color: '#fff',
                        fontWeight: 500,
                        pb: 1,
                        borderBottom: '1px solid #333',
                        transition: 'border-color 0.3s',
                        '&:hover': { borderBottom: '1px solid #666' },
                        '&.Mui-focused': { borderBottom: '1px solid #00E5FF' }
                    }
                }}
                sx={{
                    '& input::placeholder': { color: '#333', opacity: 1 }
                }}
            />
        </Box>
    );
}

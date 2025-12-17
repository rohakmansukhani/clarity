'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Container, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            router.push('/dashboard');
        }, 1500);
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

                            <Box sx={{ display: 'flex', gap: 4 }}>
                                <Metric label="MARKET" value="OPEN" color="#10B981" />
                                <Metric label="SENSEX" value="72,400" />
                                <Metric label="NIFTY" value="21,800" />
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Right: Minimal Form */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ ml: 'auto' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <MinimalInput label="EMAIL" placeholder="name@example.com" type="email" />
                                <MinimalInput label="PASSWORD" placeholder="••••••••" type="password" />

                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        mt: 4,
                                        py: 2.5,
                                        borderRadius: '4px', // Less rounded, more structured
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        '&:hover': {
                                            bgcolor: '#fff',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    {loading ? 'Initializing...' : 'Get Started'}
                                </Button>

                                <Box sx={{ textAlign: 'center' }}>
                                    <Link href="/signup" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                        NEW HERE? <span style={{ color: '#fff', borderBottom: '1px solid #fff' }}>JOIN CLARITY</span>
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

function MinimalInput({ label, type, placeholder }: { label: string, type: string, placeholder: string }) {
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

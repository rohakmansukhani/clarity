'use client';

import React, { useState } from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { useColorMode } from '@/theme/ThemeContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

import StockSearchInput from '@/components/market/StockSearchInput';
import { marketService } from '@/services/marketService';

export default function MarketHome() {
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();
    const [query, setQuery] = useState('');
    const [movers, setMovers] = useState<any[]>([]);
    const [loadingMovers, setLoadingMovers] = useState(true);

    React.useEffect(() => {
        const fetchMovers = async () => {
            try {
                const data = await marketService.getTopMovers();
                setMovers(data || []);
            } catch (e) {
                console.error("Failed to fetch top movers", e);
            } finally {
                setLoadingMovers(false);
            }
        };
        fetchMovers();
    }, []);

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pt: 10,
                px: 2,
                position: 'relative',
                bgcolor: 'background.default'
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 680 }}>
                {/* Hero Title */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', md: '5rem' },
                            fontWeight: 700,
                            textAlign: 'center',
                            mb: 2,
                            letterSpacing: '-0.03em',
                            lineHeight: 1,
                            color: theme.palette.text.primary
                        }}
                    >
                        MARKET<br />INTELLIGENCE
                        <Box component="span" sx={{ color: theme.palette.primary.main }}>.</Box>
                    </Typography>

                    <Typography variant="h5" sx={{ textAlign: 'center', color: theme.palette.text.secondary, mb: 8, fontWeight: 400 }}>
                        Search any asset to unlock AI-powered insights.
                    </Typography>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <StockSearchInput
                        value={query}
                        onChange={setQuery}
                        onSelect={(item) => router.push(`/market/${item.symbol}`)}
                        placeholder="Type a symbol (e.g. RELIANCE)..."
                        variant="hero"
                        autoFocus
                    />
                </motion.div>

                {/* Trending Chips */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                >
                    <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flame size={14} color={theme.palette.primary.main} />
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, letterSpacing: '0.12em', fontWeight: 700, fontSize: '0.7rem' }}>
                                TRENDING TODAY
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', minHeight: '32px' }}>
                            {loadingMovers ? (
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Loading...</Typography>
                            ) : movers.length > 0 ? (
                                movers.map((stock, i) => (
                                    <motion.div
                                        key={stock.symbol}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Chip
                                            label={`${stock.symbol} ${stock.change}`}
                                            onClick={() => router.push(`/market/${stock.symbol}`)}
                                            sx={{
                                                bgcolor: theme.palette.background.paper,
                                                color: stock.isUp ? theme.palette.success.main : theme.palette.error.main,
                                                border: `1px solid ${theme.palette.divider}`,
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                boxShadow: mode === 'light' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
                                                '&:hover': {
                                                    bgcolor: theme.palette.background.paper,
                                                    borderColor: stock.isUp ? theme.palette.success.main : theme.palette.error.main,
                                                    boxShadow: mode === 'light' ? '0 4px 8px rgba(0,0,0,0.05)' : 'none'
                                                }
                                            }}
                                        />
                                    </motion.div>
                                ))
                            ) : (
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>No data available</Typography>
                            )}
                        </Box>
                    </Box>
                </motion.div>
            </Box>
        </Box>
    );
}


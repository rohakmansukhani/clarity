'use client';

import React, { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

import StockSearchInput from '@/components/market/StockSearchInput';

const TRENDING_STOCKS = [
    { symbol: 'RELIANCE', label: 'Reliance' },
    { symbol: 'TCS', label: 'TCS' },
    { symbol: 'HDFCBANK', label: 'HDFC Bank' },
    { symbol: 'INFY', label: 'Infosys' },
    { symbol: 'BAJFINANCE', label: 'Bajaj Finance' },
    { symbol: 'TATAMOTORS', label: 'Tata Motors' },
    { symbol: 'WIPRO', label: 'Wipro' },
    { symbol: 'ADANIENT', label: 'Adani Ent.' },
];

export default function MarketHome() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pt: 10,
                px: 2,
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
                            lineHeight: 1
                        }}
                    >
                        MARKET<br />INTELLIGENCE
                        <Box component="span" sx={{ color: '#00E5FF' }}>.</Box>
                    </Typography>

                    <Typography variant="h5" sx={{ textAlign: 'center', color: '#666', mb: 8, fontWeight: 400 }}>
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
                            <Flame size={14} color="#00E5FF" />
                            <Typography variant="caption" sx={{ color: '#555', letterSpacing: '0.12em', fontWeight: 700, fontSize: '0.7rem' }}>
                                TRENDING TODAY
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                            {TRENDING_STOCKS.map((stock, i) => (
                                <motion.div
                                    key={stock.symbol}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.05 }}
                                >
                                    <Chip
                                        label={stock.label}
                                        onClick={() => router.push(`/market/${stock.symbol}`)}
                                        icon={<TrendingUp size={12} />}
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.04)',
                                            color: '#888',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            fontSize: '0.78rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '& .MuiChip-icon': { color: '#555' },
                                            '&:hover': {
                                                bgcolor: 'rgba(0, 229, 255, 0.08)',
                                                color: '#00E5FF',
                                                borderColor: 'rgba(0, 229, 255, 0.3)',
                                                '& .MuiChip-icon': { color: '#00E5FF' },
                                            }
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </Box>
                    </Box>
                </motion.div>
            </Box>
        </Box>
    );
}

'use client';

import React, { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

import StockSearchInput from '@/components/market/StockSearchInput';
import { marketService } from '@/services/marketService';

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
    const [rsiData, setRsiData] = React.useState<Record<string, any>>({});

    React.useEffect(() => {
        const fetchRSI = async () => {
            const data: Record<string, any> = {};
            // Fetch in parallel using authenticated proxy-aware service
            await Promise.all(TRENDING_STOCKS.map(async (stock) => {
                try {
                    const result = await marketService.getTechnicalSummary(stock.symbol);
                    if (result) {
                        data[stock.symbol] = result;
                    }
                } catch (e) {
                    // silently ignore — RSI badges are optional
                }
            }));
            setRsiData(data);
        };

        fetchRSI();
    }, []);

    const getRSIColor = (rsi: number) => {
        if (rsi < 30) return '#10B981'; // Oversold - Buy
        if (rsi > 70) return '#EF4444'; // Overbought - Sell
        return '#666';
    };

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
                            {TRENDING_STOCKS.map((stock, i) => {
                                const rsi = rsiData[stock.symbol]?.rsi;
                                const rsiColor = rsi ? getRSIColor(rsi) : '#666';

                                return (
                                    <motion.div
                                        key={stock.symbol}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Chip
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {stock.label}
                                                    {rsi && (
                                                        <Typography variant="caption" sx={{ color: rsiColor, fontWeight: 700, fontSize: '0.65rem' }}>
                                                            {Math.round(rsi)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            onClick={() => router.push(`/market/${stock.symbol}`)}
                                            sx={{
                                                bgcolor: '#111',
                                                color: '#888',
                                                border: '1px solid #333',
                                                fontWeight: 500,
                                                '&:hover': {
                                                    bgcolor: '#222',
                                                    color: '#fff',
                                                    borderColor: '#444'
                                                }
                                            }}
                                        />
                                    </motion.div>
                                );
                            })}
                        </Box>
                    </Box>
                </motion.div>
            </Box>
        </Box>
    );
}


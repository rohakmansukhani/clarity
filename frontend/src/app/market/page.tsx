'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemButton, Paper, Container } from '@mui/material';
import { Search, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import StockSearchInput from '@/components/market/StockSearchInput';

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
                pt: 10
            }}
        >
            <Container maxWidth="md">
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

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <Box sx={{ width: '100%' }}>
                        <StockSearchInput
                            value={query}
                            onChange={setQuery}
                            onSelect={(item) => router.push(`/market/${item.symbol}`)}
                            placeholder="Type a symbol (e.g. RELIANCE)..."
                            variant="hero"
                            autoFocus
                        />
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}

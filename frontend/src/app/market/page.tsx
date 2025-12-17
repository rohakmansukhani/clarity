'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemButton, Paper, Container } from '@mui/material';
import { Search, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';
import { motion, AnimatePresence } from 'framer-motion';

export default function MarketHome() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length > 2) {
            setLoading(true);
            try {
                const res = await marketService.searchStocks(val);
                setResults(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        } else {
            setResults([]);
        }
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
                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            variant="standard"
                            placeholder="Type a symbol (e.g. RELIANCE)..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            InputProps={{
                                disableUnderline: true,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={28} color={query ? "#fff" : "#666"} />
                                    </InputAdornment>
                                ),
                                sx: {
                                    fontSize: { xs: '1.5rem', md: '2rem' },
                                    fontWeight: 500,
                                    color: '#fff',
                                    py: 2,
                                    borderBottom: '2px solid #333',
                                    transition: 'all 0.3s',
                                    '&.Mui-focused': {
                                        borderBottom: '2px solid #00E5FF'
                                    }
                                }
                            }}
                        />

                        {/* Results Dropdown */}
                        <AnimatePresence>
                            {results.length > 0 && (
                                <Paper
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    sx={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        mt: 2,
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        bgcolor: '#111',
                                        border: '1px solid #222',
                                        zIndex: 10
                                    }}
                                >
                                    <List>
                                        {results.map((item: any) => (
                                            <ListItem key={item.symbol} disablePadding>
                                                <ListItemButton
                                                    onClick={() => router.push(`/market/${item.symbol}`)}
                                                    sx={{
                                                        py: 2.5,
                                                        px: 3,
                                                        borderBottom: '1px solid #222',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.05)' }
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{item.symbol}</Typography>
                                                        <Typography variant="body2" sx={{ color: '#666' }}>{item.name}</Typography>
                                                    </Box>
                                                    <ArrowRight size={20} color="#333" />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            )}
                        </AnimatePresence>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}

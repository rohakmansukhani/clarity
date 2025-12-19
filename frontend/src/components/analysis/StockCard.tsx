import React from 'react';
import { Paper, Box, Typography, IconButton, Skeleton } from '@mui/material';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StockCardProps {
    symbol: string;
    companyName?: string;
    stockData?: {
        price: string;
        change: string;
        up: boolean;
    };
    isComparing: boolean;
    onRemove: () => void;
}

export function StockCard({ symbol, companyName, stockData, isComparing, onRemove }: StockCardProps) {
    return (
        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        bgcolor: '#0A0A0A',
                        border: '1px solid #222',
                        borderRadius: 4,
                        height: { xs: 180, md: 240 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': { transform: 'scale(1.02)', bgcolor: '#151515', borderColor: '#333' }
                    }}
                >
                    {!isComparing && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            sx={{ position: 'absolute', top: 16, right: 16, color: '#444', bgcolor: '#1A1A1A', '&:hover': { color: '#fff', bgcolor: '#EF4444' } }}
                            size="small"
                        >
                            <X size={14} />
                        </IconButton>
                    )}

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', p: 3 }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                                background: '#ffffff',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.02em',
                                fontSize: symbol.length > 8 ? '1.5rem' : symbol.length > 6 ? '1.75rem' : '2rem',
                                textAlign: 'center',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                lineHeight: 1.2
                            }}
                        >
                            {symbol}
                        </Typography>

                        {stockData ? (
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ fontWeight: 600, color: '#fff', fontSize: isComparing ? '1.5rem' : '2rem', letterSpacing: '-0.03em', mb: 1 }}>{stockData.price}</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: '99px', bgcolor: stockData.up ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                    {stockData.up ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
                                    <Typography variant="caption" sx={{ color: stockData.up ? '#10B981' : '#EF4444', fontWeight: 700 }}>{stockData.change}</Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', textAlign: 'center' }}>
                                <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: '#1a1a1a', mx: 'auto', mb: 1 }} />
                                <Skeleton variant="rectangular" width={80} height={24} sx={{ bgcolor: '#1a1a1a', mx: 'auto', borderRadius: '99px' }} />
                            </Box>
                        )}
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
}

'use client';

import React, { useState } from 'react';
import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

interface StockQuickCardProps {
    stock: StockRecommendation;
    isSelected: boolean;
    onToggleSelect: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    index?: number;
}

export default function StockQuickCard({ stock, isSelected, onToggleSelect, isExpanded, onToggleExpand, index = 0 }: StockQuickCardProps) {
    const theme = useTheme();
    const { mode } = useColorMode();

    const isPositive = (stock.change || 0) >= 0;
    const actionColor = stock.action === 'BUY' ? '#10B981' : stock.action === 'SELL' ? '#EF4444' : '#F59E0B';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Paper
                sx={{
                    bgcolor: 'background.paper',
                    borderRadius: '16px',
                    border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&:hover': {
                        borderColor: isSelected ? 'primary.main' : 'text.secondary',
                        transform: 'translateY(-4px)',
                        boxShadow: mode === 'dark' ? '0 12px 24px -8px rgba(0,0,0,0.5)' : '0 12px 24px -8px rgba(0,0,0,0.1)'
                    }
                }}
            >
                {/* Background Glow for Selected */}
                {isSelected && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        p: 0.5,
                        borderBottomLeftRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 1
                    }}>
                        <Check size={14} strokeWidth={3} />
                    </Box>
                )}

                {/* Header */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                        p: 3,
                        pb: 0
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {stock.symbol}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {stock.name || 'Company Name'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                            label={stock.action}
                            sx={{
                                bgcolor: `${actionColor}20`,
                                color: actionColor,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                height: 24,
                                borderRadius: 2
                            }}
                        />
                    </Box>
                </Box>

                {/* Price & Score */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                        px: 3
                    }}
                >
                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {stock.score}
                        </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            ₹{stock.price.toLocaleString()}
                        </Typography>
                        {stock.change !== undefined && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', color: isPositive ? 'success.main' : 'error.main' }}>
                                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {isPositive ? '+' : ''}{stock.change.toFixed(2)}%
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Reasoning Section */}
                <Box sx={{ px: 3, pb: 2, position: 'relative', zIndex: 1 }}>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.secondary',
                                        lineHeight: 1.6,
                                        pt: 1,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        mb: 2
                                    }}
                                >
                                    {stock.reasoning}
                                </Typography>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button
                        fullWidth
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        endIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        sx={{
                            color: 'text.secondary',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            '&:hover': {
                                color: 'primary.main',
                                bgcolor: 'transparent'
                            }
                        }}
                    >
                        {isExpanded ? 'Hide Details' : 'View Reasoning'}
                    </Button>
                </Box>
            </Paper>
        </motion.div>
    );
}

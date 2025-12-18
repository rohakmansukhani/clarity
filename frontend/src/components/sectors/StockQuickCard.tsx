'use client';

import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

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
    index: number;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleSelect: () => void;
}

export default function StockQuickCard({
    stock,
    index,
    isSelected,
    isExpanded,
    onToggleExpand,
    onToggleSelect
}: StockQuickCardProps) {
    const isPositive = (stock.change || 0) >= 0;
    const actionColor = stock.action === 'BUY' ? '#10B981' : stock.action === 'SELL' ? '#EF4444' : '#F59E0B';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Paper
                sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: '#0A0A0A',
                    border: isSelected ? `2px solid #00E5FF` : '1px solid #222',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: isSelected ? '#00E5FF' : '#444',
                        bgcolor: '#111'
                    }
                }}
            >
                {/* Background Glow for Selected */}
                {isSelected && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -50,
                            right: -50,
                            width: 150,
                            height: 150,
                            borderRadius: '50%',
                            filter: 'blur(60px)',
                            opacity: 0.2,
                            bgcolor: '#00E5FF'
                        }}
                    />
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
                        zIndex: 1
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {stock.symbol}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                            {stock.name}
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
                        {isSelected && (
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: '#00E5FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Typography sx={{ color: '#000', fontSize: '0.75rem', fontWeight: 700 }}>
                                    ✓
                                </Typography>
                            </Box>
                        )}
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
                        zIndex: 1
                    }}
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            ₹{stock.price.toLocaleString()}
                        </Typography>
                        {stock.change !== undefined && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                {isPositive ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                <Typography variant="caption" sx={{ color: isPositive ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                    {isPositive ? '+' : ''}{stock.change}%
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                            Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#00E5FF' }}>
                            {stock.score}
                        </Typography>
                    </Box>
                </Box>

                {/* Reasoning Preview */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        mb: isExpanded ? 0 : 2
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#888',
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: isExpanded ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}
                    >
                        {stock.reasoning}
                    </Typography>
                </Box>

                {/* Expand Button */}
                <Box
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                    }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        pt: 2,
                        borderTop: '1px solid #222',
                        color: '#666',
                        transition: 'color 0.2s',
                        position: 'relative',
                        zIndex: 1,
                        '&:hover': {
                            color: '#00E5FF'
                        }
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {isExpanded ? 'Show Less' : 'View Details'}
                    </Typography>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Box>
            </Paper>
        </motion.div>
    );
}

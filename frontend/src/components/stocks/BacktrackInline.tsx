'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BacktrackInlineProps {
    symbol: string;
    startPrice: number;
    currentPrice: number;
    timeRange: string;
}

const BacktrackInline: React.FC<BacktrackInlineProps> = ({ symbol, startPrice, currentPrice, timeRange }) => {
    const theme = useTheme();
    const [amount, setAmount] = useState<number>(1000);

    if (!startPrice || !currentPrice || startPrice <= 0) return null;

    const shares = amount / startPrice;
    const finalValue = shares * currentPrice;
    const pnl = finalValue - amount;
    const pnlPercent = (pnl / amount) * 100;
    const isPositive = pnl >= 0;

    const formatRange = (range: string) => {
        const r = range.toLowerCase();
        if (r === '1d') return 'at market open';
        if (r === '5d') return '5 days ago';
        if (r === '1mo' || r === '1m') return '1 month ago';
        if (r === '3mo' || r === '3m') return '3 months ago';
        if (r === '6mo' || r === '6m') return '6 months ago';
        if (r === '1y') return '1 year ago';
        if (r === '3y') return '3 years ago';
        if (r === '5y') return '5 years ago';
        if (r === 'ytd') return 'since start of year';
        if (r === 'max' || r === 'all') return 'at listing';
        return range.toUpperCase();
    };

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{
                mb: 3,
                px: 3,
                py: 2,
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                    If you had invested
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: `1px dashed ${theme.palette.primary.main}`, pb: 0.2 }}>
                    <Typography sx={{ color: theme.palette.primary.main, fontWeight: 700, mr: 0.5 }}>₹</Typography>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            fontSize: '1rem',
                            width: `${Math.max(40, amount.toString().length * 10)}px`,
                            outline: 'none',
                            padding: 0
                        }}
                    />
                </Box>

                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                    {formatRange(timeRange)}, it would be worth
                </Typography>

                <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 800 }}>
                    ₹{finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
            </Box>

            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: 2,
                bgcolor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isPositive ? '#10B981' : '#EF4444'
            }}>
                {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {isPositive ? '+' : ''}₹{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pnlPercent.toFixed(2)}%)
                </Typography>
            </Box>
        </Box>
    );
};

export default BacktrackInline;

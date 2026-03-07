'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SimulatedReturnsProps {
    symbol: string;
    startPrice: number;
    currentPrice: number;
    timeRange: string;
}

// Animated counter hook
function useAnimatedNumber(target: number, duration = 600) {
    const [display, setDisplay] = useState(target);
    const raf = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef(target);

    useEffect(() => {
        const from = fromRef.current;
        const to = target;
        if (Math.abs(to - from) < 0.01) {
            setDisplay(to);
            return;
        }
        startRef.current = null;
        const animate = (timestamp: number) => {
            if (!startRef.current) startRef.current = timestamp;
            const elapsed = timestamp - startRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(from + (to - from) * eased);
            if (progress < 1) {
                raf.current = requestAnimationFrame(animate);
            } else {
                fromRef.current = to;
            }
        };
        raf.current = requestAnimationFrame(animate);
        return () => {
            if (raf.current) cancelAnimationFrame(raf.current);
            fromRef.current = target;
        };
    }, [target, duration]);

    return display;
}

const SimulatedReturns: React.FC<SimulatedReturnsProps> = ({ symbol, startPrice, currentPrice, timeRange }) => {
    const theme = useTheme();
    const [amount, setAmount] = useState<number>(10000);
    const isDark = theme.palette.mode === 'dark';

    if (!startPrice || !currentPrice || startPrice <= 0) return null;

    const shares = amount / startPrice;
    const finalValue = shares * currentPrice;
    const pnl = finalValue - amount;
    const pnlPercent = (pnl / amount) * 100;
    const isPositive = pnl >= 0;

    const positiveColor = '#10B981';
    const negativeColor = '#EF4444';
    const accentColor = isPositive ? positiveColor : negativeColor;

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
        if (r === 'ytd') return 'since Jan 1';
        if (r === 'max' || r === 'all') return 'at listing';
        return range.toUpperCase();
    };

    const AnimatedValue: React.FC<{ value: number }> = ({ value }) => {
        const animated = useAnimatedNumber(value);
        return <>{animated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>;
    };

    const AnimatedPnl: React.FC<{ value: number }> = ({ value }) => {
        const animated = useAnimatedNumber(Math.abs(value));
        return <>{animated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>;
    };

    const AnimatedPercent: React.FC<{ value: number }> = ({ value }) => {
        const animated = useAnimatedNumber(value);
        return <>{animated.toFixed(2)}</>;
    };

    return (
        <Box
            component={motion.div}
            key={`${timeRange}-${startPrice}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            sx={{
                mb: 3,
                borderRadius: 4,
                overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                position: 'relative',
            }}
        >
            {/* Accent bar at top */}
            <Box sx={{
                height: 3,
                background: isPositive
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : 'linear-gradient(90deg, #EF4444, #F87171)',
            }} />

            <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Clock size={13} color={theme.palette.text.disabled} />
                    <Typography
                        variant="caption"
                        sx={{
                            color: theme.palette.text.disabled,
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Simulated returns · {formatRange(timeRange)}
                    </Typography>
                </Box>

                {/* Main content row */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                }}>
                    {/* Left: sentence */}
                    <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.text.secondary, mb: 0.75, fontWeight: 500 }}
                        >
                            If you invested
                        </Typography>

                        {/* Editable amount */}
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            borderBottom: `2px solid ${theme.palette.primary.main}`,
                            pb: 0.25,
                            mb: 1.5,
                            width: { xs: '100%', sm: 'auto' }
                        }}>
                            <Typography sx={{
                                fontWeight: 800,
                                fontSize: '1.5rem',
                                color: theme.palette.primary.main,
                                lineHeight: 1,
                            }}>
                                ₹
                            </Typography>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setAmount(val ? Number(val) : 0);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: theme.palette.primary.main,
                                    fontWeight: 800,
                                    fontSize: '1.5rem',
                                    lineHeight: 1,
                                    width: '100%', // Take full width of container on mobile
                                    maxWidth: '300px', // But don't grow too large
                                    outline: 'none',
                                    padding: 0,
                                    MozAppearance: 'textfield',
                                }}
                            />
                        </Box>

                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}
                        >
                            would now be worth
                        </Typography>
                        <Typography
                            component={motion.p}
                            key={finalValue}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: 1 }}
                            sx={{
                                fontWeight: 800,
                                fontSize: '2rem',
                                color: theme.palette.text.primary,
                                lineHeight: 1.1,
                                mt: 0.5,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            ₹<AnimatedValue value={finalValue} />
                        </Typography>
                    </Box>

                    {/* Right: P&L badge */}
                    <Box
                        component={motion.div}
                        key={`pnl-${isPositive}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 3,
                            py: 2,
                            borderRadius: 3,
                            bgcolor: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            minWidth: 120,
                            gap: 0.5,
                            ml: { xs: 0, sm: 'auto' },
                            width: { xs: '100%', sm: 'auto' }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                            {isPositive
                                ? <TrendingUp size={18} color={positiveColor} />
                                : <TrendingDown size={18} color={negativeColor} />
                            }
                            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: accentColor }}>
                                {isPositive ? '+' : '-'}₹<AnimatedPnl value={pnl} />
                            </Typography>
                        </Box>
                        <Typography sx={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: accentColor,
                            opacity: 0.85,
                        }}>
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={pnlPercent.toFixed(1)}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {isPositive ? '+' : ''}<AnimatedPercent value={pnlPercent} />%
                                </motion.span>
                            </AnimatePresence>
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default SimulatedReturns;

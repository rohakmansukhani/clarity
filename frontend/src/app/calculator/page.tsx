'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    Box, Typography, Button, TextField, InputAdornment,
    useTheme, Divider, Grid, CircularProgress, Tooltip, Chip
} from '@mui/material';
import { Calculator, Info, TrendingUp, TrendingDown, Wallet, Search, X, CheckCircle, BarChart2, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parse } from 'date-fns';
import Sidebar from '@/components/layout/Sidebar';
import { useColorMode } from '@/theme/ThemeContext';
import { mutualFundService, MutualFundSearchResult } from '@/services/mutualFundService';
import { marketService } from '@/services/marketService';

// ─── MF CAGR: from NAV history (date format: 'dd-MM-yyyy') ───────────────────
function computeMFCAGR(navData: { date: string; nav: string }[]): { cagr: number; years: number } | null {
    if (!navData || navData.length < 2) return null;
    const latestNav = parseFloat(navData[0].nav);
    const latestDate = parse(navData[0].date, 'dd-MM-yyyy', new Date());
    for (const years of [3, 1]) {
        const cutoff = new Date(latestDate);
        cutoff.setFullYear(cutoff.getFullYear() - years);
        const pastEntry = navData.find(item => {
            try { return parse(item.date, 'dd-MM-yyyy', new Date()) <= cutoff; }
            catch { return false; }
        });
        if (pastEntry) {
            const pastNav = parseFloat(pastEntry.nav);
            if (pastNav > 0) {
                const cagr = (Math.pow(latestNav / pastNav, 1 / years) - 1) * 100;
                return { cagr: Math.round(cagr * 100) / 100, years };
            }
        }
    }
    return null;
}

// ─── Stock/ETF CAGR: from historical close prices ────────────────────────────
function computeStockCAGR(history: { date: string; close: number }[]): { cagr: number; years: number } | null {
    if (!history || history.length < 2) return null;
    // History is oldest → newest from API
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestClose = sorted[sorted.length - 1].close;
    const latestDate = new Date(sorted[sorted.length - 1].date);
    for (const years of [3, 1]) {
        const cutoff = new Date(latestDate);
        cutoff.setFullYear(cutoff.getFullYear() - years);
        // Find closest point at or before the cutoff
        const pastEntry = [...sorted].reverse().find(item => new Date(item.date) <= cutoff);
        if (pastEntry && pastEntry.close > 0) {
            const cagr = (Math.pow(latestClose / pastEntry.close, 1 / years) - 1) * 100;
            return { cagr: Math.round(cagr * 100) / 100, years };
        }
    }
    return null;
}
// ─────────────────────────────────────────────────────────────────────────────

interface UnifiedResult {
    name: string;
    id: string;           // schemeCode for MF, symbol for stock
    type: 'mf' | 'stock';
    exchange?: string;
    typeLabel?: string;   // e.g. "ETF", "NSE", "BSE"
}

interface Result {
    totalInvestment: number;
    wealthGain: number;
    maturityValue: number;
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

function calcSIP(amount: number, r: number, years: number): Result {
    const mr = r / 12 / 100;
    const n = years * 12;
    const mat = amount * (((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr));
    return { totalInvestment: amount * n, wealthGain: mat - amount * n, maturityValue: mat };
}

function calcLumpsum(amount: number, r: number, years: number): Result {
    const mat = amount * Math.pow(1 + r / 100, years);
    return { totalInvestment: amount, wealthGain: mat - amount, maturityValue: mat };
}

export default function CalculatorPage() {
    const theme = useTheme();
    const { mode } = useColorMode();
    const isDark = mode === 'dark';

    const [type, setType] = useState<'sip' | 'lumpsum'>('sip');
    const [amount, setAmount] = useState('10000');
    const [returnRate, setReturnRate] = useState('12');
    const [tenure, setTenure] = useState('10');
    const [calcResult, setCalcResult] = useState<Result | null>(null);

    // Unified search state
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<UnifiedResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingCAGR, setLoadingCAGR] = useState(false);
    const [cagrInfo, setCagrInfo] = useState<{ cagr: number; years: number; name: string; type: 'mf' | 'stock' } | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleQueryChange = useCallback((val: string) => {
        setQuery(val);
        if (!val.trim()) { setSuggestions([]); return; }
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
            setSearching(true);
            try {
                // Query both in parallel
                const [mfResults, stockResults] = await Promise.allSettled([
                    mutualFundService.searchFunds(val),
                    marketService.searchStocks(val, 'ALL'),
                ]);

                const mfItems: UnifiedResult[] = mfResults.status === 'fulfilled'
                    ? (mfResults.value as MutualFundSearchResult[]).slice(0, 4).map(f => ({
                        name: f.schemeName,
                        id: f.schemeCode,
                        type: 'mf' as const,
                        typeLabel: 'Mutual Fund',
                    }))
                    : [];

                const stockItems: UnifiedResult[] = stockResults.status === 'fulfilled'
                    ? (stockResults.value as any[]).slice(0, 4).map((s: any) => ({
                        name: s.name || s.symbol,
                        id: s.symbol,
                        type: 'stock' as const,
                        exchange: s.exchange,
                        typeLabel: s.type === 'ETF' ? 'ETF' : (s.exchange || 'NSE'),
                    }))
                    : [];

                setSuggestions([...stockItems, ...mfItems]);
            } catch { setSuggestions([]); }
            finally { setSearching(false); }
        }, 350);
    }, []);

    const handleSelect = useCallback(async (item: UnifiedResult) => {
        setSuggestions([]);
        setQuery(item.name);
        setLoadingCAGR(true);
        setCagrInfo(null);
        try {
            let info: { cagr: number; years: number } | null = null;
            if (item.type === 'mf') {
                const details = await mutualFundService.getFundDetails(item.id);
                info = computeMFCAGR(details.data || []);
            } else {
                const history = await marketService.getStockHistory(item.id, '3y');
                info = computeStockCAGR(Array.isArray(history) ? history : []);
            }
            if (info) {
                setCagrInfo({ ...info, name: item.name, type: item.type });
                setReturnRate(info.cagr.toFixed(2));
            }
        } catch { }
        finally { setLoadingCAGR(false); }
    }, []);

    const clearSelection = () => {
        setQuery('');
        setSuggestions([]);
        setCagrInfo(null);
    };

    const handleCalculate = () => {
        const a = parseFloat(amount);
        const r = parseFloat(returnRate);
        const t = parseFloat(tenure);
        if (isNaN(a) || isNaN(r) || isNaN(t) || a <= 0 || r <= 0 || t <= 0) return;
        setCalcResult(type === 'sip' ? calcSIP(a, r, t) : calcLumpsum(a, r, t));
    };

    const cardSx = {
        p: 3, borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: theme.palette.background.default, minHeight: '100dvh', color: theme.palette.text.primary }}>
            <Sidebar />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                sx={{
                    flexGrow: 1,
                    maxWidth: 680,
                    mx: 'auto',
                    px: { xs: 2, md: 4 },
                    pt: { xs: 4, md: 10 },
                    pb: 12,
                    pl: { xs: 2, md: '140px' },
                }}
            >
                {/* Header */}
                <Box sx={{ mb: 7 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Calculator size={26} color={theme.palette.primary.main} />
                        <Typography variant="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.6rem' }, letterSpacing: '-0.04em', lineHeight: 1 }}>
                            SIP Calculator
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                        Project your wealth. Search any stock, ETF, or mutual fund to auto-fill the return rate from its actual 3Y CAGR.
                    </Typography>
                </Box>

                {/* ── Universal Search ── */}
                <Box sx={{ mb: 5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', mb: 1, display: 'block', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                        Auto-fill 3Y CAGR · Stock / ETF / Mutual Fund
                    </Typography>
                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            placeholder="Search RELIANCE, Nifty 50 ETF, Mirae Asset…"
                            value={query}
                            onChange={(e) => { handleQueryChange(e.target.value); setCagrInfo(null); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {searching || loadingCAGR
                                            ? <CircularProgress size={16} sx={{ color: theme.palette.primary.main }} />
                                            : <Search size={16} color={theme.palette.text.disabled as string} />
                                        }
                                    </InputAdornment>
                                ),
                                endAdornment: query ? (
                                    <InputAdornment position="end">
                                        <Box component="span" onClick={clearSelection} sx={{ cursor: 'pointer', display: 'flex', color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                                            <X size={16} />
                                        </Box>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                            size="small"
                        />

                        {/* Dropdown */}
                        <AnimatePresence>
                            {suggestions.length > 0 && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    sx={{
                                        position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0, mt: 0.5,
                                        bgcolor: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {suggestions.map((s) => (
                                        <Box
                                            key={`${s.type}-${s.id}`}
                                            onClick={() => handleSelect(s)}
                                            sx={{
                                                px: 2, py: 1.25, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                borderBottom: `1px solid ${theme.palette.divider}`,
                                                '&:last-child': { borderBottom: 'none' },
                                                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                            }}
                                        >
                                            {s.type === 'mf'
                                                ? <Landmark size={15} color={theme.palette.primary.main as string} />
                                                : <BarChart2 size={15} color={theme.palette.text.secondary as string} />
                                            }
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {s.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                    {s.id}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={s.typeLabel}
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                                                    bgcolor: s.type === 'mf'
                                                        ? `${theme.palette.primary.main}20`
                                                        : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                                                    color: s.type === 'mf' ? theme.palette.primary.main : 'text.secondary',
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </AnimatePresence>
                    </Box>

                    {/* CAGR badge */}
                    <AnimatePresence>
                        {cagrInfo && (
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}
                            >
                                <CheckCircle size={14} color="#10B981" />
                                <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                                    {cagrInfo.years}Y CAGR · <strong>{cagrInfo.cagr.toFixed(2)}%</strong> p.a. from {cagrInfo.type === 'mf' ? 'NAV' : 'price'} history
                                </Typography>
                                <Chip
                                    label={cagrInfo.name.length > 42 ? cagrInfo.name.slice(0, 42) + '…' : cagrInfo.name}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: 'text.secondary' }}
                                />
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>

                <Divider sx={{ mb: 5, opacity: 0.5 }} />

                {/* ── SIP / Lumpsum toggle ── */}
                <Box sx={{ display: 'flex', gap: 1, mb: 4, p: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 2, border: `1px solid ${theme.palette.divider}`, flexDirection: { xs: 'column', sm: 'row' } }}>
                    {(['sip', 'lumpsum'] as const).map((t) => (
                        <Button
                            key={t} fullWidth disableElevation
                            variant={type === t ? 'contained' : 'text'}
                            onClick={() => { setType(t); setCalcResult(null); }}
                            sx={{ py: 1.25, borderRadius: 1.5, fontWeight: 700, textTransform: 'none', fontSize: { xs: '0.85rem', md: '0.9rem' }, color: type === t ? (isDark ? '#000' : '#fff') : 'text.secondary', bgcolor: type === t ? (isDark ? '#fff' : 'primary.main') : 'transparent', '&:hover': { bgcolor: type === t ? (isDark ? '#ddd' : 'primary.dark') : 'transparent' } }}
                        >
                            {t === 'sip' ? 'SIP · Monthly' : 'Lumpsum · One-time'}
                        </Button>
                    ))}
                </Box>

                {/* ── Inputs ── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                    <TextField
                        fullWidth
                        label={type === 'sip' ? 'Monthly Investment' : 'One-time Investment'}
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                '-webkit-appearance': 'none',
                                margin: 0,
                            },
                            '& input[type=number]': {
                                MozAppearance: 'textfield',
                            },
                        }}
                    />

                    <Box>
                        <Tooltip
                            title={cagrInfo
                                ? `Auto-computed from actual ${cagrInfo.years}Y CAGR of ${cagrInfo.type === 'mf' ? 'NAV' : 'price'} history.`
                                : 'Search a stock, ETF, or fund above to auto-fill from actual 3Y CAGR.'}
                            placement="top" arrow
                        >
                            <TextField
                                fullWidth
                                label="Expected Annual Return Rate"
                                type="number"
                                value={returnRate}
                                onChange={(e) => { setCagrInfo(null); setReturnRate(e.target.value); }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                    readOnly: !!cagrInfo,
                                }}
                                sx={{
                                    ...(cagrInfo ? {
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.04)',
                                            '& fieldset': { borderColor: 'rgba(16,185,129,0.4) !important' },
                                        }
                                    } : {}),
                                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                        '-webkit-appearance': 'none',
                                        margin: 0,
                                    },
                                    '& input[type=number]': {
                                        MozAppearance: 'textfield',
                                    },
                                }}
                            />
                        </Tooltip>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, px: 1 }}>
                            <Info size={11} color={theme.palette.text.disabled as string} />
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                                {cagrInfo
                                    ? `Based on actual ${cagrInfo.years}Y CAGR from ${cagrInfo.type === 'mf' ? 'NAV' : 'price'} history`
                                    : 'Search above to auto-fill · or enter manually'}
                            </Typography>
                        </Box>
                    </Box>

                    <TextField
                        fullWidth
                        label="Investment Period"
                        type="number"
                        value={tenure}
                        onChange={(e) => setTenure(e.target.value)}
                        InputProps={{ endAdornment: <InputAdornment position="end">Years</InputAdornment> }}
                        sx={{
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                '-webkit-appearance': 'none',
                                margin: 0,
                            },
                            '& input[type=number]': {
                                MozAppearance: 'textfield',
                            },
                        }}
                    />

                    <Button
                        variant="contained" size="large"
                        onClick={handleCalculate}
                        sx={{ py: 1.75, fontWeight: 700, fontSize: '1rem', borderRadius: 2.5 }}
                    >
                        Calculate Returns
                    </Button>
                </Box>

                {/* ── Result card ── */}
                <AnimatePresence mode="wait">
                    {calcResult && (
                        <Box
                            component={motion.div}
                            key={`${type}-${calcResult.maturityValue}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Box sx={{ height: 3, borderRadius: '3px 3px 0 0', background: calcResult.wealthGain >= 0 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #EF4444, #F87171)' }} />
                            <Box sx={{ ...cardSx, borderTop: 'none', borderRadius: '0 0 12px 12px', pt: 4, pb: 4 }}>
                                <Box sx={{ mb: 4, textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                                        Estimated Corpus
                                    </Typography>
                                    <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3.5rem' }, letterSpacing: '-0.03em', color: theme.palette.text.primary, lineHeight: 1.1, mt: 0.5 }}>
                                        {formatCurrency(calcResult.maturityValue)}
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 4 }} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${theme.palette.divider}` }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Wallet size={14} color={theme.palette.text.disabled as string} />
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Invested</Typography>
                                            </Box>
                                            <Typography variant="h6" fontWeight={700}>{formatCurrency(calcResult.totalInvestment)}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: calcResult.wealthGain >= 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${calcResult.wealthGain >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                {calcResult.wealthGain >= 0
                                                    ? <TrendingUp size={14} color="#10B981" />
                                                    : <TrendingDown size={14} color="#EF4444" />}
                                                <Typography variant="caption" sx={{ color: calcResult.wealthGain >= 0 ? '#10B981' : '#EF4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Returns</Typography>
                                            </Box>
                                            <Typography variant="h6" fontWeight={700} sx={{ color: calcResult.wealthGain >= 0 ? '#10B981' : '#EF4444' }}>
                                                {calcResult.wealthGain >= 0 ? '+' : ''}{formatCurrency(calcResult.wealthGain)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Box>
                    )}
                </AnimatePresence>

                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 6, lineHeight: 1.6 }}>
                    For illustrative purposes only. Actual returns may vary.<br />
                    This is not financial advice.
                </Typography>
            </Box>
        </Box>
    );
}

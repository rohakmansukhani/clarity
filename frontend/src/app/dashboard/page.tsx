'use client';

import { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Button, CircularProgress,
    Autocomplete, TextField, Tabs, Tab, Snackbar, Alert
} from '@mui/material';
import {
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Search, Activity, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';

export default function DashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [greeting, setGreeting] = useState('Good Morning');
    const [marketStatus, setMarketStatus] = useState<any[]>([]);
    const [topMovers, setTopMovers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [moversTab, setMoversTab] = useState(0);
    const [searchOptions, setSearchOptions] = useState<any[]>([]);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' as any });

    useEffect(() => {
        // Load user
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                const rawName = parsed.user_metadata?.full_name || parsed.user_metadata?.display_name || parsed.full_name;
                const name = rawName ? rawName.split(' ')[0] : null;
                setUser({ ...parsed, display_name: name ? name.charAt(0).toUpperCase() + name.slice(1) : null });
            }
        } catch (_) { }

        // Greeting
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');

        // Fetch data
        const load = async () => {
            try {
                const [status, movers] = await Promise.allSettled([
                    marketService.getMarketStatus(),
                    marketService.getTopMovers(),
                ]);
                if (status.status === 'fulfilled') setMarketStatus(status.value || []);
                if (movers.status === 'fulfilled') setTopMovers(movers.value || []);
            } catch (_) { }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const statusInfo = (() => {
        const d = new Date(), day = d.getDay(), h = d.getHours(), m = d.getMinutes();
        if (day === 0 || day === 6) return { text: 'Closed', sub: 'Weekend', color: '#EF4444', dot: '#EF4444' };
        const tot = h * 60 + m;
        if (tot >= 9 * 60 + 15 && tot <= 15 * 60 + 30) return { text: 'Market Open', sub: 'NSE · BSE Live', color: '#10B981', dot: '#10B981' };
        return { text: 'Market Closed', sub: 'After Hours', color: '#F59E0B', dot: '#F59E0B' };
    })();

    const gainers = topMovers.filter(s => s.isUp).slice(0, 6);
    const losers = topMovers.filter(s => !s.isUp).slice(0, 6);
    const displayed = moversTab === 0 ? gainers : losers;

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, pb: 8 }}>

            {/* ── Header ── */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 6, gap: 3, pt: 1 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', fontSize: { xs: '1.8rem', md: '2.5rem' }, lineHeight: 1.1 }}>
                            {greeting},{' '}
                            <Box component="span" sx={{ color: '#00E5FF' }}>{user?.display_name || 'Trader'}</Box>
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusInfo.dot, boxShadow: `0 0 8px ${statusInfo.dot}`, animation: statusInfo.dot === '#10B981' ? 'pulse 2s infinite' : 'none' }} />
                        <Typography variant="body2" sx={{ color: statusInfo.color, fontWeight: 700 }}>{statusInfo.text}</Typography>
                        <Typography variant="body2" sx={{ color: '#444' }}>·</Typography>
                        <Typography variant="body2" sx={{ color: '#555' }}>{statusInfo.sub}</Typography>
                    </Box>
                </Box>

                {/* Search */}
                <Box sx={{ width: { xs: '100%', md: 360 } }}>
                    <Autocomplete
                        freeSolo
                        id="dashboard-search"
                        options={searchOptions}
                        getOptionLabel={(o: any) => typeof o === 'string' ? o : `${o.symbol} — ${o.name}`}
                        filterOptions={(x) => x}
                        onInputChange={async (_, v) => {
                            if (v.length > 1) {
                                try { setSearchOptions(await marketService.searchStocks(v) || []); } catch (_) { }
                            } else setSearchOptions([]);
                        }}
                        onChange={(_, v: any) => {
                            if (v) router.push(`/market/${typeof v === 'string' ? v : v.symbol}`);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder="Search any stock or index..."
                                InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                    startAdornment: <Search size={18} color="#555" style={{ marginRight: 10 }} />,
                                    sx: {
                                        fontSize: '0.95rem', color: '#fff',
                                        borderBottom: '1px solid #333', pb: 0.5,
                                        '&:hover': { borderBottom: '1px solid #555' },
                                        '&.Mui-focused': { borderBottom: '1px solid #00E5FF' }
                                    }
                                }}
                            />
                        )}
                        renderOption={(props, o: any) => {
                            const { key, ...rest } = props;
                            return (
                                <li key={key} {...rest} style={{ background: '#111', color: '#fff', borderBottom: '1px solid #1a1a1a' }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.symbol}</Typography>
                                        <Typography variant="caption" sx={{ color: '#666' }}>{o.name}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                    />
                </Box>
            </Box>

            {/* ── Market Index Cards ── */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="overline" sx={{ color: '#444', letterSpacing: '0.15em', fontWeight: 700, fontSize: '0.7rem', mb: 2, display: 'block' }}>
                    MARKET INDICES
                </Typography>
                {loading ? (
                    <Box sx={{ display: 'flex', gap: 2.5 }}>
                        {[0, 1, 2].map(i => (
                            <Box key={i} sx={{ flex: 1, height: 110, borderRadius: 3, bgcolor: '#111', border: '1px solid #1a1a1a', animation: 'pulse 1.5s infinite' }} />
                        ))}
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {marketStatus.length > 0 ? marketStatus.map((idx, i) => (
                            <Grid size={{ xs: 12, sm: 4 }} key={idx.index}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3, borderRadius: 4, bgcolor: '#0A0A0A',
                                            border: '1px solid #1e1e1e',
                                            position: 'relative', overflow: 'hidden',
                                            '&:hover': { borderColor: '#333', transition: 'border-color 0.2s' }
                                        }}
                                    >
                                        <Box sx={{
                                            position: 'absolute', top: -40, right: -40,
                                            width: 100, height: 100, borderRadius: '50%',
                                            bgcolor: idx.change >= 0 ? '#10B981' : '#EF4444',
                                            filter: 'blur(50px)', opacity: 0.07
                                        }} />
                                        <Typography variant="caption" sx={{ color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                            {idx.index}
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mt: 0.5, letterSpacing: '-0.02em', fontSize: { xs: '1.6rem', md: '2rem' } }}>
                                            {idx.current_formatted}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                            {idx.change >= 0
                                                ? <ArrowUpRight size={16} color="#10B981" />
                                                : <ArrowDownRight size={16} color="#EF4444" />}
                                            <Typography variant="body2" sx={{ color: idx.change >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                                {idx.change >= 0 ? '+' : ''}{idx.change_formatted} ({idx.percent_change_formatted})
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </motion.div>
                            </Grid>
                        )) : (
                            <Grid size={{ xs: 12 }}>
                                <Typography sx={{ color: '#444', py: 3 }}>Market data unavailable right now.</Typography>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>

            {/* ── Main 2-Col Layout ── */}
            <Grid container spacing={4}>

                {/* Left: Top Movers */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#0A0A0A', border: '1px solid #1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
                        {/* Tab Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 3, pb: 0 }}>
                            <Tabs
                                value={moversTab}
                                onChange={(_, v) => setMoversTab(v)}
                                sx={{
                                    '& .MuiTabs-indicator': { bgcolor: '#00E5FF', height: 2 },
                                    minHeight: 36
                                }}
                            >
                                <Tab
                                    icon={<TrendingUp size={15} />}
                                    iconPosition="start"
                                    label="Top Gainers"
                                    sx={{ color: '#555', '&.Mui-selected': { color: '#10B981' }, fontSize: '0.8rem', fontWeight: 700, minHeight: 36, textTransform: 'none', gap: 0.5 }}
                                />
                                <Tab
                                    icon={<TrendingDown size={15} />}
                                    iconPosition="start"
                                    label="Top Losers"
                                    sx={{ color: '#555', '&.Mui-selected': { color: '#EF4444' }, fontSize: '0.8rem', fontWeight: 700, minHeight: 36, textTransform: 'none', gap: 0.5 }}
                                />
                            </Tabs>
                            <Typography variant="caption" sx={{ color: '#333', fontSize: '0.65rem', fontWeight: 600 }}>
                                <Activity size={10} style={{ display: 'inline', marginRight: 4 }} />
                                NSE · TODAY
                            </Typography>
                        </Box>

                        {/* Table Header */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', px: 3, py: 1.5, borderBottom: '1px solid #111' }}>
                            {['Stock', 'Price', 'Change'].map(h => (
                                <Typography key={h} variant="caption" sx={{ color: '#333', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem', textAlign: h === 'Stock' ? 'left' : 'right' }}>
                                    {h}
                                </Typography>
                            ))}
                        </Box>

                        {/* Rows */}
                        <AnimatePresence mode="wait">
                            <motion.div key={moversTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                {loading ? (
                                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                                        <CircularProgress size={24} sx={{ color: '#333' }} />
                                    </Box>
                                ) : displayed.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <Typography sx={{ color: '#444' }}>No data available.</Typography>
                                    </Box>
                                ) : displayed.map((stock, i) => (
                                    <motion.div
                                        key={stock.symbol}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <Box
                                            onClick={() => router.push(`/market/${stock.symbol}`)}
                                            sx={{
                                                display: 'grid', gridTemplateColumns: '1fr 100px 120px',
                                                px: 3, py: 2, cursor: 'pointer',
                                                borderBottom: '1px solid #0f0f0f',
                                                transition: 'background 0.15s',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                                            }}
                                        >
                                            {/* Symbol */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{
                                                    width: 34, height: 34, borderRadius: 1.5,
                                                    bgcolor: stock.isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: '0.7rem',
                                                    color: stock.isUp ? '#10B981' : '#EF4444'
                                                }}>
                                                    {stock.symbol.slice(0, 2)}
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{stock.symbol}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#444' }}>NSE</Typography>
                                                </Box>
                                            </Box>

                                            {/* Price */}
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ccc', textAlign: 'right', alignSelf: 'center' }}>
                                                ₹{stock.price}
                                            </Typography>

                                            {/* Change */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                {stock.isUp
                                                    ? <ArrowUpRight size={14} color="#10B981" />
                                                    : <ArrowDownRight size={14} color="#EF4444" />}
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: stock.isUp ? '#10B981' : '#EF4444' }}>
                                                    {stock.change}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>

                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid #111' }}>
                            <Button
                                size="small"
                                onClick={() => router.push('/market')}
                                sx={{ color: '#444', fontSize: '0.75rem', textTransform: 'none', '&:hover': { color: '#00E5FF' } }}
                            >
                                Search all stocks →
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right: Trending Stocks */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#0A0A0A', border: '1px solid #1e1e1e', borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Flame size={18} color="#F59E0B" />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                                    Trending
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#333', fontSize: '0.65rem', fontWeight: 600 }}>NSE LARGE CAP</Typography>
                        </Box>

                        {[
                            { symbol: 'RELIANCE', name: 'Reliance Industries' },
                            { symbol: 'TCS', name: 'Tata Consultancy' },
                            { symbol: 'HDFCBANK', name: 'HDFC Bank' },
                            { symbol: 'INFY', name: 'Infosys' },
                            { symbol: 'ICICIBANK', name: 'ICICI Bank' },
                            { symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
                            { symbol: 'SBIN', name: 'State Bank of India' },
                            { symbol: 'TATAMOTORS', name: 'Tata Motors' },
                        ].map((stock, i) => (
                            <Box
                                key={stock.symbol}
                                onClick={() => router.push(`/market/${stock.symbol}`)}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 3, py: 1.8, cursor: 'pointer',
                                    borderBottom: '1px solid #0f0f0f',
                                    transition: 'background 0.15s',
                                    '&:hover': { bgcolor: 'rgba(245,158,11,0.03)' }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 30, height: 30, borderRadius: 1.5,
                                        bgcolor: 'rgba(245,158,11,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B'
                                    }}>
                                        {stock.symbol.slice(0, 2)}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#ddd', fontSize: '0.85rem' }}>{stock.symbol}</Typography>
                                        <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem' }}>{stock.name}</Typography>
                                    </Box>
                                </Box>
                                <ArrowUpRight size={14} color="#333" />
                            </Box>
                        ))}

                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid #111' }}>
                            <Button
                                size="small"
                                onClick={() => router.push('/market')}
                                sx={{ color: '#444', fontSize: '0.75rem', textTransform: 'none', '&:hover': { color: '#F59E0B' } }}
                            >
                                Explore all stocks →
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Toast */}
            <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast(t => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={toast.severity} sx={{ bgcolor: '#1A1A1A', color: '#fff' }}>{toast.message}</Alert>
            </Snackbar>

            {/* Pulse animation for live dot */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </Box>
    );
}

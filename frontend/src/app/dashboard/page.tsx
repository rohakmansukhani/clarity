'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, IconButton, TextField, InputAdornment, Button, Tooltip, CircularProgress, Autocomplete, Snackbar, Alert } from '@mui/material';
import { Search, Bell, Settings, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, MessageSquare, PieChart, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';

import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';
export default function DashboardPage() {
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();
    const [greeting, setGreeting] = useState('Good Evening');
    const [marketStatus, setMarketStatus] = useState<any[]>([]);
    const [topMovers, setTopMovers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchOptions, setSearchOptions] = useState<any[]>([]); // Search Suggestions State
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'warning' | 'error' });

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // 0. Load User
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);

            // Determine Display Name (Strict: Metadata Only)
            let name = parsedUser.user_metadata?.full_name ||
                parsedUser.user_metadata?.display_name ||
                parsedUser.full_name;

            // If name exists, take the First Name only
            if (name) {
                name = name.split(' ')[0];
                // Capitalize first letter just in case
                name = name.charAt(0).toUpperCase() + name.slice(1);
            }

            // If no name found, display_name will be undefined/null -> falls back to 'Trader' in JSX
            setUser({ ...parsedUser, display_name: name });
        }

        // 1. Time-based Greeting
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        // 2. Fetch Market Data (Status + Movers)
        const fetchMarket = async () => {
            // Fetch Status
            try {
                const statusData = await marketService.getMarketStatus();
                setMarketStatus(statusData);
            } catch (e) {
                console.error("Failed to fetch market status", e);
            }

            // Fetch Movers
            try {
                const moversData = await marketService.getTopMovers();
                setTopMovers(moversData);
            } catch (e) {
                console.error("Failed to fetch top movers", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMarket();
    }, []);

    // Dynamic Market Status Logic
    const getMarketStatusMessage = () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Weekend Check
        if (day === 0 || day === 6) return { text: 'Closed', color: '#EF4444', sub: 'Weekend' };

        // Market Hours: 09:15 - 15:30
        const totalMinutes = hour * 60 + minute;
        const start = 9 * 60 + 15;
        const end = 15 * 60 + 30;

        if (totalMinutes >= start && totalMinutes <= end) {
            return { text: 'Active', color: '#10B981', sub: 'Live' };
        }

        return { text: 'Closed', color: '#EF4444', sub: 'After Hours' };
    };

    const statusObj = getMarketStatusMessage();

    const handleCloseToast = () => setToast({ ...toast, open: false });

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 6 }, pb: 4 }}>
            {/* Header: Minimal Greeting + Search */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: { xs: 4, md: 8 }, gap: { xs: 3, md: 0 } }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: theme.palette.text.primary, fontSize: { xs: '2rem', md: '3rem' } }}>
                        {greeting}, {user?.display_name || 'Trader'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                        Market is <span style={{ color: statusObj.color, fontWeight: 700 }}>{statusObj.text}</span> ({statusObj.sub}).
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', width: { xs: '100%', md: 400 } }}>
                    <Autocomplete
                        freeSolo
                        id="dashboard-search-autocomplete"
                        options={searchOptions}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.symbol} - ${option.name}`}
                        filterOptions={(x) => x} // Disable built-in filter, we use backend search
                        sx={{ width: '100%' }}
                        onInputChange={async (event, newInputValue) => {
                            if (newInputValue.length > 1) {
                                try {
                                    const results = await marketService.searchStocks(newInputValue);
                                    setSearchOptions(results || []);
                                } catch (e) {
                                    console.error(e);
                                }
                            } else {
                                setSearchOptions([]);
                            }
                        }}
                        onChange={(event, value: any) => {
                            if (value) {
                                const symbol = typeof value === 'string' ? value : value.symbol;
                                router.push(`/market/${symbol}`);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder="Search stocks..."
                                fullWidth
                                InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                    startAdornment: <Search size={20} color={theme.palette.text.secondary} style={{ marginRight: 10 }} />,
                                    sx: {
                                        fontSize: '1rem',
                                        color: theme.palette.text.primary,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        pb: 0.5,
                                        transition: 'all 0.2s',
                                        '&:hover': { borderBottom: `1px solid ${theme.palette.text.secondary}` },
                                        '&.Mui-focused': { borderBottom: `1px solid ${theme.palette.primary.main}` }
                                    }
                                }}
                            />
                        )}
                        renderOption={(props, option: any) => {
                            const { key, ...otherProps } = props;
                            return (
                                <li key={key} {...otherProps} style={{ backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{option.name}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                    />

                    <Box sx={{ width: 36, height: 36, minWidth: 36, borderRadius: '50%', bgcolor: theme.palette.primary.main, color: mode === 'dark' ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', border: `2px solid ${theme.palette.divider}`, flexShrink: 0 }}>
                        {(user?.full_name || user?.email || 'T').charAt(0).toUpperCase()}
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={{ xs: 3, md: 6 }}>
                {/* Left Col: Main Stats (Portfolio) */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 700, mb: 3 }}>Market Overview</Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <CircularProgress size={20} sx={{ color: theme.palette.text.secondary }} />
                                <Typography sx={{ color: theme.palette.text.secondary }}>Loading market data...</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={4}>
                                {marketStatus.length > 0 ? marketStatus.map((index) => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={index.index}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: '0.05em' }}>{index.index}</Typography>
                                            <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, fontSize: '2.5rem', color: theme.palette.text.primary }}>{index.current_formatted}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {index.change >= 0 ? <ArrowUpRight size={20} color={theme.palette.success.main} /> : <ArrowDownRight size={20} color={theme.palette.error.main} />}
                                                <Typography variant="body1" sx={{ color: index.change >= 0 ? theme.palette.success.main : theme.palette.error.main, fontWeight: 600 }}>
                                                    {index.change >= 0 ? '+' : ''}{index.change_formatted} ({index.percent_change_formatted})
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )) : (
                                    <Typography sx={{ color: theme.palette.text.secondary }}>Market data unavailable.</Typography>
                                )}
                            </Grid>
                        )}
                    </Box>

                    {/* Quick Actions Grid */}
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 3, fontWeight: 600 }}>Quick Actions</Typography>
                    <Grid container spacing={3}>
                        <ActionCard
                            icon={Zap}
                            title="Compare Stocks"
                            desc="Compare performance & AI insights"
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setToast({ open: true, message: 'For the best analytical experience, please access this feature on a tablet or desktop.', severity: 'info' });
                                } else {
                                    router.push('/analysis');
                                }
                            }}
                            delay={0.1}
                        />
                        <ActionCard
                            icon={MessageSquare}
                            title="Ask Advisor"
                            desc="Chat with Clarity AI about strategy"
                            onClick={() => router.push('/advisor')}
                            delay={0.2}
                        />
                        <ActionCard
                            icon={Lightbulb}
                            title="Discovery Hub"
                            desc="Research sectors & build portfolios"
                            onClick={() => router.push('/sectors')}
                            delay={0.3}
                        />
                    </Grid>
                </Grid>

                {/* Right Col: Top Movers */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 4,
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: mode === 'light' ? '0 4px 20px rgba(0,0,0,0.03)' : 'none'
                        }}
                    >
                        {/* Decorative Background Glow */}
                        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, bgcolor: theme.palette.primary.main, filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%' }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <TrendingUp size={20} color={theme.palette.primary.main} />
                                Top Movers
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {topMovers.length > 0 ? topMovers.map((stock) => (
                                <MoverRow
                                    key={stock.symbol}
                                    symbol={stock.symbol}
                                    price={stock.price}
                                    change={stock.change}
                                    isUp={stock.isUp}
                                    onClick={() => router.push(`/market/${stock.symbol}`)}
                                />
                            )) : (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <CircularProgress size={20} color="inherit" sx={{ color: theme.palette.text.secondary }} />
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Notification Toast */}
            <Snackbar open={toast.open} autoHideDuration={6000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', bgcolor: '#1A1A1A', color: '#fff', '& .MuiAlert-icon': { color: toast.severity === 'error' ? '#EF4444' : '#00E5FF' } }}>
                    {toast.message}
                </Alert>
            </Snackbar>

        </Box>
    );
}

function ActionCard({ icon: Icon, title, desc, onClick, delay }: any) {
    const theme = useTheme();
    const { mode } = useColorMode();
    return (
        <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                onClick={onClick}
                sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    height: '100%',
                    minHeight: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none',
                    '&:hover': {
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-4px)',
                        boxShadow: mode === 'dark'
                            ? '0 10px 30px -10px rgba(0, 229, 255, 0.1)'
                            : `0 10px 30px -10px ${theme.palette.primary.main}20`
                    }
                }}
            >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Icon size={20} color={theme.palette.text.primary} />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.85rem' }}>{desc}</Typography>
            </Paper>
        </Grid>
    );
}

function MarketRow({ name, value, change, isUp }: any) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>{name}</Typography>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>{value}</Typography>
                <Typography variant="caption" sx={{ color: isUp ? theme.palette.success.main : theme.palette.error.main, fontWeight: 600 }}>{change}</Typography>
            </Box>
        </Box>
    );
}

function MoverRow({ symbol, price, change, isUp, onClick }: any) {
    const theme = useTheme();
    const { mode } = useColorMode();
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    transform: 'translateX(4px)'
                }
            }}
        >
            <Box sx={{ display: 'flex', items: 'center', gap: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: mode === 'dark' ? '#1A1A1A' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                    {symbol[0]}
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{symbol}</Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>NSE</Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>₹{price}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {isUp ? <ArrowUpRight size={14} color={theme.palette.success.main} /> : <ArrowDownRight size={14} color={theme.palette.error.main} />}
                    <Typography variant="caption" sx={{ color: isUp ? theme.palette.success.main : theme.palette.error.main, fontWeight: 700 }}>{change}</Typography>
                </Box>
            </Box>
        </Box>
    );
}

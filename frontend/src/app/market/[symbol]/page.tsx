'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Chip, CircularProgress, Button, Tab, Tabs, Tooltip, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Activity, Newspaper, Brain, Info } from 'lucide-react';
import { useParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// MOCK DATA FOR RELIANCE
const MOCK_DATA = {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd.",
    price: "2,985.40",
    change: "+45.20",
    changePercent: "1.54",
    marketCap: "19.8T",
    pe: "28.5",
    high52: "3,000.00",
    low52: "2,200.00",
    score: 8.5,
    verdict: "STRONG BUY",
    summary: "Reliance is showing strong bullish momentum breaking past critical resistance levels. AI analysis detects significant institutional accumulation and positive sentiment from recent renewable energy investments."
};

const MOCK_CHART_DATA: Record<string, any[]> = {
    '5M': [
        { time: '10:00', price: 2940 }, { time: '10:05', price: 2942 }, { time: '10:10', price: 2945 },
        { time: '10:15', price: 2943 }, { time: '10:20', price: 2948 }, { time: '10:25', price: 2950 },
        { time: '10:30', price: 2955 }
    ],
    '1D': [
        { time: '10:00', price: 2940 }, { time: '11:00', price: 2955 }, { time: '12:00', price: 2948 },
        { time: '13:00', price: 2965 }, { time: '14:00', price: 2980 }, { time: '15:00', price: 2985.40 }
    ],
    '1W': [
        { time: 'Mon', price: 2890 }, { time: 'Tue', price: 2910 }, { time: 'Wed', price: 2905 },
        { time: 'Thu', price: 2940 }, { time: 'Fri', price: 2985.40 }
    ],
    '1M': [
        { time: 'Week 1', price: 2800 }, { time: 'Week 2', price: 2850 },
        { time: 'Week 3', price: 2820 }, { time: 'Week 4', price: 2985.40 }
    ],
    '1Y': [
        { time: 'Jan', price: 2400 }, { time: 'Mar', price: 2500 }, { time: 'Jun', price: 2450 },
        { time: 'Sep', price: 2700 }, { time: 'Dec', price: 2985.40 }
    ],
    '5Y': [
        { time: '2020', price: 1500 }, { time: '2021', price: 2000 }, { time: '2022', price: 2400 },
        { time: '2023', price: 2300 }, { time: '2024', price: 2985.40 }
    ],
    'ALL': [
        { time: '2015', price: 500 }, { time: '2018', price: 1200 }, { time: '2021', price: 2000 },
        { time: '2024', price: 2985.40 }
    ]
};

const MOCK_NEWS = [
    {
        id: 1,
        title: "Reliance's Green Energy Push: A Game Changer?",
        source: "Financial Express",
        time: "2h ago",
        image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80",
        summary: "Reliance Industries accelerates its transition to green energy with a massive ₹75,000 Cr investment plan."
    },
    {
        id: 2,
        title: "Retail Arm Custom: Q3 Revenue Soars 18%",
        source: "Bloomberg",
        time: "4h ago",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
        summary: "Record footfall and digital integration drive Reliance Retail's quarterly growth beyond analyst estimates."
    },
    {
        id: 3,
        title: "Jio Financial Services: The Next Big thing?",
        source: "Mint",
        time: "6h ago",
        image: "https://images.unsplash.com/photo-1611974765270-ca12588265b6?w=800&q=80",
        summary: "Market experts weigh in on the potential demerger and listing of Jio Financial Services."
    }
];

export default function StockPage() {
    const params = useParams();
    const symbol = (params.symbol as string).toUpperCase();
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [timeRange, setTimeRange] = useState('1D');
    const [configOpen, setConfigOpen] = useState(false);
    const [fastReload, setFastReload] = useState(false);
    const [updateInterval, setUpdateInterval] = useState(5); // Minutes
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [buyListModalOpen, setBuyListModalOpen] = useState(false);

    // Simulate loading for effect
    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    // ... (existing mock data logic) ...

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '80vh', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    // Use Mock Data if Symbol is RELIANCE, else Generic fallback
    const isMock = symbol === 'RELIANCE';
    const data = isMock ? MOCK_DATA : { ...MOCK_DATA, symbol: symbol, name: `${symbol} Corp.` };

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', pb: 10 }}>
            {/* Minimal Header */}
            <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                    <Typography variant="h1" sx={{ fontWeight: 700, fontSize: { xs: '3rem', md: '5rem' }, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
                        {data.symbol}
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#666', fontWeight: 400 }}>
                        {data.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant="h2" sx={{ fontWeight: 600, fontSize: { xs: '2rem', md: '3rem' } }}>
                        ₹{data.price}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: '#10B981', bgcolor: 'rgba(16, 185, 129, 0.1)', px: 1.5, py: 0.5, borderRadius: 1 }}>
                        <ArrowUpRight size={24} />
                        <Typography variant="h6" sx={{ fontWeight: 600, ml: 0.5 }}>{data.change} ({data.changePercent}%)</Typography>
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={6}>
                {/* Left Column: Chart & Analysis */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {/* Chart Container */}
                    <Box sx={{ height: 450, bgcolor: '#111', borderRadius: 4, p: 3, border: '1px solid #222', mb: 6, position: 'relative' }}>
                        {/* Time Range Selectors */}
                        <Box sx={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', gap: 1 }}>
                            {['5M', '1D', '1W', '1M', '1Y', '5Y', 'ALL'].map((range) => (
                                <Button
                                    key={range}
                                    size="small"
                                    onClick={() => setTimeRange(range)}
                                    sx={{
                                        minWidth: 0,
                                        px: 1.5,
                                        color: timeRange === range ? '#00E5FF' : '#666',
                                        fontWeight: 700,
                                        bgcolor: timeRange === range ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                        '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    {range}
                                </Button>
                            ))}
                            {/* Config Icon for 5M/Fast Reload */}
                            <Tooltip title="Configure update interval">
                                <IconButton
                                    size="small"
                                    onClick={() => setConfigOpen(true)}
                                    sx={{ color: '#444', ml: 1, '&:hover': { color: '#fff' } }}
                                >
                                    <TrendingUp size={16} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ width: '100%', height: '100%', pt: 4 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_CHART_DATA[timeRange] || MOCK_CHART_DATA['1D']} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#444' }} dy={10} />
                                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#444' }} width={45} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#00E5FF' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#00E5FF"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPrice)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Box>

                    {/* AI Verdict Section */}
                    <Box sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Brain size={28} color="#00E5FF" />
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>The Clarity Verdict</Typography>
                            <Chip label={data.verdict} sx={{ bgcolor: '#10B981', color: '#000', fontWeight: 700, borderRadius: 1 }} />
                        </Box>
                        <Typography variant="body1" sx={{ color: '#ccc', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '90%' }}>
                            {data.summary}
                        </Typography>
                    </Box>
                </Grid>

                {/* Right Column: Stats & Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" sx={{ color: '#666', letterSpacing: '0.1em', fontWeight: 600, mb: 3, display: 'block' }}>KEY STATISTICS</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6 }}>
                        <StatRow label="Market Cap" value={data.marketCap} />
                        <StatRow label="P/E Ratio" value={data.pe} />
                        <StatRow label="52W High" value={data.high52} />
                        <StatRow label="52W Low" value={data.low52} />
                    </Box>

                    <Typography variant="caption" sx={{ color: '#666', letterSpacing: '0.1em', fontWeight: 600, mb: 3, display: 'block' }}>ACTIONS</Typography>

                    {/* Add to Buy List */}
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={() => setBuyListModalOpen(true)}
                        sx={{
                            bgcolor: '#fff',
                            color: '#000',
                            py: 2,
                            fontWeight: 700,
                            fontSize: '1rem',
                            mb: 2,
                            '&:hover': { bgcolor: '#ddd' }
                        }}
                    >
                        Add to Buy List
                    </Button>

                    {/* Buy List Selection Modal */}
                    <Dialog
                        open={buyListModalOpen}
                        onClose={() => setBuyListModalOpen(false)}
                        PaperProps={{
                            sx: {
                                bgcolor: '#0B0B0B',
                                border: '1px solid #333',
                                borderRadius: 4,
                                minWidth: 500,
                                p: 2
                            }
                        }}
                    >
                        <DialogTitle sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 2 }}>
                            SELECT WATCHLIST
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Existing Buy Lists */}
                                {['High Conviction', 'Watchlist 2024', 'Dip Buyers'].map((list) => (
                                    <Button
                                        key={list}
                                        onClick={() => setBuyListModalOpen(false)}
                                        sx={{
                                            justifyContent: 'space-between',
                                            textTransform: 'none',
                                            bgcolor: '#111',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            py: 3,
                                            px: 3,
                                            borderRadius: 3,
                                            '&:hover': { bgcolor: '#222', borderColor: '#555' }
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{list}</Typography>
                                        <Typography variant="caption" sx={{ color: '#00E5FF' }}>+ Add Stock</Typography>
                                    </Button>
                                ))}

                                {/* Create New List */}
                                <Button
                                    onClick={() => setBuyListModalOpen(false)}
                                    sx={{
                                        mt: 2,
                                        justifyContent: 'center',
                                        textTransform: 'none',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px dashed #444',
                                        backdropFilter: 'blur(10px)',
                                        color: '#888',
                                        py: 3,
                                        borderRadius: 3,
                                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#fff', borderColor: '#fff' }
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>+ Create New Watchlist</Typography>
                                </Button>
                            </Box>
                        </DialogContent>
                    </Dialog>

                    {/* Add to Portfolio Button */}
                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<Zap size={18} />}
                        onClick={() => setPortfolioModalOpen(true)}
                        sx={{
                            color: '#00E5FF',
                            borderColor: 'rgba(0, 229, 255, 0.3)',
                            py: 2,
                            fontWeight: 600,
                            '&:hover': { borderColor: '#00E5FF', bgcolor: 'rgba(0, 229, 255, 0.05)' }
                        }}
                    >
                        Add to Portfolio
                    </Button>

                    {/* Portfolio Selection Modal */}
                    <Dialog
                        open={portfolioModalOpen}
                        onClose={() => setPortfolioModalOpen(false)}
                        PaperProps={{
                            sx: {
                                bgcolor: '#0B0B0B',
                                border: '1px solid #333',
                                borderRadius: 4,
                                minWidth: 500,
                                p: 2
                            }
                        }}
                    >
                        <DialogTitle sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 2 }}>
                            SELECT PORTFOLIO
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Existing Portfolios */}
                                {['Main Portfolio', 'Retirement Fund', 'Tech Growth'].map((portfolio) => (
                                    <Button
                                        key={portfolio}
                                        onClick={() => setPortfolioModalOpen(false)}
                                        sx={{
                                            justifyContent: 'space-between',
                                            textTransform: 'none',
                                            bgcolor: '#111',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            py: 3,
                                            px: 3,
                                            borderRadius: 3,
                                            '&:hover': { bgcolor: '#222', borderColor: '#555' }
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{portfolio}</Typography>
                                        <Typography variant="caption" sx={{ color: '#00E5FF' }}>+ Add Stock</Typography>
                                    </Button>
                                ))}

                                {/* Create New Portfolio - Blurred Effect */}
                                <Button
                                    onClick={() => setPortfolioModalOpen(false)}
                                    sx={{
                                        mt: 2,
                                        justifyContent: 'center',
                                        textTransform: 'none',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)', // Slight transparent
                                        border: '1px dashed #444',
                                        backdropFilter: 'blur(10px)', // Blur effect
                                        color: '#888',
                                        py: 3,
                                        borderRadius: 3,
                                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#fff', borderColor: '#fff' }
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>+ Create New Portfolio</Typography>
                                </Button>
                            </Box>
                        </DialogContent>
                    </Dialog>
                </Grid>
            </Grid>

            {/* --- NEW SECTION: News & Clarity Summary --- */}
            <Box sx={{ mt: 8 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 4, letterSpacing: '-0.02em' }}>Latest News</Typography>

                {/* 1. Clarity AI News Summary */}
                <Box sx={{
                    bgcolor: 'rgba(0,0,0,0.5)',
                    border: '1px solid #333',
                    borderRadius: 4,
                    p: 4,
                    mb: 5,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        {/* Unique Clarity Icon (Custom SVG) */}
                        <Box sx={{
                            minWidth: 48, height: 48,
                            borderRadius: '12px',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="rgba(0, 229, 255, 0.2)" />
                                <path d="M2 17L12 22L22 17" />
                                <path d="M2 12L12 17L22 12" />
                            </svg>
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                Clarity News Insight
                                <Chip label="AI GENERATED" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontSize: '0.65rem', fontWeight: 800, height: 20 }} />
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.6 }}>
                                Institutional interest is peaking as <strong style={{ color: '#fff' }}>Reliance's Green Energy</strong> pivot begins to materialize with tangible investments.
                                However, retail sector growth remains the primary short-term driver. Sentiment is <strong style={{ color: '#10B981' }}>Bullish</strong> but cautious on global oil volatility.
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 2. News Grid */}
                <Grid container spacing={4}>
                    {MOCK_NEWS.map((news) => (
                        <Grid size={{ xs: 12, md: 4 }} key={news.id}>
                            <Box sx={{
                                group: 'true',
                                cursor: 'pointer',
                                '&:hover .news-img': { transform: 'scale(1.05)' },
                                '&:hover .news-title': { color: '#00E5FF' }
                            }}>
                                {/* Thumbnail */}
                                <Box sx={{ height: 200, borderRadius: 3, overflow: 'hidden', mb: 2, bgcolor: '#111' }}>
                                    <Box
                                        className="news-img"
                                        component="img"
                                        src={news.image}
                                        alt={news.title}
                                        sx={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            transition: 'transform 0.4s ease-out',
                                            opacity: 0.8
                                        }}
                                    />
                                </Box>

                                {/* Meta */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 700 }}>{news.source}</Typography>
                                    <Typography variant="caption" sx={{ color: '#666' }}>{news.time}</Typography>
                                </Box>

                                {/* Title */}
                                <Typography
                                    className="news-title"
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700, lineHeight: 1.3, mb: 1, color: '#eee',
                                        transition: 'color 0.2s',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}
                                >
                                    {news.title}
                                </Typography>

                                {/* Summary */}
                                <Typography variant="body2" sx={{ color: '#888', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {news.summary}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Configuration Modal */}
            <Dialog
                open={configOpen}
                onClose={() => setConfigOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#0B0B0B',
                        border: '1px solid #333',
                        borderRadius: 4,
                        minWidth: 400,
                        backgroundImage: 'none'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', fontWeight: 700, borderBottom: '1px solid #222' }}>
                    Data Configuration
                </DialogTitle>
                <DialogContent sx={{ pt: 4 }}>
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Update Frequency</Typography>

                        {/* Preset Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                            {[
                                { label: 'Realtime', value: 0.2 }, // ~12s
                                { label: '1m', value: 1 },
                                { label: '5m', value: 5 },
                                { label: '15m', value: 15 }
                            ].map((option) => (
                                <Button
                                    key={option.label}
                                    variant={updateInterval === option.value ? "contained" : "outlined"}
                                    onClick={() => {
                                        setUpdateInterval(option.value);
                                        setFastReload(option.value < 5);
                                    }}
                                    sx={{
                                        bgcolor: updateInterval === option.value ? '#00E5FF' : 'transparent',
                                        color: updateInterval === option.value ? '#000' : '#666',
                                        borderColor: updateInterval === option.value ? '#00E5FF' : '#333',
                                        '&:hover': {
                                            bgcolor: updateInterval === option.value ? '#00E5FF' : 'rgba(255,255,255,0.05)',
                                            borderColor: updateInterval === option.value ? '#00E5FF' : '#444'
                                        }
                                    }}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </Box>

                        {/* Custom Input */}
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                label="Custom Interval (Minutes)"
                                type="number"
                                value={updateInterval}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setUpdateInterval(val);
                                    setFastReload(val < 5);
                                }}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#333' },
                                        '&:hover fieldset': { borderColor: '#444' },
                                        '&.Mui-focused fieldset': { borderColor: '#00E5FF' }
                                    },
                                    '& .MuiInputLabel-root': { color: '#666' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#00E5FF' }
                                }}
                            />
                        </Box>


                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #222' }}>
                    <Button onClick={() => setConfigOpen(false)} sx={{ color: '#666' }}>Cancel</Button>
                    <Button
                        onClick={() => setConfigOpen(false)}
                        variant="contained"
                        sx={{ bgcolor: '#fff', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#ddd' } }}
                    >
                        Save Preferences
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function StatRow({ label, value }: { label: string, value: string }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #222' }}>
            <Typography variant="body1" sx={{ color: '#888' }}>{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>{value}</Typography>
        </Box>
    );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Grid, Chip, CircularProgress, Button, Tab, Tabs, Tooltip, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material';
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Activity, Newspaper, Brain, Info } from 'lucide-react';
import { useParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { marketService } from '@/services/marketService';
import AddTransactionModal from '@/components/portfolio/AddTransactionModal';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';
import AddToWatchlistModal from '@/components/watchlist/AddToWatchlistModal';
import Sidebar from '@/components/layout/Sidebar';

export default function StockPage() {
    const params = useParams();
    const symbol = (params.symbol as string).toUpperCase();

    // State
    const [initialLoading, setInitialLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [news, setNews] = useState<any[]>([]);

    // UI State
    const [timeRange, setTimeRange] = useState('1mo');
    const [configOpen, setConfigOpen] = useState(false);
    const [fastReload, setFastReload] = useState(false);
    const [updateInterval, setUpdateInterval] = useState(5); // Minutes
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [buyListModalOpen, setBuyListModalOpen] = useState(false);
    const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);

    // Transaction Modal State
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

    const [watchlists, setWatchlists] = useState<any[]>([]); // Current watchlist items
    const [userPortfolios, setUserPortfolios] = useState<any[]>([]);

    useEffect(() => {
        // Fetch User Portfolios for the modal
        marketService.getPortfolios().then(res => setUserPortfolios(res)).catch(console.error);
        marketService.getWatchlist().then(res => setWatchlists(res)).catch(console.error);
    }, []);

    // Fetch Data
    const fetchData = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) {
                setInitialLoading(true);
            } else {
                setChartLoading(true);
            }
            setError(null);

            // Parallel fetching for speed
            const [details, history, summaryData] = await Promise.all([
                marketService.getStockDetails(symbol),
                marketService.getStockHistory(symbol, timeRange),
                marketService.getAggregatedStockAnalysis(symbol).catch(() => ({ summary: "AI Analysis unavailable." }))
            ]);

            setData(details);
            setChartData(history);
            setAiSummary(summaryData.summary);
            // Assuming details contains news, or we fetch it separately. 
            // For now, let's map details.news if available, or fall back to empty.
            if (details.news) {
                setNews(details.news);
            }

        } catch (err: any) {
            console.error("Failed to load stock data:", err);
            setError("Failed to load stock data. Please try again.");
        } finally {
            if (isInitial) {
                setInitialLoading(false);
            } else {
                setChartLoading(false);
            }
        }
    }, [symbol, timeRange]);

    useEffect(() => {
        // Initial load
        fetchData(true);
    }, [symbol]); // Only on symbol change

    useEffect(() => {
        // Update on timeRange change (without full page reload)
        if (!initialLoading) {
            fetchData(false);
        }
    }, [timeRange]);

    // Wire update interval to actually re-fetch
    useEffect(() => {
        if (updateInterval <= 0) return;
        const intervalMs = updateInterval * 60 * 1000;
        const id = setInterval(() => fetchData(false), intervalMs);
        return () => clearInterval(id);
    }, [updateInterval, fetchData]);

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', height: '80vh', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{ display: 'flex', height: '80vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <Typography color="error" gutterBottom>{error || 'Stock not found'}</Typography>
                <Button variant="outlined" onClick={() => window.location.href = '/analysis'}>Go Back</Button>
            </Box>
        );
    }

    // Use Real Data
    // Fallback if API returns partial data
    const price = data.market_data?.price_formatted || `₹${data.market_data?.price?.toFixed(2) || '0.00'}`;
    const change = data.market_data?.change || 0;
    const changePercent = data.market_data?.changePercent || 0;

    return (
        <Box sx={{ display: 'flex', bgcolor: '#0B0B0B', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, maxWidth: 1600, mx: 'auto', pb: 10, pt: 6, pr: { xs: 2, md: 6 }, pl: { xs: 2, md: '140px' } }}>
                {/* Minimal Header */}
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                        <Typography variant="h1" sx={{ fontWeight: 700, fontSize: { xs: '3rem', md: '5rem' }, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
                            {data.symbol}
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#666', fontWeight: 400 }}>
                            {data.name || data.symbol}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Typography variant="h2" sx={{ fontWeight: 600, fontSize: { xs: '2rem', md: '3rem' } }}>
                            {price}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: change >= 0 ? '#10B981' : '#EF4444', bgcolor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', px: 1.5, py: 0.5, borderRadius: 1 }}>
                            {change >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                            <Typography variant="h6" sx={{ fontWeight: 600, ml: 0.5 }}>
                                {change > 0 ? '+' : ''}{Number(change).toFixed(2)} ({Number(changePercent).toFixed(2)}%)
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Grid container spacing={6}>
                    {/* Left Column: Chart & Analysis */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        {/* Chart Container */}
                        <Box sx={{ height: 450, bgcolor: '#111', borderRadius: 4, p: 3, border: '1px solid #222', mb: 6, position: 'relative' }}>
                            {/* Loading Overlay */}
                            {chartLoading && (
                                <Box sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                    zIndex: 20,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                    backdropFilter: 'blur(2px)'
                                }}>
                                    <CircularProgress size={30} sx={{ color: '#00E5FF' }} />
                                </Box>
                            )}

                            {/* Time Range Selectors */}
                            <Box sx={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', gap: 1 }}>
                                {['1d', '5d', '1mo', '3mo', '6mo', '1y', 'ytd', 'max'].map((range) => (
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
                                        {range.toUpperCase()}
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

                            <Box sx={{ width: '100%', height: 'calc(100% - 32px)', mt: 4 }}>
                                {/* Chart uses chartData state which matches backend format (date, open, close...) */}
                                {chartData && chartData.length > 0 ? (
                                    (() => {
                                        // Check if data spans multiple years
                                        const years = new Set(chartData.map(d => new Date(d.date).getFullYear()));
                                        const showYear = years.size > 1;

                                        return (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(val) => {
                                                            const d = new Date(val);
                                                            // Better formatting based on range
                                                            if (timeRange === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            if (timeRange === '5d' || timeRange === '1mo') return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
                                                            return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                                        }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#666', fontSize: 12 }}
                                                        dy={10}
                                                        minTickGap={30}
                                                    />
                                                    <YAxis
                                                        domain={['auto', 'auto']}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#666', fontSize: 12 }}
                                                        width={45}
                                                        tickFormatter={(val) => `₹${val}`}
                                                    />
                                                    <RechartsTooltip content={<CustomTooltip timeRange={timeRange} showYear={showYear} />} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="close"
                                                        stroke="#00E5FF"
                                                        strokeWidth={2}
                                                        fillOpacity={1}
                                                        fill="url(#colorPrice)"
                                                        animationDuration={500}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        );
                                    })()
                                ) : (
                                    <Box sx={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                        <Typography color="text.secondary">No chart data for this period</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* AI Verdict Section */}
                        <Box sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Brain size={28} color="#00E5FF" />
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>The Clarity Verdict</Typography>
                                <Chip label={data.scores?.recommendation?.action || "AI ANALYZING"} sx={{ bgcolor: '#10B981', color: '#000', fontWeight: 700, borderRadius: 1 }} />
                            </Box>
                            <Typography variant="body1" sx={{ color: '#ccc', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '90%' }}>
                                {data.scores?.recommendation?.reasoning || aiSummary || "Generating real-time analysis..."}
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Right Column: Stats & Actions */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="caption" sx={{ color: '#666', letterSpacing: '0.1em', fontWeight: 600, mb: 3, display: 'block' }}>KEY STATISTICS</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6 }}>
                            <StatRow label="Market Cap" value={formatMarketCap(data.fundamentals?.market_cap)} />
                            <StatRow label="P/E Ratio" value={getPE(data.fundamentals)} />
                            <StatRow label="52W High" value={getHighLow(data.fundamentals).high} />
                            <StatRow label="52W Low" value={getHighLow(data.fundamentals).low} />
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

                        {/* Add to Buy List — uses shared AddToWatchlistModal */}
                        <AddToWatchlistModal
                            open={buyListModalOpen}
                            onClose={() => setBuyListModalOpen(false)}
                            initialTicker={symbol}
                            onAdd={async (ticker, options) => {
                                await marketService.addToWatchlist(ticker, options);
                                setBuyListModalOpen(false);
                                showToast(`${ticker} added to Buy List`);
                            }}
                        />

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
                                sx: { bgcolor: '#0B0B0B', border: '1px solid #333', borderRadius: 4, minWidth: 500, p: 2 }
                            }}
                        >
                            <DialogTitle sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 2 }}>
                                SELECT PORTFOLIO
                            </DialogTitle>
                            <DialogContent>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {userPortfolios.length > 0 ? userPortfolios.map((portfolio: any) => (
                                        <Button
                                            key={portfolio.id}
                                            onClick={() => {
                                                setSelectedPortfolioId(portfolio.id);
                                                setPortfolioModalOpen(false);
                                                setTransactionModalOpen(true);
                                            }}
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
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>{portfolio.name}</Typography>
                                            <Typography variant="caption" sx={{ color: '#00E5FF' }}>+ Add Stock</Typography>
                                        </Button>
                                    )) : (
                                        <Typography sx={{ color: '#666', textAlign: 'center' }}>No portfolios found.</Typography>
                                    )}

                                    {/* Create New Portfolio Button — uses proper modal */}
                                    <Button
                                        onClick={() => {
                                            setPortfolioModalOpen(false);
                                            setIsCreatePortfolioModalOpen(true);
                                        }}
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
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>+ Create New Portfolio</Typography>
                                    </Button>
                                </Box>
                            </DialogContent>
                        </Dialog>

                        {/* Reused Transaction Modal for Adding to Portfolio */}
                        <AddTransactionModal
                            open={transactionModalOpen}
                            onClose={() => setTransactionModalOpen(false)}
                            initialTicker={symbol} // Lock the ticker
                            onSubmit={async (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL') => {
                                if (!selectedPortfolioId) return;
                                try {
                                    await marketService.addToPortfolio(selectedPortfolioId, {
                                        ticker,
                                        shares,
                                        avg_price: price
                                    });
                                    setTransactionModalOpen(false);
                                    showToast(`${ticker} added to portfolio`);
                                } catch (e) {
                                    console.error("Failed to add transaction:", e);
                                    showToast('Failed to add transaction', 'error');
                                }
                            }}
                        />

                        {/* Create Portfolio Modal — replaces browser prompt() */}
                        <CreatePortfolioModal
                            open={isCreatePortfolioModalOpen}
                            onClose={() => setIsCreatePortfolioModalOpen(false)}
                            onCreate={async (name) => {
                                try {
                                    await marketService.createPortfolio(name);
                                    const res = await marketService.getPortfolios();
                                    setUserPortfolios(res);
                                    setIsCreatePortfolioModalOpen(false);
                                    setPortfolioModalOpen(true); // Re-open portfolio selector
                                    showToast(`Portfolio "${name}" created`);
                                } catch (e) {
                                    console.error(e);
                                    showToast('Failed to create portfolio', 'error');
                                }
                            }}
                        />
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
                                    {aiSummary || data.summary || "Analyzing latest market news..."}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* 2. News Grid */}
                    <Grid container spacing={4}>
                        {news.map((item: any, index: number) => (
                            <Grid size={{ xs: 12, md: 4 }} key={index}>
                                <Box
                                    onClick={() => item.link && window.open(item.link, '_blank')}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: 3,
                                        height: '100%',
                                        transition: 'border-color 0.25s, background 0.25s, transform 0.2s',
                                        '&:hover': {
                                            borderColor: 'rgba(0, 229, 255, 0.3)',
                                            bgcolor: 'rgba(0, 229, 255, 0.03)',
                                            transform: 'translateY(-2px)',
                                        },
                                        '&:hover .news-title': { color: '#00E5FF' }
                                    }}>
                                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                        {/* Header: Logo + Source + Time */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            {/* Logo */}
                                            <Box sx={{
                                                width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', bgcolor: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <img
                                                    src={`https://www.google.com/s2/favicons?domain=${item.link || item.source}&sz=64`}
                                                    alt={item.source}
                                                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                                    onError={(e: any) => { e.target.style.display = 'none'; }}
                                                />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 700, display: 'block', lineHeight: 1 }}>{item.source || 'Market News'}</Typography>
                                                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>{item.time || 'Today'}</Typography>
                                            </Box>
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
                                            {item.title}
                                        </Typography>

                                        {/* Summary */}
                                        <Typography variant="body2" sx={{ color: '#888', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {item.summary || item.description}
                                        </Typography>
                                    </Box>
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
                </Dialog >

                {/* Global Toast */}
                <Snackbar
                    open={toast.open}
                    autoHideDuration={3000}
                    onClose={() => setToast(prev => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity={toast.severity}
                        onClose={() => setToast(prev => ({ ...prev, open: false }))}
                        sx={{ bgcolor: toast.severity === 'success' ? '#10B981' : '#EF4444', color: '#000', fontWeight: 600 }}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
}

// Format Market Cap Helper
function formatMarketCap(val: any) {
    if (!val) return 'N/A';
    // Clean string: remove ₹, Cr, commas, newlines, spaces
    const cleanStr = String(val).replace(/[₹,Cr.\n\s]/g, '');
    const num = parseFloat(cleanStr);

    if (isNaN(num)) return 'N/A';

    // Check if original string contained "Cr" or "Tr" to decide output unit
    // But commonly just formatting nicely is enough.
    // If num is huge (e.g. 2000000), treat as Cr if standard.
    // Given the example "276061 Cr", the number IS in Crores already.

    return `₹${num.toLocaleString('en-IN')} Cr`;
}

// Helper to get P/E
function getPE(fundamentals: any) {
    if (!fundamentals) return 'N/A';
    return fundamentals.pe_ratio || fundamentals['stock_p/e'] || 'N/A';
}

// Helper to get High/Low
function getHighLow(fundamentals: any) {
    if (!fundamentals) return { high: 'N/A', low: 'N/A' };

    // Check normalized keys first
    if (fundamentals.high_52w && fundamentals.low_52w) {
        return { high: `₹${fundamentals.high_52w}`, low: `₹${fundamentals.low_52w}` };
    }

    // Parse "high_/_low": "₹ 2613 / 1965"
    if (fundamentals['high_/_low']) {
        const parts = String(fundamentals['high_/_low']).replace(/[₹,]/g, '').split('/');
        if (parts.length === 2) {
            return {
                high: `₹${parts[0].trim()}`,
                low: `₹${parts[1].trim()}`
            };
        }
    }

    return { high: 'N/A', low: 'N/A' };
}

function StatRow({ label, value }: { label: string, value: string | number }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #222' }}>
            <Typography variant="body1" sx={{ color: '#888' }}>{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>{value}</Typography>
        </Box>
    );
}

function CustomTooltip({ active, payload, label, timeRange, showYear }: any) {
    if (active && payload && payload.length) {
        let dateStr = '';
        const dateObj = new Date(label);

        // Tooltip Logic:
        // If timeRange > 1d, hide time (show nothing for time).
        // If two diff years (showYear=true), include year.

        const isOneDay = timeRange === '1d' || timeRange === '5m';

        if (isOneDay) {
            // Show Time
            dateStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Show Date Only
            const options: any = { month: 'short', day: 'numeric' };
            if (showYear) {
                options.year = 'numeric';
            }
            dateStr = dateObj.toLocaleDateString([], options);
        }

        return (
            <Box sx={{
                bgcolor: 'rgba(10, 10, 10, 0.8)',
                border: '1px solid #333',
                borderRadius: 2,
                p: 1.5,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                minWidth: 140
            }}>
                <Typography variant="body2" sx={{ color: '#888', mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>
                    {dateStr}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                        ₹{parseFloat(payload[0].value).toFixed(2)}
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, fontSize: '0.7rem' }}>
                    Market Price
                </Typography>
            </Box>
        );
    }
    return null;
}

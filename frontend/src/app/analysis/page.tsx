'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Button, Avatar, Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scale, ArrowLeft, Laptop } from 'lucide-react';
import { useColorMode } from '@/theme/ThemeContext';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { marketService } from '@/services/marketService';
import { normalizeChartData } from '@/utils/chartDataUtils';
import { ComparisonTable } from '@/components/analysis/ComparisonTable';
import { StockSearchBar } from '@/components/analysis/StockSearchBar';
import { StockCard } from '@/components/analysis/StockCard';
import { CompareButton } from '@/components/analysis/CompareButton';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { ComparisonChart } from '@/components/analysis/ComparisonChart';
import { AIVerdict } from '@/components/analysis/AIVerdict';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function AnalysisPage() {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { mode } = useColorMode();
    const [hasMounted, setHasMounted] = useState(false);

    const [search, setSearch] = useState('');
    const [exchangeFilter, setExchangeFilter] = useState('ALL');
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'error' | 'success' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [stockNames, setStockNames] = useState<Record<string, string>>({});
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartPeriod, setChartPeriod] = useState('1y');

    const MAX_SLOTS = 5;

    // ALL hooks must be declared before any conditional return (Rules of Hooks)
    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stocksParam = params.get('stocks');
        if (stocksParam) {
            const symbols = stocksParam.split(',').map(s => s.trim().toUpperCase()).slice(0, MAX_SLOTS);
            setSelectedStocks(symbols);
            if (symbols.length >= 2) {
                setTimeout(() => handleCompare(symbols), 500);
            }
        }
    }, []);

    useEffect(() => {
        selectedStocks.forEach(async (ticker) => {
            if (!stockPrices[ticker]) {
                try {
                    const details = await marketService.getStockDetails(ticker);
                    setStockPrices(prev => ({ ...prev, [ticker]: details.market_data }));
                    setStockNames(prev => ({ ...prev, [ticker]: details.name || ticker }));
                } catch (error) {
                    console.error(`Failed to fetch details for ${ticker}`, error);
                }
            }
        });
    }, [selectedStocks]);

    const handleSearchChange = async (value: string, exchange: string = exchangeFilter) => {
        setSearch(value);
        setExchangeFilter(exchange);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await marketService.searchStocks(value, exchange);
            setSearchResults(results || []);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddStock = (ticker: string, companyName?: string) => {
        const upperTicker = ticker.trim().toUpperCase();
        if (!upperTicker) return;
        if (selectedStocks.includes(upperTicker)) {
            setToast({ open: true, message: `${upperTicker} is already in comparison`, severity: 'error' });
            return;
        }
        if (selectedStocks.length >= MAX_SLOTS) {
            setToast({ open: true, message: 'Maximum 5 stocks allowed', severity: 'error' });
            return;
        }

        const newStocks = [...selectedStocks, upperTicker];
        setSelectedStocks(newStocks);
        setSearch('');
        setSearchResults([]);
        setShowSearchOverlay(false);

        // Auto-update comparison if already active
        if (isComparing) {
            handleCompare(newStocks);
        }
    };

    const handleRemoveStock = (ticker: string) => {
        const newStocks = selectedStocks.filter(s => s !== ticker);
        setSelectedStocks(newStocks);

        // Auto-update comparison if already active
        if (isComparing && newStocks.length >= 2) {
            handleCompare(newStocks);
        } else if (isComparing && newStocks.length < 2) {
            // Exit comparison if less than 2 stocks
            setIsComparing(false);
        }
    };


    const handleCompare = async (stocks: string[] = selectedStocks) => {
        // Feature Restriction: PC/Tablet Only
        if (window.innerWidth < 768) {
            setToast({ open: true, message: 'For the best analytical experience, please access this feature on a tablet or desktop.', severity: 'info' });
            return;
        }

        if (stocks.length >= 2) {
            setIsComparing(true);
            setLoadingComparison(true);
            try {
                // Fetch comparison data and historical data in parallel
                const [comparisonResult, historyResults] = await Promise.all([
                    marketService.compareStocks(stocks),
                    marketService.getComparisonHistory(stocks, chartPeriod)
                ]);

                setComparisonData(comparisonResult);

                // Normalize and set chart data
                const normalized = normalizeChartData(historyResults, stocks);
                setChartData(normalized);

                setTimeout(() => {
                    document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } catch (error) {
                console.error('Comparison failed:', error);
                setComparisonData({ error: 'Failed to compare stocks. Please try again.' });
            } finally {
                setLoadingComparison(false);
            }
        }
    };

    const quickInfo = stockPrices[search.toUpperCase()];

    // Mobile Block Screen — rendered after all hooks (Rules of Hooks compliant)
    if (hasMounted && isMobile) {
        return (
            <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: theme.palette.background.default, overflow: 'hidden' }}>
                <Sidebar />
                <Box sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 3,
                    textAlign: 'center',
                    position: 'relative',
                }}>
                    {/* Ambient background glows */}
                    <Box sx={{
                        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                        width: 300, height: 300, borderRadius: '50%',
                        background: `radial-gradient(circle, ${theme.palette.primary.main}20 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    <Box component={motion.div}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            maxWidth: 380,
                            width: '100%',
                            p: { xs: 3, sm: 4 },
                            borderRadius: 5,
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: mode === 'dark'
                                ? '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : '0 40px 80px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2.5,
                        }}
                    >
                        {/* Icon */}
                        <Box component={motion.div}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            sx={{
                                width: 72, height: 72, borderRadius: 4,
                                bgcolor: `${theme.palette.primary.main}15`,
                                border: `1px solid ${theme.palette.primary.main}30`,
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <Laptop size={34} color={theme.palette.primary.main} />
                        </Box>

                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 1, color: theme.palette.text.primary }}>
                                Built for Desktop
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
                                The Comparison Engine is a heavyweight analysis tool. Charts, data tables, and AI verdicts work best on a larger screen.
                            </Typography>
                        </Box>

                        {/* Feature pills */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                            {['Side-by-Side Charts', 'AI Verdict', 'Key Metrics', 'Performance Table'].map((f) => (
                                <Box key={f} sx={{
                                    px: 1.5, py: 0.5, borderRadius: 2, bgcolor: `${theme.palette.primary.main}10`,
                                    border: `1px solid ${theme.palette.primary.main}25`,
                                    fontSize: '0.72rem', color: theme.palette.primary.main, fontWeight: 600
                                }}>{f}</Box>
                            ))}
                        </Box>

                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => router.push('/dashboard')}
                            sx={{
                                mt: 1,
                                bgcolor: mode === 'dark' ? '#fff' : theme.palette.primary.main,
                                color: mode === 'dark' ? '#000' : '#fff',
                                borderRadius: 3,
                                py: 1.5,
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                '&:hover': { bgcolor: mode === 'dark' ? '#e0e0e0' : theme.palette.primary.dark }
                            }}
                        >
                            Back to Dashboard
                        </Button>
                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                            Open clarity-invest.vercel.app on your laptop for the full experience
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            minHeight: '100dvh',
            bgcolor: 'background.default',
            position: 'relative'
        }}>
            <Sidebar />
            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 2, md: 6 },
                ml: { md: '120px' },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
            }}>
                <Box sx={{ width: '100%', maxWidth: 1200, mb: 2 }}>
                    <Button
                        startIcon={<ArrowLeft size={20} />}
                        onClick={() => router.back()}
                        sx={{
                            color: 'text.secondary',
                            pl: 0,
                            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
                            alignSelf: 'flex-start'
                        }}
                    >
                        Back
                    </Button>
                </Box>

                {/* Header */}
                <AnimatePresence mode="wait">
                    {!isComparing ? (
                        <Box key="hero" sx={{ textAlign: 'center', mb: 10, mt: 4 }}>
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.2em', mb: 1, display: 'block' }}>
                                    MARKET INTELLIGENCE
                                </Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 2, color: 'text.primary' }}>
                                    Compare & Analyze
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
                                    Institutional-grade comparison. Add up to 5 assets to visualize relative performance and fundamental strength.
                                </Typography>
                            </motion.div>
                        </Box>
                    ) : (
                        <Box key="compact" sx={{ mb: 4, mt: 2, width: '100%', maxWidth: 1200 }}>
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.15em', display: 'block', mb: 0.5 }}>
                                    COMPARISON RESULTS
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                                    {selectedStocks.join(' vs ')}
                                </Typography>
                            </motion.div>
                        </Box>
                    )}
                </AnimatePresence>

                {/* Stock Cards Grid */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: 1200, mb: isComparing ? 4 : 8, width: '100%', transition: 'all 0.5s' }}>
                    {selectedStocks.map((stock) => (
                        <StockCard
                            key={stock}
                            symbol={stock}
                            companyName={stockNames[stock]}
                            stockData={stockPrices[stock]}
                            isComparing={isComparing}
                            onRemove={() => handleRemoveStock(stock)}
                        />
                    ))}

                    {selectedStocks.length < MAX_SLOTS && (
                        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.1, rotate: 90 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                                <IconButton
                                    onClick={() => setShowSearchOverlay(true)}
                                    sx={{ width: 80, height: 80, borderRadius: '50%', border: '1px dashed', borderColor: 'divider', color: 'text.disabled', transition: 'all 0.3s', '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'action.hover' } }}
                                >
                                    <Plus size={32} />
                                </IconButton>
                            </motion.div>
                        </Box>
                    )}
                </Box>

                {/* Search Bar - Using Component - Only show if less than 2 stocks OR overlay is active */}
                {(selectedStocks.length < 2 || showSearchOverlay) && (
                    <StockSearchBar
                        search={search}
                        exchangeFilter={exchangeFilter}
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        disabled={selectedStocks.length >= MAX_SLOTS}
                        onSearchChange={(val: string) => handleSearchChange(val, exchangeFilter)}
                        onExchangeChange={(ex: string) => handleSearchChange(search, ex)}
                        onSelectStock={(symbol, name) => {
                            handleAddStock(symbol, name);
                            setShowSearchOverlay(false);
                        }}
                    />
                )}

                {/* Compare Button - Using Component */}
                <Box sx={{ mt: 8 }}>
                    {!isComparing && selectedStocks.length >= 2 && (
                        <CompareButton
                            stockCount={selectedStocks.length}
                            isLoading={loadingComparison}
                            onClick={() => handleCompare()}
                        />
                    )}
                    {!isComparing && selectedStocks.length < 2 && (
                        <Button variant="contained" size="large" disabled sx={{ bgcolor: '#222', color: '#444', fontWeight: 700, px: 6, py: 1.8, borderRadius: '16px', textTransform: 'none' }}>
                            Select at least 2 assets
                        </Button>
                    )}
                    {isComparing && (
                        <Button variant="outlined" onClick={() => setIsComparing(false)} sx={{ color: 'text.secondary', borderColor: 'divider', borderRadius: '99px', '&:hover': { color: 'text.primary', borderColor: 'text.primary' } }}>
                            Reset Comparison
                        </Button>
                    )}
                </Box>

                {/* Analysis Section */}
                <AnimatePresence>
                    {isComparing && (
                        <motion.div id="analysis-section" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: 0.6 }} style={{ width: '100%', maxWidth: 1200, marginTop: 60, paddingBottom: 100 }}>

                            {/* Error Banner - Using Component */}
                            {comparisonData?.error && (
                                <ErrorBanner error={comparisonData.error} onRetry={() => handleCompare()} />
                            )}

                            {/* Chart */}
                            <Box sx={{ bgcolor: 'background.paper', borderRadius: 6, border: '1px solid', borderColor: 'divider', p: { xs: 1, md: 3 }, height: { xs: 400, sm: 450, md: 500 }, mb: 4, position: 'relative', overflow: 'hidden', backgroundImage: 'none' }}>
                                {/* Date Range Selector */}
                                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                                    {['1mo', '3mo', '6mo', '1y', '5y'].map((range) => (
                                        <Button
                                            key={range}
                                            size="small"
                                            onClick={async () => {
                                                setChartPeriod(range);
                                                // Refetch comparison with new period
                                                if (selectedStocks.length >= 2) {
                                                    setLoadingComparison(true);
                                                    try {
                                                        const historyResults = await marketService.getComparisonHistory(selectedStocks, range);
                                                        const normalized = normalizeChartData(historyResults, selectedStocks);
                                                        setChartData(normalized);
                                                    } catch (error) {
                                                        console.error('Failed to fetch history:', error);
                                                    } finally {
                                                        setLoadingComparison(false);
                                                    }
                                                }
                                            }}
                                            sx={{
                                                minWidth: 0,
                                                px: 1.5,
                                                color: chartPeriod === range ? 'primary.main' : 'text.secondary',
                                                fontWeight: 700,
                                                bgcolor: chartPeriod === range ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' }
                                            }}
                                        >
                                            {range === '1mo' ? '1M' : range === '3mo' ? '3M' : range === '6mo' ? '6M' : range === '1y' ? '1Y' : '5Y'}
                                        </Button>
                                    ))}
                                </Box>

                                <ComparisonChart
                                    chartData={chartData}
                                    selectedStocks={selectedStocks}
                                    chartPeriod={chartPeriod}
                                    key={chartPeriod} // Force re-render on period change
                                />
                            </Box>

                            {/* Fundamentals Table */}
                            <Box sx={{ bgcolor: 'background.paper', borderRadius: 6, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 4, backgroundImage: 'none' }}>
                                <Box sx={{ p: { xs: 2, md: 4 }, overflowX: 'auto' }}>
                                    <Box sx={{ minWidth: { xs: 500, md: 600 } }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`, gap: { xs: 1, md: 2 }, pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Metric</Typography>
                                            {selectedStocks.map((s, i) => (
                                                <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                    <Box sx={{ width: { xs: 6, md: 8 }, height: { xs: 6, md: 8 }, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>{s}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <ComparisonTable comparisonData={comparisonData} selectedStocks={selectedStocks} />
                                    </Box>
                                </Box>
                            </Box>

                            {/* AI Verdict */}
                            <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 4, backgroundImage: 'none' }}>
                                <AIVerdict comparisonData={comparisonData} selectedStocks={selectedStocks} />
                            </Paper>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toast */}
                <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
                </Snackbar>

                <DisclaimerFooter />
            </Box>
        </Box >
    );
}

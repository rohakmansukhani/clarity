'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Button, Avatar, Snackbar, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scale } from 'lucide-react';
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
    const [search, setSearch] = useState('');
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

    const handleSearchChange = async (value: string) => {
        setSearch(value);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await marketService.searchStocks(value);
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
        setSelectedStocks([...selectedStocks, upperTicker]);
        setSearch('');
        setSearchResults([]);
        setShowSearchOverlay(false);
    };

    const handleRemoveStock = (ticker: string) => {
        setSelectedStocks(selectedStocks.filter(s => s !== ticker));
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

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000000' }}>
            <Sidebar />
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Header */}
                <AnimatePresence>
                    {!isComparing && (
                        <Box sx={{ textAlign: 'center', mb: 10, mt: 4 }}>
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                                <Typography variant="overline" sx={{ color: '#00E5FF', fontWeight: 700, letterSpacing: '0.2em', mb: 1, display: 'block' }}>
                                    MARKET INTELLIGENCE
                                </Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 2, background: '#ffffff', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Compare & Analyze
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#888', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
                                    Institutional-grade comparison. Add up to 5 assets to visualize relative performance and fundamental strength.
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
                                    sx={{ width: 80, height: 80, borderRadius: '50%', border: '1px dashed #333', color: '#444', transition: 'all 0.3s', '&:hover': { borderColor: '#00E5FF', color: '#00E5FF', bgcolor: 'rgba(0, 229, 255, 0.05)' } }}
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
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        disabled={selectedStocks.length >= MAX_SLOTS}
                        onSearchChange={handleSearchChange}
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
                        <Button variant="outlined" onClick={() => setIsComparing(false)} sx={{ color: '#666', borderColor: '#333', borderRadius: '99px', '&:hover': { color: '#fff', borderColor: '#fff' } }}>
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
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', p: { xs: 1, md: 3 }, height: { xs: 400, sm: 450, md: 500 }, mb: 4, position: 'relative', overflow: 'hidden' }}>
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
                                                color: chartPeriod === range ? '#00E5FF' : '#666',
                                                fontWeight: 700,
                                                bgcolor: chartPeriod === range ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
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
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', overflow: 'hidden', mb: 4 }}>
                                <Box sx={{ p: { xs: 2, md: 4 }, overflowX: 'auto' }}>
                                    <Box sx={{ minWidth: { xs: 500, md: 600 } }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`, gap: { xs: 1, md: 2 }, pb: 2, borderBottom: '1px solid #333', mb: 2 }}>
                                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Metric</Typography>
                                            {selectedStocks.map((s, i) => (
                                                <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                    <Box sx={{ width: { xs: 6, md: 8 }, height: { xs: 6, md: 8 }, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>{s}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <ComparisonTable comparisonData={comparisonData} selectedStocks={selectedStocks} />
                                    </Box>
                                </Box>
                            </Box>

                            {/* AI Verdict */}
                            <Paper sx={{ p: 4, borderRadius: 6, bgcolor: '#0A0A0A', border: '1px solid #222', mb: 4 }}>
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

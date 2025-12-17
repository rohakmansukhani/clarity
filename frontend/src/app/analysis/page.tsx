'use client';

import { useState } from 'react';
import { Box, Typography, Paper, IconButton, TextField, Button, Avatar } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, ArrowRight, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Data for "Quick Info" simulation
const MOCK_PRICES: Record<string, { price: string, change: string, up: boolean, logo: string | null }> = {
    'TCS': { price: '₹3,450.20', change: '+1.2%', up: true, logo: 'T' },
    'RELIANCE': { price: '₹2,340.50', change: '-0.5%', up: false, logo: 'R' },
    'HDFCBANK': { price: '₹1,560.00', change: '+0.8%', up: true, logo: 'H' },
    'INFY': { price: '₹1,420.10', change: '-1.1%', up: false, logo: 'I' },
    'TATAMOTORS': { price: '₹945.50', change: '+2.8%', up: true, logo: 'T' },
};

export default function AnalysisPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);

    // Max 5 stocks for comparison
    const MAX_SLOTS = 5;

    const handleAddStock = (ticker: string) => {
        const t = ticker.trim().toUpperCase();
        if (t && !selectedStocks.includes(t) && selectedStocks.length < MAX_SLOTS) {
            setSelectedStocks([...selectedStocks, t]);
            setSelectedStocks([...selectedStocks, t]);
            setSearch('');
            setShowSearchOverlay(false);
        }
    };

    const handleRemoveStock = (ticker: string) => {
        setSelectedStocks(selectedStocks.filter(s => s !== ticker));
    };

    const handleCompare = () => {
        if (selectedStocks.length >= 2) {
            setIsComparing(true);
            // In a real app, we'd fetch data here. For now, we use the mocks.
            setTimeout(() => {
                document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    // Quick Info for current search
    const quickInfo = search.length > 2 ? MOCK_PRICES[search.toUpperCase()] : null;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Header with improved typography - Hide when comparing to focus on data */}
                <AnimatePresence>
                    {!isComparing && (
                        <Box sx={{ textAlign: 'center', mb: 10, mt: 4 }}>
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                                <Typography variant="overline" sx={{ color: '#00E5FF', fontWeight: 700, letterSpacing: '0.2em', mb: 1, display: 'block' }}>
                                    MARKET INTELLIGENCE
                                </Typography>
                                <Typography variant="h2" sx={{
                                    fontWeight: 800,
                                    letterSpacing: '-0.03em',
                                    mb: 2,
                                    background: '#ffffff',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Compare & Analyze
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#888', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
                                    Institutional-grade comparison. Add up to 5 assets to visualize relative performance and fundamental strength.
                                </Typography>
                            </motion.div>
                        </Box>
                    )}
                </AnimatePresence>

                {/* Comparison Slots - Dynamic List */}
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    justifyContent: 'center',
                    maxWidth: 1200,
                    mb: isComparing ? 4 : 8,
                    width: '100%',
                    transition: 'all 0.5s'
                }}>
                    {/* Render Selected Stocks */}
                    {selectedStocks.map((stock, i) => {
                        const stockData = MOCK_PRICES[stock];
                        return (
                            <Box key={stock} sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200 }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    layoutId={`stock-card-${stock}`}
                                    transition={{ delay: i * 0.05 }}
                                    className="h-full"
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            height: isComparing ? 180 : 280, // Shrink when comparing
                                            borderRadius: '32px',
                                            bgcolor: '#121212',
                                            border: '1px solid #222',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                            cursor: 'default',
                                            '&:hover': { transform: 'scale(1.02)', bgcolor: '#151515', borderColor: '#333' }
                                        }}
                                    >
                                        {!isComparing && (
                                            <IconButton
                                                onClick={(e) => { e.stopPropagation(); handleRemoveStock(stock); }}
                                                sx={{ position: 'absolute', top: 16, right: 16, color: '#444', bgcolor: '#1A1A1A', '&:hover': { color: '#fff', bgcolor: '#EF4444' } }}
                                                size="small"
                                            >
                                                <X size={14} />
                                            </IconButton>
                                        )}

                                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', p: 3 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, background: '#ffffff', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                                                {stock}
                                            </Typography>
                                            {!isComparing && <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, letterSpacing: '0.1em', mb: 4 }}>NASDAQ</Typography>}

                                            {stockData ? (
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography variant="h3" sx={{ fontWeight: 600, color: '#fff', fontSize: isComparing ? '1.5rem' : '2rem', letterSpacing: '-0.03em', mb: 1 }}>{stockData.price}</Typography>
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: '99px', bgcolor: stockData.up ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                                        {stockData.up ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
                                                        <Typography variant="caption" sx={{ color: stockData.up ? '#10B981' : '#EF4444', fontWeight: 700 }}>{stockData.change}</Typography>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ height: 60, display: 'flex', alignItems: 'center' }}><Typography variant="body2" sx={{ color: '#444' }}>Loading...</Typography></Box>
                                            )}
                                        </Box>
                                    </Paper>
                                </motion.div>
                            </Box>
                        );
                    })}

                    {/* Minimal Add Button (Icon Only) */}
                    {selectedStocks.length < MAX_SLOTS && (
                        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            >
                                <IconButton
                                    onClick={() => {
                                        if (isComparing) {
                                            setShowSearchOverlay(true);
                                        } else {
                                            document.getElementById('search-input')?.focus();
                                        }
                                    }}
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        border: '1px dashed #333',
                                        color: '#444',
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            borderColor: '#00E5FF',
                                            color: '#00E5FF',
                                            bgcolor: 'rgba(0, 229, 255, 0.05)'
                                        }
                                    }}
                                >
                                    <Plus size={32} />
                                </IconButton>
                            </motion.div>
                        </Box>
                    )}
                </Box>

                {/* Search Bar */}
                <Box sx={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 10 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 0.5,
                            pl: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '24px',
                            bgcolor: '#0A0A0A',
                            border: '1px solid #222',
                            transition: 'all 0.3s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            '&:focus-within': { borderColor: '#00E5FF', boxShadow: '0 0 0 2px rgba(0, 229, 255, 0.1)' }
                        }}
                    >
                        <Search className="text-gray-500" size={20} />
                        <TextField
                            id="search-input"
                            fullWidth
                            variant="standard"
                            placeholder={selectedStocks.length >= MAX_SLOTS ? "Slots full" : "Search to add (e.g. TCS)..."}
                            disabled={selectedStocks.length >= MAX_SLOTS}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => (e.key === 'Enter' && search) && handleAddStock(search)}
                            sx={{ mx: 2, py: 1.5 }}
                            InputProps={{ disableUnderline: true, sx: { color: '#fff', fontSize: '1rem', fontWeight: 500 } }}
                        />
                        <IconButton
                            onClick={() => search && handleAddStock(search)}
                            disabled={!search || selectedStocks.length >= MAX_SLOTS}
                            sx={{ bgcolor: '#fff', color: '#000', p: 1.2, mr: 0.5, '&:hover': { bgcolor: '#ddd' }, '&:disabled': { bgcolor: '#222', color: '#444' } }}
                        >
                            <ArrowRight size={20} />
                        </IconButton>
                    </Paper>

                    {/* Quick Info Popover (Normal) - Hide when comparing */}
                    <AnimatePresence>
                        {quickInfo && !isComparing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-4 mx-2"
                                onClick={() => handleAddStock(search)}
                                style={{ cursor: 'pointer' }}
                            >
                                <Paper sx={{
                                    p: 2,
                                    borderRadius: 4,
                                    bgcolor: '#111',
                                    border: '1px solid #222',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'border-color 0.2s',
                                    '&:hover': { borderColor: '#00E5FF' }
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#0b1320ff', fontSize: '1rem', fontWeight: 800, color: '#00E5FF' }}>
                                            {quickInfo.logo}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>{search.toUpperCase()}</Typography>
                                            <Typography variant="caption" sx={{ color: '#666' }}>Click to Add</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>{quickInfo.price}</Typography>
                                        <Typography variant="caption" sx={{ color: quickInfo.up ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                            {quickInfo.change}
                                        </Typography>
                                    </Box>
                                </Paper>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>

                {/* Overlay Search Bar (Floating) - Only visible when triggered in Comparison Mode */}
                <AnimatePresence>
                    {isComparing && showSearchOverlay && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed',
                                top: 100,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '90%',
                                maxWidth: 600,
                                zIndex: 100
                            }}
                        >
                            <Paper
                                elevation={24}
                                sx={{
                                    p: 1,
                                    pl: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '24px',
                                    bgcolor: '#111',
                                    border: '1px solid #333',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                                }}
                            >
                                <Search className="text-gray-500" size={20} />
                                <TextField
                                    autoFocus
                                    fullWidth
                                    variant="standard"
                                    placeholder="Search asset to add..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    // Handle Enter key to add stock
                                    onKeyDown={(e) => (e.key === 'Enter' && search) && handleAddStock(search)}
                                    sx={{ mx: 2, py: 1 }}
                                    InputProps={{ disableUnderline: true, sx: { color: '#fff' } }}
                                />
                                <IconButton onClick={() => setShowSearchOverlay(false)} sx={{ color: '#666' }}>
                                    <X size={20} />
                                </IconButton>
                            </Paper>
                            {/* Quick Info Logic Reuse */}
                            {quickInfo && (
                                <Paper sx={{ mt: 2, p: 2, bgcolor: '#1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { handleAddStock(search); setShowSearchOverlay(false); }}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Avatar sx={{ bgcolor: '#333', color: '#00E5FF' }}>{quickInfo.logo}</Avatar>
                                        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>{search.toUpperCase()}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ color: '#fff', fontWeight: 700 }}>{quickInfo.price}</Typography>
                                        <Typography variant="caption" sx={{ color: quickInfo.up ? '#10B981' : '#EF4444' }}>{quickInfo.change}</Typography>
                                    </Box>
                                </Paper>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Compare Button - Transition to "Reset" when comparing ? Or keep it simple */}
                <Box sx={{ mt: 8 }}>
                    {!isComparing ? (
                        <Button
                            variant="contained"
                            size="large"
                            disabled={selectedStocks.length < 2}
                            onClick={handleCompare}
                            sx={{
                                bgcolor: '#fff',
                                color: '#000',
                                fontWeight: 700,
                                px: 6,
                                py: 1.8,
                                borderRadius: '16px',
                                fontSize: '1rem',
                                letterSpacing: '0.02em',
                                textTransform: 'none',
                                boxShadow: '0 0 20px rgba(255,255,255,0.1)',
                                '&:hover': { bgcolor: '#f0f0f0', transform: 'translateY(-2px)', boxShadow: '0 0 30px rgba(255,255,255,0.2)' },
                                '&:disabled': { bgcolor: '#222', color: '#444', boxShadow: 'none', transform: 'none' },
                                transition: 'all 0.3s'
                            }}
                        >
                            {selectedStocks.length < 2 ? "Select at least 2 assets" : `Compare ${selectedStocks.length} Assets`}
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            onClick={() => setIsComparing(false)}
                            sx={{
                                color: '#666',
                                borderColor: '#333',
                                borderRadius: '99px',
                                '&:hover': { color: '#fff', borderColor: '#fff' }
                            }}
                        >
                            Reset Comparison
                        </Button>
                    )}
                </Box>

                {/* FULL ANALYSIS SECTION */}
                <AnimatePresence>
                    {isComparing && (
                        <motion.div
                            id="analysis-section"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{ width: '100%', maxWidth: 1200, marginTop: 60, paddingBottom: 100 }}
                        >
                            {/* 1. Chart Section (Full Width, Moved to Top) */}
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', p: 3, height: 500, mb: 4, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Relative Performance (1Y)</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {selectedStocks.map((s, i) => (
                                            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>{s}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <ResponsiveContainer width="100%" height="90%">
                                    <LineChart
                                        data={[
                                            { month: 'Jan', stock1: 100, stock2: 100, stock3: 100, stock4: 100, stock5: 100 },
                                            { month: 'Feb', stock1: 105, stock2: 98, stock3: 102, stock4: 104, stock5: 96 },
                                            { month: 'Mar', stock1: 108, stock2: 102, stock3: 106, stock4: 110, stock5: 94 },
                                            { month: 'Apr', stock1: 112, stock2: 105, stock3: 104, stock4: 115, stock5: 99 },
                                            { month: 'May', stock1: 110, stock2: 108, stock3: 110, stock4: 118, stock5: 102 },
                                            { month: 'Jun', stock1: 115, stock2: 112, stock3: 115, stock4: 122, stock5: 105 },
                                        ]}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <XAxis dataKey="month" stroke="#444" tick={{ fill: '#666' }} dy={10} />
                                        <YAxis stroke="#444" tick={{ fill: '#666' }} dx={-10} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    // Sort payload by value descending for better overlap handling
                                                    const sortedPayload = [...payload].sort((a, b) => (b.value as number) - (a.value as number));
                                                    return (
                                                        <Paper sx={{
                                                            bgcolor: 'rgba(10, 10, 10, 0.8)',
                                                            backdropFilter: 'blur(10px)',
                                                            border: '1px solid #333',
                                                            p: 2,
                                                            borderRadius: 4,
                                                            minWidth: 150
                                                        }}>
                                                            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>{label}</Typography>
                                                            {sortedPayload.map((entry: any, index: number) => (
                                                                <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.stroke }} />
                                                                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                                                                            {selectedStocks[parseInt(entry.dataKey.replace('stock', '')) - 1]}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>{entry.value}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Paper>
                                                    );
                                                }
                                                return null;
                                            }}
                                            cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        {selectedStocks.map((s, i) => (
                                            <Line
                                                key={s}
                                                type="monotone"
                                                dataKey={`stock${i + 1}`}
                                                stroke={['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5]}
                                                strokeWidth={3}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>

                            {/* 2. Fundamentals Table (Refined Grid Layout) */}
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', overflow: 'hidden', mb: 4 }}>
                                <Box sx={{ p: 4, overflowX: 'auto' }}>
                                    <Box sx={{ minWidth: 600 }}> {/* Ensure minimum width for scrolling on mobile */}

                                        {/* Header Row */}
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`,
                                            gap: 2,
                                            pb: 2,
                                            borderBottom: '1px solid #333',
                                            mb: 2
                                        }}>
                                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Metric</Typography>
                                            {selectedStocks.map((s, i) => (
                                                <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>{s}</Typography>
                                                </Box>
                                            ))}
                                        </Box>

                                        {/* Data Rows */}
                                        {[
                                            { label: 'Market Cap', isHighGood: true, values: ['₹12.4T', '₹15.8T', '₹9.2T', '₹11.1T', '₹6.5T'] },
                                            { label: 'P/E Ratio', isHighGood: false, values: ['24.5', '18.2', '21.4', '28.1', '15.9'] },
                                            { label: 'ROE', isHighGood: true, values: ['18.4%', '12.1%', '15.5%', '19.2%', '14.0%'] },
                                            { label: 'Div Yield', isHighGood: true, values: ['1.2%', '0.8%', '1.5%', '0.5%', '2.1%'] },
                                            { label: 'Debt/Eq', isHighGood: false, values: ['0.05', '0.45', '0.12', '0.02', '0.68'] },
                                        ].map((row, i) => {
                                            // Dynamic "Winning" Logic
                                            const numericValues = row.values.slice(0, selectedStocks.length).map(v => parseFloat(v.replace(/[^0-9.]/g, '')));
                                            const validValues = numericValues.filter(n => !isNaN(n));

                                            if (validValues.length === 0) return null;

                                            const bestValue = row.isHighGood ? Math.max(...validValues) : Math.min(...validValues);
                                            const winIndex = numericValues.indexOf(bestValue);

                                            return (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`,
                                                        gap: 2,
                                                        py: 2.5,
                                                        borderBottom: '1px solid #1a1a1a',
                                                        transition: 'background-color 0.2s',
                                                        '&:last-child': { borderBottom: 'none' },
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{ color: '#888', fontWeight: 600 }}>{row.label}</Typography>
                                                    {selectedStocks.map((s, idx) => {
                                                        const val = row.values[idx] || '-';
                                                        const isWinner = idx === winIndex;
                                                        const winColor = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][idx % 5];

                                                        return (
                                                            <Typography
                                                                key={s}
                                                                variant="body2"
                                                                sx={{
                                                                    color: isWinner ? winColor : '#fff',
                                                                    fontWeight: isWinner ? 800 : 500,
                                                                    textAlign: 'center',
                                                                    opacity: isWinner ? 1 : 0.7
                                                                }}
                                                            >
                                                                {val}
                                                            </Typography>
                                                        );
                                                    })}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Box>

                            {/* 3. AI Verdict (Bottom) */}
                            <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.1)', mb: 4, position: 'relative', overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                                    <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF' }}>
                                        <Scale size={32} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>Clarity Verdict</Typography>
                                        <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.6 }}>
                                            Based on current fundamentals, <strong style={{ color: '#fff' }}>{selectedStocks[0]}</strong> appears to be the stronger long-term hold due to superior free cash flow and lower debt levels. However, <strong style={{ color: '#fff' }}>{selectedStocks[1]}</strong> offers better short-term momentum.
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Box >
    );
}

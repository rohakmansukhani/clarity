'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Grid, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Chip, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Menu, ListItemIcon, Divider, Card, CardContent, CardActionArea } from '@mui/material';
import { TrendingUp, TrendingDown, Plus, Wallet, PieChart as PieChartIcon, X, Search, ChevronDown, FolderPlus, Folder, Trash2, ArrowLeft, ArrowRight, MoreVertical } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';

// --- Interfaces ---
interface Holding {
    ticker: string;
    shares: number;
    avg_price: number;
    current_price: number; // Simulated "Live" price
    current_value: number;
    invested_value: number;
    gain: number;
    gain_pct: number;
}

interface Portfolio {
    id: string;
    name: string;
    total_value: number;
    total_invested: number;
    total_gain: number;
    return_pct: number;
    holdings: Holding[];
}

// --- Initial Mock Data ---
const INITIAL_PORTFOLIOS: Portfolio[] = [
    {
        id: 'main',
        name: 'Main Portfolio',
        total_value: 1245000.00,
        total_invested: 1060000.00,
        total_gain: 185000.00,
        return_pct: 17.45,
        holdings: [
            { ticker: 'RELIANCE', shares: 50, avg_price: 2450, current_price: 2985.40, current_value: 149270, invested_value: 122500, gain: 26770, gain_pct: 21.85 },
            { ticker: 'TCS', shares: 25, avg_price: 3200, current_price: 3890.00, current_value: 97250, invested_value: 80000, gain: 17250, gain_pct: 21.56 },
            { ticker: 'HDFC', shares: 100, avg_price: 1450, current_price: 1650.00, current_value: 165000, invested_value: 145000, gain: 20000, gain_pct: 13.79 },
        ]
    },
    {
        id: 'retirement',
        name: 'Retirement Fund',
        total_value: 540000.00,
        total_invested: 400000.00,
        total_gain: 140000.00,
        return_pct: 35.00,
        holdings: []
    }
];

const SECTOR_COLORS = ['#00E5FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export default function PortfolioPage() {
    // --- State ---
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [view, setView] = useState<'holdings' | 'allocation'>('holdings'); // Detail sub-view
    const [loading, setLoading] = useState(true);

    // Multi-Portfolio State
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    // Modals & Menus
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [portfolioMenuAnchor, setPortfolioMenuAnchor] = useState<null | HTMLElement>(null);

    // --- Simulation Init ---
    useEffect(() => {
        // Simulate fetching data
        setTimeout(() => {
            setPortfolios(INITIAL_PORTFOLIOS);
            setActiveId(''); // Start with no active portfolio selected
            setLoading(false);
        }, 800);
    }, []);

    const activePortfolio = useMemo(() =>
        portfolios.find(p => p.id === activeId) || null,
        [portfolios, activeId]);

    // --- Actions ---
    const handlePortfolioClick = (id: string) => {
        setActiveId(id);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setActiveId('');
    };

    const handleCreatePortfolio = (name: string) => {
        const newPortfolio: Portfolio = {
            id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: name,
            total_value: 0,
            total_invested: 0,
            total_gain: 0,
            return_pct: 0,
            holdings: []
        };
        setPortfolios([...portfolios, newPortfolio]);
        // Don't auto-switch, just add to list
        setIsCreateModalOpen(false);
    };

    const handleDeletePortfolio = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (portfolios.length <= 1) return; // Prevent deleting last one
        const newList = portfolios.filter(p => p.id !== id);
        setPortfolios(newList);
        if (activeId === id) {
            setActiveId('');
            setViewMode('list');
        }
    };

    const handleAddTransaction = (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL') => {
        if (!activePortfolio) return;

        // Create a deep copy of the active portfolio
        const updatedPortfolio = { ...activePortfolio, holdings: [...activePortfolio.holdings.map(h => ({ ...h }))] };

        const existingIndex = updatedPortfolio.holdings.findIndex(h => h.ticker === ticker);

        if (existingIndex > -1) {
            // Update existing holding
            const h = updatedPortfolio.holdings[existingIndex];
            if (type === 'BUY') {
                const totalCost = (h.shares * h.avg_price) + (shares * price);
                const totalShares = h.shares + shares;
                h.shares = totalShares;
                h.avg_price = totalCost / totalShares;
            } else {
                // Sell logic 
                h.shares = Math.max(0, h.shares - shares);
            }
            // Recalculate
            h.current_price = price;
            h.current_value = h.shares * h.current_price;
            h.invested_value = h.shares * h.avg_price;
            h.gain = h.current_value - h.invested_value;
            h.gain_pct = (h.invested_value !== 0) ? (h.gain / h.invested_value) * 100 : 0;

            if (h.shares === 0) updatedPortfolio.holdings.splice(existingIndex, 1);

        } else if (type === 'BUY') {
            // New holding
            updatedPortfolio.holdings.push({
                ticker,
                shares,
                avg_price: price,
                current_price: price,
                current_value: shares * price,
                invested_value: shares * price,
                gain: 0,
                gain_pct: 0
            });
        }

        // Recalculate Totals
        updatedPortfolio.total_invested = updatedPortfolio.holdings.reduce((sum, h) => sum + h.invested_value, 0);
        updatedPortfolio.total_value = updatedPortfolio.holdings.reduce((sum, h) => sum + h.current_value, 0);
        updatedPortfolio.total_gain = updatedPortfolio.total_value - updatedPortfolio.total_invested;
        updatedPortfolio.return_pct = updatedPortfolio.total_invested > 0 ? (updatedPortfolio.total_gain / updatedPortfolio.total_invested) * 100 : 0;
        updatedPortfolio.return_pct = parseFloat(updatedPortfolio.return_pct.toFixed(2));

        // Update State List
        setPortfolios(portfolios.map(p => p.id === activeId ? updatedPortfolio : p));
        setIsTxModalOpen(false);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#000' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    const allocationData = activePortfolio ? activePortfolio.holdings.map((h, i) => ({
        name: h.ticker,
        value: h.current_value,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length]
    })) : [];

    return (
        <>
            <Sidebar />
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                sx={{
                    maxWidth: 1600,
                    mx: 'auto',
                    pb: 10,
                    pt: 6,
                    bgcolor: '#000',
                    minHeight: '100vh',
                    pr: { xs: 2, md: 6 },
                    pl: { xs: 2, md: '140px' }
                }}
            >
                {/* --- LIST VIEW --- */}
                {viewMode === 'list' && (
                    <Box>
                        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>My Portfolios</Typography>
                                <Typography variant="body1" sx={{ color: '#666' }}>Select a portfolio to manage holdings and analyze performance.</Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={20} />}
                                onClick={() => setIsCreateModalOpen(true)}
                                sx={{
                                    bgcolor: '#00E5FF',
                                    color: '#000',
                                    fontWeight: 700,
                                    py: 1.5,
                                    px: 3,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: '#00B2CC' }
                                }}
                            >
                                New Portfolio
                            </Button>
                        </Box>

                        <Grid container spacing={3}>
                            {portfolios.map((p, i) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={p.id}>
                                    <Card
                                        onClick={() => handlePortfolioClick(p.id)}
                                        sx={{
                                            bgcolor: '#0A0A0A',
                                            border: '1px solid #222',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                border: '1px solid #333',
                                                bgcolor: '#111'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF' }}>
                                                        <Folder size={24} />
                                                    </Box>
                                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>{p.name}</Typography>
                                                </Box>
                                                <IconButton size="small" onClick={(e) => handleDeletePortfolio(p.id, e)} sx={{ color: '#333', '&:hover': { color: '#EF4444' } }}>
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ mb: 3 }}>
                                                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL VALUE</Typography>
                                                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{p.total_value.toLocaleString()}</Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Chip
                                                    icon={p.total_gain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                    label={`${p.total_gain >= 0 ? '+' : ''}${p.return_pct}%`}
                                                    sx={{
                                                        bgcolor: p.total_gain >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: p.total_gain >= 0 ? '#10B981' : '#EF4444',
                                                        fontWeight: 700,
                                                        borderRadius: 2
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ color: '#666' }}>
                                                    {p.total_gain >= 0 ? '+' : ''}₹{p.total_gain.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}

                            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: 240,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        border: '2px dashed #222',
                                        borderRadius: 4,
                                        color: '#333',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: '#00E5FF',
                                            color: '#00E5FF',
                                            bgcolor: 'rgba(0, 229, 255, 0.02)'
                                        }
                                    }}
                                >
                                    <FolderPlus size={32} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Create New Portfolio</Typography>
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'detail' && activePortfolio && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        {/* Header Section */}
                        <Box sx={{ mb: 6 }}>
                            <Button
                                onClick={handleBackToList}
                                startIcon={<ArrowLeft size={18} />}
                                sx={{ color: '#666', mb: 3, '&:hover': { color: '#fff' } }}
                            >
                                Back to Portfolios
                            </Button>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>{activePortfolio.name}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                        <Typography variant="h1" sx={{ fontSize: { xs: '3.5rem', md: '5rem' }, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.04em', color: '#fff' }}>
                                            ₹{activePortfolio.total_value.toLocaleString()}
                                        </Typography>

                                        <Chip
                                            icon={<TrendingUp size={20} />}
                                            label={`+₹${activePortfolio.total_gain.toLocaleString()} (${activePortfolio.return_pct}%)`}
                                            sx={{
                                                bgcolor: 'rgba(16, 185, 129, 0.15)',
                                                color: '#10B981',
                                                fontWeight: 700,
                                                height: 40,
                                                px: 1,
                                                borderRadius: 3,
                                                '& .lucide': { color: '#10B981' },
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={20} />}
                                    onClick={() => setIsTxModalOpen(true)}
                                    sx={{
                                        bgcolor: '#fff',
                                        color: '#000',
                                        fontWeight: 700,
                                        py: 2,
                                        px: 4,
                                        borderRadius: 4,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        '&:hover': { bgcolor: '#e0e0e0' }
                                    }}
                                >
                                    Add Transaction
                                </Button>
                            </Box>
                        </Box>

                        <Grid container spacing={6}>
                            {/* Main Content Area */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                {/* View Toggle */}
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0 }}>
                                    <TabButton active={view === 'holdings'} onClick={() => setView('holdings')} label="Holdings" icon={Wallet} />
                                    <TabButton active={view === 'allocation'} onClick={() => setView('allocation')} label="Allocation" icon={PieChartIcon} />
                                </Box>

                                {view === 'holdings' ? (
                                    <motion.div
                                        key={activeId} // Force re-render on portfolio switch
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <TableContainer sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { borderBottom: '1px solid #222', color: '#666', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', py: 2 } }}>
                                                        <TableCell>ASSET</TableCell>
                                                        <TableCell align="right">SHARES</TableCell>
                                                        <TableCell align="right">AVG PRICE</TableCell>
                                                        <TableCell align="right">LTP</TableCell>
                                                        <TableCell align="right">INVESTED</TableCell>
                                                        <TableCell align="right">CURRENT</TableCell>
                                                        <TableCell align="right">RETURN</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {activePortfolio.holdings.map((stock, i) => (
                                                        <TableRow
                                                            key={`${stock.ticker}-${i}`}
                                                            component={motion.tr}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            sx={{
                                                                '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 3, color: '#ddd', fontSize: '1.05rem' },
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', fontWeight: 700, color: '#666' }}>
                                                                        {stock.ticker[0]}
                                                                    </Box>
                                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{stock.ticker}</Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#888' }}>{stock.shares}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.avg_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>₹{stock.current_price.toLocaleString()}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.invested_value.toLocaleString()}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{stock.current_value.toLocaleString()}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                    <Typography variant="body1" sx={{ color: stock.gain >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                                                        {stock.gain >= 0 ? '+' : ''}₹{stock.gain.toLocaleString()}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: stock.gain >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 600 }}>
                                                                        {stock.gain_pct.toFixed(2)}%
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {activePortfolio.holdings.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#666' }}>
                                                                No holdings in {activePortfolio.name}. Click "Add Transaction" to start.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </motion.div>
                                ) : (
                                    <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={allocationData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={100}
                                                    outerRadius={140}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {allocationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                )}
                            </Grid>

                            {/* Sidebar Stats */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box component={motion.div} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                    <Box sx={{ bgcolor: 'transparent', mb: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>PORTFOLIO HEALTH</Typography>
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <StatBar label="Equity Allocation" value={85} color="#00E5FF" />
                                            <StatBar label="Cash Balance" value={15} color="#333" />
                                        </Box>
                                    </Box>
                                    {/* Additional metrics can go here */}
                                    <Box sx={{ borderTop: '1px solid #222', pt: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>KEY METRICS</Typography>
                                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                <Typography variant="caption" sx={{ color: '#888' }}>Total Invested</Typography>
                                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>₹{(activePortfolio.total_invested / 100000).toFixed(2)}L</Typography>
                                            </Box>
                                            <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                <Typography variant="caption" sx={{ color: '#888' }}>Total Gain</Typography>
                                                <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700 }}>+₹{(activePortfolio.total_gain / 100000).toFixed(2)}L</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </motion.div>
                )}

                {/* Add Transaction Modal & Create Portfolio Modal */}
                <AddTransactionModal
                    open={isTxModalOpen}
                    onClose={() => setIsTxModalOpen(false)}
                    onSubmit={handleAddTransaction}
                />

                <CreatePortfolioModal
                    open={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreatePortfolio}
                />
            </Box>
        </>
    );
}

// --- Subcomponents ---

function AddTransactionModal({ open, onClose, onSubmit }: { open: boolean, onClose: () => void, onSubmit: (t: string, s: number, p: number, type: 'BUY' | 'SELL') => void }) {
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), type);
            // Reset
            setTicker('');
            setShares('');
            setPrice('');
            setType('BUY');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#050505',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    p: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                Add Transaction
                <IconButton onClick={onClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {/* Buy/Sell buttons */}
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#111', p: 0.5, borderRadius: 2 }}>
                        {['BUY', 'SELL'].map((t) => (
                            <Button
                                key={t}
                                fullWidth
                                onClick={() => setType(t as any)}
                                sx={{
                                    bgcolor: type === t ? (t === 'BUY' ? '#10B981' : '#EF4444') : 'transparent',
                                    color: type === t ? '#000' : '#666',
                                    fontWeight: 700,
                                    borderRadius: 1.5,
                                    '&:hover': { bgcolor: type === t ? (t === 'BUY' ? '#059669' : '#DC2626') : 'rgba(255,255,255,0.05)' }
                                }}
                            >
                                {t}
                            </Button>
                        ))}
                    </Box>
                    <TextField
                        label="Ticker Symbol"
                        fullWidth
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        placeholder="e.g. RELIANCE"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search size={18} color="#666" /></InputAdornment>,
                            sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } }
                        }}
                        InputLabelProps={{ sx: { color: '#666' } }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Quantity"
                            type="number"
                            fullWidth
                            value={shares}
                            onChange={(e) => setShares(e.target.value)}
                            InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                        <TextField
                            label="Price"
                            type="number"
                            fullWidth
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#666' }}>₹</Typography></InputAdornment>,
                                sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    Confirm Transaction
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function CreatePortfolioModal({ open, onClose, onSubmit }: { open: boolean, onClose: () => void, onSubmit: (name: string) => void }) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (name) {
            onSubmit(name);
            setName('');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#050505',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    p: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                Create New Portfolio
                <IconButton onClick={onClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Portfolio Name"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Retirement Fund, Tech Stocks"
                    InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                    InputLabelProps={{ sx: { color: '#666' } }}
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!name}
                    sx={{
                        bgcolor: '#00E5FF', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#00B2CC' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    Create Portfolio
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function TabButton({ active, onClick, label, icon: Icon }: any) {
    return (
        <Button
            onClick={onClick}
            startIcon={<Icon size={20} />}
            sx={{
                color: active ? '#00E5FF' : '#666',
                borderBottom: active ? '2px solid #00E5FF' : '2px solid transparent',
                borderRadius: 0,
                pb: 2,
                px: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                opacity: active ? 1 : 0.7,
                '&:hover': { color: '#fff', opacity: 1, bgcolor: 'transparent' }
            }}
        >
            {label}
        </Button>
    )
}

function StatBar({ label, value, color }: any) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#aaa', fontWeight: 600 }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{value}%</Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={value}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#111',
                    '& .MuiLinearProgress-bar': { bgcolor: color }
                }}
            />
        </Box>
    )
}

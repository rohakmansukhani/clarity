'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import { Box, Typography, Grid, Button, LinearProgress, Chip, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Menu, ListItemIcon, Divider, Card, CardContent, CardActionArea, Autocomplete, Paper, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, Plus, Wallet, PieChart as PieChartIcon, X, Search, ChevronDown, FolderPlus, Folder, Trash2, ArrowLeft, ArrowRight, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { portfolioService } from '@/services/portfolioService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import PortfolioChart from '@/components/portfolio/PortfolioChart';
import AddTransactionModal from '@/components/portfolio/AddTransactionModal';
import { formatIndianCurrencyDynamic } from '@/utils/currency';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';


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
const SECTOR_COLORS = ['#00E5FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export default function PortfolioPage() {
    // --- State ---
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [view, setView] = useState<'holdings' | 'allocation'>('holdings'); // Detail sub-view
    const [loading, setLoading] = useState(true);

    // Multi-Portfolio State
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

    // ... (rest of state items are unchanged, I will skip them in replacement if possible, but I need to be careful with context)
    // Wait, replace_file_content replaces the whole chunk. I should target specific blocks. 
    // I will restart the tool call strategy to be safer and avoid rewriting huge chunks of state.
    const [activeId, setActiveId] = useState<string>('');

    // Modals & Menus
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [portfolioMenuAnchor, setPortfolioMenuAnchor] = useState<null | HTMLElement>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);

    // --- Simulation Init ---
    // --- Actions ---
    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const data = await portfolioService.listPortfolios();
            // The list endpoint returns basic info. We might need to map it to our UI model.
            // But for the list view, we need total_value etc.
            // Currently backend list endpoint returns just ID/Name.
            // We probably need to fetch performance for ALL portfolios or just the active one?
            // For the "My Portfolios" card view, we show totals.
            // Let's fetch performance for each portfolio in parallel to populate the cards.

            const detailedPortfolios = await Promise.all(data.map(async (p) => {
                try {
                    const perf = await portfolioService.getPortfolioPerformance(p.id);
                    return {
                        id: p.id,
                        name: p.name,
                        ...perf
                    };
                } catch (e) {
                    return {
                        id: p.id,
                        name: p.name,
                        total_value: 0,
                        total_invested: 0,
                        total_gain: 0,
                        return_pct: 0,
                        holdings: []
                    };
                }
            }));

            setPortfolios(detailedPortfolios);
        } catch (error) {
            console.error("Failed to fetch portfolios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const activePortfolio = useMemo(() => portfolios.find(p => p.id === activeId), [portfolios, activeId]);

    const handlePortfolioClick = async (id: string) => {
        setActiveId(id);
        setViewMode('detail');
        // Refresh performance to get latest live prices
        try {
            const perf = await portfolioService.getPortfolioPerformance(id);
            setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...perf } : p));
        } catch (e) {
            console.error("Failed to refresh active portfolio", e);
        }
    };

    const handleBackToList = () => {
        setViewMode('list');
        setActiveId('');
        fetchPortfolios(); // Refresh summaries when going back
    };

    const handleCreatePortfolio = async (name: string) => {
        try {
            await portfolioService.createPortfolio(name);
            await fetchPortfolios();
            setIsCreateModalOpen(false);
        } catch (e) {
            console.error("Create failed", e);
        }
    };

    const handleDeletePortfolio = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPortfolioToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!portfolioToDelete) return;

        try {
            await portfolioService.deletePortfolio(portfolioToDelete);
            setPortfolios(prev => prev.filter(p => p.id !== portfolioToDelete));
            if (activeId === portfolioToDelete) {
                setActiveId('');
                setViewMode('list');
            }
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setDeleteConfirmOpen(false);
            setPortfolioToDelete(null);
        }
    };

    const handleDeleteHolding = async (holdingId: string) => {
        if (!confirm("Are you sure you want to delete this holding?")) return;
        try {
            await portfolioService.deleteHolding(holdingId);
            // Refresh
            if (activeId) {
                const perf = await portfolioService.getPortfolioPerformance(activeId);
                setPortfolios(prev => prev.map(p => p.id === activeId ? { ...p, ...perf } : p));
            }
        } catch (e) {
            console.error("Delete holding failed", e);
        }
    };

    const handleSellHolding = (holdingId: string, holding: any) => {
        // Trigger sell flow - reusing AddTransactionModal with SELL type
        // Wait, AddTransactionModal currently only supports BUY in some parts, but we can adapt it
        // Or for now, simplest is to alert or open the modal pre-filled
        // Let's open the modal pre-filled with ticker and set to SELL mode if we supported it
        alert("Sell flow to be implemented fully. For now, please use 'Add Transaction' to add a negative quantity or SELL type.");
    };

    // ... existing code ...

    // --- At the bottom, fix subcomponents --- (Removed duplicates)

    const handleAddTransaction = async (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL', date?: string) => {
        if (!activeId) return;

        try {
            // ... (Sell logic check) ...
            if (type === 'SELL') {
                alert("Sell transactions not yet fully supported. Please delete the holding or update shares manually.");
                return;
            }

            await portfolioService.addHolding(activeId, {
                ticker,
                shares,
                avg_price: price,
                exchange: "NSE",
                allocation_percent: 0,
                purchase_date: date
            });

            // Refresh data
            const perf = await portfolioService.getPortfolioPerformance(activeId);
            setPortfolios(prev => prev.map(p => p.id === activeId ? { ...p, ...perf } : p));
            setIsTxModalOpen(false);

        } catch (e) {
            console.error("Transaction failed", e);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#0B0B0B' }}>
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
                    bgcolor: '#0B0B0B',
                    minHeight: '100vh',
                    pr: { xs: 2, md: 6 },
                    pl: { xs: 2, md: '140px' }
                }}
            >
                {/* --- LIST VIEW --- */}
                {viewMode === 'list' && (
                    <Box>
                        {/* Back Button */}
                        <Button
                            startIcon={<ArrowLeft size={20} />}
                            onClick={() => router.back()}
                            sx={{
                                color: '#666',
                                mb: 2,
                                pl: 0,
                                '&:hover': { color: '#fff', bgcolor: 'transparent' }
                            }}
                        >
                            Back
                        </Button>
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
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleDeletePortfolio(p.id, e)}
                                                    sx={{
                                                        color: '#333',
                                                        width: 32,
                                                        height: 32,
                                                        flexShrink: 0,
                                                        '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                                                    }}
                                                >
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
                                        <HoldingsTable
                                            portfolio={activePortfolio}
                                            onDelete={handleDeleteHolding}
                                            onSell={handleSellHolding}
                                        />
                                    </motion.div>
                                ) : (
                                    <Box sx={{ height: 400, width: '100%' }}>
                                        <PortfolioChart data={allocationData} />
                                    </Box>
                                )}
                            </Grid>

                            {/* Sidebar Stats */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box component={motion.div} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                    <Box sx={{ bgcolor: 'transparent', mb: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>PORTFOLIO HEALTH</Typography>
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <StatBar label="Equity Allocation" value={activePortfolio.total_value > 0 ? 100 : 0} color="#00E5FF" />
                                        </Box>
                                    </Box>
                                    {/* Additional metrics can go here */}
                                    <Box sx={{ borderTop: '1px solid #222', pt: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>KEY METRICS</Typography>
                                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Tooltip title={activePortfolio.total_invested.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} arrow>
                                                <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                    <Typography variant="caption" sx={{ color: '#888' }}>Total Invested</Typography>
                                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                                                        {formatIndianCurrencyDynamic(activePortfolio.total_invested)}
                                                    </Typography>
                                                </Box>
                                            </Tooltip>
                                            <Tooltip title={activePortfolio.total_gain.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} arrow>
                                                <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                    <Typography variant="caption" sx={{ color: '#888' }}>Total Gain</Typography>
                                                    <Typography variant="h6" sx={{ color: activePortfolio.total_gain >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                                        {activePortfolio.total_gain >= 0 ? '+' : ''}{formatIndianCurrencyDynamic(activePortfolio.total_gain)}
                                                    </Typography>
                                                </Box>
                                            </Tooltip>
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
                    onCreate={handleCreatePortfolio}
                />

                <ConfirmDialog
                    open={deleteConfirmOpen}
                    title="Delete Portfolio"
                    message="Are you sure you want to delete this portfolio? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    confirmColor="error"
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setDeleteConfirmOpen(false);
                        setPortfolioToDelete(null);
                    }}
                />
                <DisclaimerFooter />
            </Box>
        </>
    );
}

// --- Subcomponents ---

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.ElementType;
}

function TabButton({ active, onClick, label, icon: Icon }: TabButtonProps) {
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

interface StatBarProps {
    label: string;
    value: number;
    color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
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

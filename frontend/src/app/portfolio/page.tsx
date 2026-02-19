'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import { Box, Typography, Grid, Button, LinearProgress, Chip, IconButton, CircularProgress, Tooltip, Card, CardContent, TextField } from '@mui/material';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRight, LayoutGrid, List as ListIcon, PieChart as PieChartIcon, Menu, MoreVertical, Bell, Edit2, Check, X, ArrowLeft, Folder, FolderPlus } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { portfolioService } from '@/services/portfolioService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import PortfolioChart from '@/components/portfolio/PortfolioChart';
import AddTransactionModal from '@/components/portfolio/AddTransactionModal';
import { formatIndianCurrencyDynamic } from '@/utils/currency';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';
import SetAlertModal from '@/components/portfolio/SetAlertModal';

// --- Interfaces ---
interface Holding {
    id?: string;
    ticker: string;
    shares: number;
    avg_price: number;
    current_price: number;
    current_value: number;
    invested_value: number;
    gain: number;
    gain_pct: number;
    day_change_pct?: number;
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
    const theme = useTheme();
    const { mode } = useColorMode();

    // Multi-Portfolio State
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    // Modals & Menus
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertTicker, setAlertTicker] = useState<{ ticker: string, price: number } | null>(null);

    // Delete Confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);

    // Rename State
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');

    // --- Actions ---
    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const data = await portfolioService.listPortfolios();

            // Fetch performance for each portfolio in parallel
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
            await fetchPortfolios();
            setIsCreateModalOpen(false);
        } catch (e) {
            console.error("Create failed", e);
        }
    };

    const handleRenamePortfolio = async () => {
        if (!newName.trim() || !activeId) return;
        try {
            await portfolioService.updatePortfolio(activeId, { name: newName });
            setIsRenaming(false);
            await fetchPortfolios(); // Reload to update list
        } catch (error) {
            console.error('Failed to rename', error);
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

    const handleAddTransaction = async (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL', date?: string) => {
        if (!activeId) return;

        try {
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

    const handleAlertClick = (ticker: string, currentPrice: number) => {
        setAlertTicker({ ticker, price: currentPrice });
        setIsAlertModalOpen(true);
    };

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                height: '100vh',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'background.default',
                background: mode === 'dark'
                    ? 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #0B0B0B 70%)'
                    : 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.05) 0%, #FFFFFF 70%)'
            }}>
                <CircularProgress size={24} sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    const allocationData = activePortfolio ? activePortfolio.holdings.map((h, i) => ({
        name: h.ticker,
        value: h.current_value,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length]
    })) : [];

    return (
        <Box sx={{
            bgcolor: 'background.default',
            minHeight: '100vh',
            position: 'relative',
            background: mode === 'dark'
                ? 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #0B0B0B 70%)'
                : 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.05) 0%, #FFFFFF 70%)'
        }}>
            {/* Grid Decoration */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: mode === 'dark'
                        ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
                        : 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
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
                    minHeight: '100vh',
                    pr: { xs: 2, md: 6 },
                    pl: { xs: 2, md: '140px' },
                    position: 'relative',
                    zIndex: 1
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
                                color: 'text.secondary',
                                mb: 2,
                                pl: 0,
                                '&:hover': { color: 'text.primary', bgcolor: 'transparent' }
                            }}
                        >
                            Back
                        </Button>
                        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>My Portfolios</Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary' }}>Select a portfolio to manage holdings and analyze performance.</Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={20} />}
                                onClick={() => setIsCreateModalOpen(true)}
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: '#000',
                                    fontWeight: 700,
                                    py: 1.5,
                                    px: 3,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: 'primary.dark' }
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
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            backgroundImage: 'none',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                borderColor: 'primary.main',
                                                bgcolor: mode === 'dark' ? '#111' : '#fcfcfc'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }}>
                                                        <Folder size={24} />
                                                    </Box>
                                                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>{p.name}</Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleDeletePortfolio(p.id, e)}
                                                    sx={{
                                                        color: 'text.disabled',
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
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL VALUE</Typography>
                                                <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, mt: 0.5 }}>₹{p.total_value.toLocaleString()}</Typography>
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
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                                        border: '2px dashed',
                                        borderColor: 'divider',
                                        borderRadius: 4,
                                        color: 'text.disabled',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            color: 'primary.main',
                                            bgcolor: 'action.hover'
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
                                sx={{ color: 'text.secondary', mb: 3, '&:hover': { color: 'text.primary' } }}
                            >
                                Back to Portfolios
                            </Button>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        {isRenaming ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    size="small"
                                                    autoFocus
                                                    sx={{
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        input: { color: 'text.primary', fontWeight: 700, fontSize: '1.5rem', py: 0.5 }
                                                    }}
                                                />
                                                <IconButton onClick={handleRenamePortfolio} sx={{ color: 'primary.main' }}><Check size={20} /></IconButton>
                                                <IconButton onClick={() => setIsRenaming(false)} sx={{ color: 'text.secondary' }}><X size={20} /></IconButton>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-1px' }}>
                                                    {activePortfolio.name}
                                                </Typography>
                                                <IconButton
                                                    onClick={() => {
                                                        setNewName(activePortfolio.name);
                                                        setIsRenaming(true);
                                                    }}
                                                    size="small"
                                                    sx={{
                                                        color: 'text.disabled',
                                                        opacity: 0.5,
                                                        '&:hover': { opacity: 1, color: 'primary.main' }
                                                    }}
                                                >
                                                    <Edit2 size={16} />
                                                </IconButton>
                                            </Box>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mt: 0.5 }}>
                                        <Typography variant="h1" sx={{ fontSize: { xs: '3.5rem', md: '5rem' }, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'text.primary' }}>
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
                                        '&:hover': { bgcolor: mode === 'dark' ? '#e0e0e0' : 'rgba(0,0,0,0.8)' }
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
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, borderBottom: '1px solid', borderColor: 'divider', pb: 0 }}>
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
                                            onAlert={handleAlertClick}
                                        />
                                    </motion.div>
                                ) : (
                                    <Box sx={{ width: '100%', minHeight: 400 }}>
                                        <PortfolioChart data={allocationData} />
                                    </Box>
                                )}
                            </Grid>

                            {/* Sidebar Stats */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box component={motion.div} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                    <Box sx={{ bgcolor: 'transparent', mb: 4 }}>
                                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}>PORTFOLIO HEALTH</Typography>
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <StatBar label="Equity Allocation" value={activePortfolio.total_value > 0 ? 100 : 0} color="primary.main" />
                                        </Box>
                                    </Box>

                                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 4 }}>
                                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}>KEY METRICS</Typography>
                                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Tooltip title={activePortfolio.total_invested.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} arrow>
                                                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Invested</Typography>
                                                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                                        {formatIndianCurrencyDynamic(activePortfolio.total_invested)}
                                                    </Typography>
                                                </Box>
                                            </Tooltip>
                                            <Tooltip title={activePortfolio.total_gain.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} arrow>
                                                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Gain</Typography>
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

                {/* Add Transaction Modal & Create Portfolio Modal & Alert Modal */}
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

                {alertTicker && (
                    <SetAlertModal
                        open={isAlertModalOpen}
                        onClose={() => setIsAlertModalOpen(false)}
                        ticker={alertTicker.ticker}
                        currentPrice={alertTicker.price}
                        onAlertSet={() => {
                            console.log("Alert Set!");
                        }}
                    />
                )}

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
                <Box sx={{ mt: 8 }}>
                    <DisclaimerFooter />
                </Box>
            </Box>
        </Box>
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
                color: active ? 'primary.main' : 'text.secondary',
                borderBottom: active ? '2px solid' : '2px solid transparent',
                borderColor: active ? 'primary.main' : 'transparent',
                borderRadius: 0,
                pb: 2,
                px: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                opacity: active ? 1 : 0.7,
                '&:hover': { color: 'text.primary', opacity: 1, bgcolor: 'transparent' }
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
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>{value}%</Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={value}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: color }
                }}
            />
        </Box>
    )
}

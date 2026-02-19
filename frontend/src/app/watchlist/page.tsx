'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, IconButton, Button, CircularProgress, Snackbar, Alert, Chip, LinearProgress } from '@mui/material';
import { marketService } from '@/services/marketService';
import { Trash2, ArrowUpRight, ArrowDownRight, Eye, Plus, ArrowLeft, CheckCircle, Tag, Edit2 } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { motion } from 'framer-motion';
import AddToWatchlistModal from '@/components/watchlist/AddToWatchlistModal';

export default function WatchlistPage() {
    const router = useRouter();
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, any>>({});
    const [techSummaries, setTechSummaries] = useState<Record<string, any>>({});
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const theme = useTheme();
    const { mode } = useColorMode();

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const data = await marketService.getWatchlist();
            setWatchlist(data);

            // Fetch live prices and Technical Analysis in parallel
            const priceMap: Record<string, any> = {};
            const techMap: Record<string, any> = {};

            // Batch fetching would be better, but loop for now
            await Promise.all(data.map(async (item: any) => {
                try {
                    // 1. Get Live Price
                    const details = await marketService.getStockDetails(item.ticker);
                    priceMap[item.ticker] = details.market_data;

                    // 2. Get Technical Summary (RSI, Trend)
                    const tech = await marketService.getTechnicalSummary(item.ticker);
                    techMap[item.ticker] = tech;

                } catch (e) {
                    console.error(`Failed to load data for ${item.ticker}`, e);
                }
            }));

            setPrices(priceMap);
            setTechSummaries(techMap);

        } catch (error) {
            console.error("Failed to fetch watchlist", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const handleRemove = async (ticker: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTickerToDelete(ticker);
        setDeleteConfirmOpen(true);
    };

    const confirmRemove = async () => {
        if (!tickerToDelete) return;

        try {
            await marketService.removeFromWatchlist(tickerToDelete);
            setWatchlist(prev => prev.filter(i => i.ticker !== tickerToDelete));
            setToast({ open: true, message: `${tickerToDelete} removed from Buy List`, severity: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ open: true, message: 'Failed to remove from Buy List', severity: 'error' });
        } finally {
            setDeleteConfirmOpen(false);
            setTickerToDelete(null);
        }
    };

    const handleAddToWatchlist = async (ticker: string, options: any) => {
        await marketService.addToWatchlist(ticker, options);
        setToast({ open: true, message: `${ticker} added to Buy List`, severity: 'success' });
        await fetchWatchlist();
    };

    const handleAlreadyBought = async (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        // Logic to move to portfolio?
        // For now, maybe just open a dialog to add to portfolio?
        // Or just show a toast saying "Use 'Add to Portfolio' to track holdings"
        setToast({ open: true, message: 'Use "Add to Portfolio" to track actual holdings.', severity: 'success' });
        // Ideally this opens the AddToPortfolio modal pre-filled
    };

    const getRSIText = (rsi: number) => {
        if (rsi < 30) return { text: 'OVERSOLD', color: '#10B981' }; // Buy signal
        if (rsi > 70) return { text: 'OVERBOUGHT', color: '#EF4444' }; // Sell signal
        return { text: 'NEUTRAL', color: '#888' };
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
                <CircularProgress size={24} sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            bgcolor: 'background.default',
            minHeight: '100vh',
            position: 'relative'
        }}>
            <Sidebar />
            <Box sx={{
                flexGrow: 1,
                p: 4,
                pl: { xs: 4, md: '140px' },
                maxWidth: 1600,
                mx: 'auto',
                position: 'relative',
                zIndex: 1
            }}>
                <Button
                    startIcon={<ArrowLeft size={20} />}
                    onClick={() => router.back()}
                    sx={{ color: 'text.secondary', mb: 2, pl: 0, '&:hover': { color: 'text.primary', bgcolor: 'transparent' } }}
                >
                    Back
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Eye size={32} color={theme.palette.primary.main} />
                            Smart Buy List
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                            Track your research, set entry targets, and monitor RSI levels.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => setIsAddModalOpen(true)}
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
                        Add Stock
                    </Button>
                </Box>

                {watchlist.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 4 }}>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>Your watchlist is empty.</Typography>
                        <Button variant="outlined" onClick={() => router.push('/market')} sx={{ color: 'primary.main', borderColor: 'primary.main' }}>
                            Browse Market
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {watchlist.map((item) => {
                            const marketData = prices[item.ticker] || {};
                            const techData = techSummaries[item.ticker] || {};
                            const change = marketData.change || 0;
                            const currentPrice = marketData.price || 0;
                            const priceFormatted = marketData.price_formatted || 'Loading...';
                            const target = item.target_price || 0;
                            const targetDiff = target > 0 ? ((currentPrice - target) / target) * 100 : 0;
                            const isNearTarget = target > 0 && targetDiff < 5 && targetDiff > -5;
                            const rsi = techData.rsi || 50;
                            const rsiInfo = getRSIText(rsi);

                            return (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.ticker}>
                                    <Card
                                        component={motion.div}
                                        whileHover={{ y: -4, borderColor: isNearTarget ? '#10B981' : theme.palette.primary.main }}
                                        onClick={() => router.push(`/market/${item.ticker}`)}
                                        sx={{
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: isNearTarget ? 'rgba(16, 185, 129, 0.3)' : 'divider',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            backgroundImage: 'none',
                                            position: 'relative',
                                            overflow: 'visible',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>{item.ticker}</Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <Chip label="NSE" size="small" sx={{ bgcolor: 'action.hover', color: 'text.secondary', height: 20, fontSize: '0.65rem' }} />
                                                        {item.tags?.slice(0, 2).map((tag: string) => (
                                                            <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main', height: 20, fontSize: '0.65rem' }} />
                                                        ))}
                                                    </Box>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>{priceFormatted}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: change >= 0 ? '#10B981' : '#EF4444' }}>
                                                        {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                        <Typography variant="caption" sx={{ fontWeight: 700, ml: 0.5 }}>
                                                            {Math.abs(change).toFixed(2)}%
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {/* Target Price Progress */}
                                            {target > 0 && (
                                                <Box sx={{ mb: 2.5, bgcolor: 'action.hover', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current</Typography>
                                                        <Typography variant="caption" sx={{ color: 'primary.main' }}>Target: {target}</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(100, Math.max(0, (currentPrice / (target * 1.2)) * 100))} // Rough visual
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: 'rgba(0,0,0,0.1)',
                                                            '& .MuiLinearProgress-bar': { bgcolor: isNearTarget ? '#10B981' : 'primary.main' }
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: isNearTarget ? '#10B981' : 'text.secondary', textAlign: 'right', fontWeight: isNearTarget ? 700 : 400 }}>
                                                        {currentPrice <= target ? "TARGET REACHED!" : `${((currentPrice - target)).toFixed(1)} pts to target`}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Notes Area */}
                                            {item.notes && (
                                                <Box sx={{ mb: 3, flexGrow: 1 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        THESIS
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.9rem', lineHeight: 1.4, bgcolor: 'action.hover', p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                                                        "{item.notes}"
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Footer: RSI & Actions */}
                                            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>RSI (14D)</Typography>
                                                    <Typography variant="body2" sx={{ color: rsiInfo.color, fontWeight: 700 }}>
                                                        {Math.round(rsi)} <span style={{ fontSize: '0.7em', opacity: 0.8 }}>{rsiInfo.text}</span>
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        onClick={(e) => handleAlreadyBought(item, e)}
                                                        startIcon={<CheckCircle size={14} />}
                                                        sx={{ color: '#10B981', bgcolor: 'rgba(16, 185, 129, 0.1)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' } }}
                                                    >
                                                        Bought
                                                    </Button>
                                                    <IconButton
                                                        onClick={(e) => handleRemove(item.ticker, e)}
                                                        size="small"
                                                        sx={{ color: 'text.disabled', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Remove from Buy List"
                message={`Are you sure you want to remove ${tickerToDelete} from your Buy List?`}
                confirmText="Remove"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={confirmRemove}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setTickerToDelete(null);
                }}
            />

            <AddToWatchlistModal
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddToWatchlist}
            />

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ bgcolor: toast.severity === 'success' ? '#10B981' : '#EF4444', color: '#000', fontWeight: 600 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

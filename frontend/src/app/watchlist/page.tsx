'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, IconButton, Button, CircularProgress } from '@mui/material';
import { marketService } from '@/services/marketService';
import { Trash2, TrendingUp, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { motion } from 'framer-motion';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function WatchlistPage() {
    const router = useRouter();
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, any>>({});
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const data = await marketService.getWatchlist();
            setWatchlist(data);

            // Fetch live prices for watched items
            // We can do this in parallel or use a bulk endpoint if available.
            // For now, loop (limited scale).
            const priceMap: Record<string, any> = {};
            await Promise.all(data.map(async (item: any) => {
                try {
                    const details = await marketService.getStockDetails(item.ticker);
                    priceMap[item.ticker] = details.market_data;
                } catch (e) {
                    console.error(`Failed to load price for ${item.ticker}`, e);
                }
            }));
            setPrices(priceMap);

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
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteConfirmOpen(false);
            setTickerToDelete(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#000' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', bgcolor: '#000', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, p: 4, pl: { xs: 4, md: '140px' }, maxWidth: 1600, mx: 'auto' }}>
                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Eye size={32} color="#00E5FF" />
                    My Buy List
                </Typography>

                {watchlist.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center', border: '1px dashed #333', borderRadius: 4 }}>
                        <Typography sx={{ color: '#666', mb: 2 }}>Your watchlist is empty.</Typography>
                        <Button variant="outlined" onClick={() => router.push('/market')} sx={{ color: '#00E5FF', borderColor: '#00E5FF' }}>
                            Browse Market
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {watchlist.map((item) => {
                            const marketData = prices[item.ticker] || {};
                            const change = marketData.change || 0;
                            const price = marketData.price_formatted || 'Loading...';

                            return (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.ticker}>
                                    <Card
                                        component={motion.div}
                                        whileHover={{ y: -4, borderColor: '#444' }}
                                        onClick={() => router.push(`/market/${item.ticker}`)}
                                        sx={{
                                            bgcolor: '#0A0A0A',
                                            border: '1px solid #222',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            position: 'relative',
                                            overflow: 'visible'
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                                <Box>
                                                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{item.ticker}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#666' }}>NSE</Typography>
                                                </Box>
                                                <IconButton
                                                    onClick={(e) => handleRemove(item.ticker, e)}
                                                    sx={{ color: '#333', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                                                >
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
                                                    {price}
                                                </Typography>

                                                {marketData.price && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', color: change >= 0 ? '#10B981' : '#EF4444', bgcolor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', px: 1, py: 0.5, borderRadius: 2 }}>
                                                        {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 0.5 }}>
                                                            {Math.abs(change).toFixed(2)}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Target Prices & Notes */}
                                            {(item.target_buy_price || item.target_sell_price || item.notes) && (
                                                <Box sx={{ pt: 2, borderTop: '1px solid #222' }}>
                                                    {item.target_buy_price && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                                                                Buy Target:
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>
                                                                ₹{item.target_buy_price.toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {item.target_sell_price && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 600 }}>
                                                                Sell Target:
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#EF4444' }}>
                                                                ₹{item.target_sell_price.toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {item.notes && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: '#666',
                                                                fontStyle: 'italic',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                mt: 1
                                                            }}
                                                        >
                                                            "{item.notes}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
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
                title="Remove from Watchlist"
                message={`Are you sure you want to remove ${tickerToDelete} from your watchlist?`}
                confirmText="Remove"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={confirmRemove}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setTickerToDelete(null);
                }}
            />
        </Box>
    );
}

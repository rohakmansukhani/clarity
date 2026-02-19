'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip } from '@mui/material';
import { X } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { marketService } from '@/services/marketService';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

interface AddTransactionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL', date?: string) => void;
    initialTicker?: string;
}

export default function AddTransactionModal({ open, onClose, onSubmit, initialTicker }: AddTransactionModalProps) {
    const [mode, setMode] = useState<'PRESENT' | 'HISTORICAL'>('PRESENT');
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [priceError, setPriceError] = useState('');

    useEffect(() => {
        if (open && initialTicker) {
            setTicker(initialTicker);
        } else if (open && !initialTicker) {
            setTicker('');
        }
    }, [open, initialTicker]);

    // Auto-fetch price logic
    useEffect(() => {
        const fetchPrice = async () => {
            if (!ticker || ticker.length < 2) {
                if (mode === 'PRESENT') setPrice('');
                setPriceError('');
                return;
            }

            setFetchingPrice(true);
            setPriceError('');

            try {
                let fetchedPrice = 0;
                if (mode === 'PRESENT') {
                    const data = await marketService.getStockDetails(ticker.toUpperCase());
                    fetchedPrice = data.market_data?.price || data.price || data.current_price || 0;
                } else if (mode === 'HISTORICAL' && date) {
                    const dateStr = date.toISOString().split('T')[0];
                    try {
                        if (marketService.getPriceAtDate) {
                            fetchedPrice = await marketService.getPriceAtDate(ticker.toUpperCase(), dateStr);
                        }
                    } catch (e) {
                        console.warn("Historical price fetch failed", e);
                    }
                }

                if (fetchedPrice > 0) {
                    setPrice(fetchedPrice.toString());
                } else {
                    if (mode === 'PRESENT') {
                        setPrice('');
                        setPriceError('Price unavailable');
                    } else {
                        if (!price) setPrice('');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch price:', error);
                if (mode === 'PRESENT') {
                    setPriceError('Stock not found');
                }
            } finally {
                setFetchingPrice(false);
            }
        };

        const timer = setTimeout(fetchPrice, 500);
        return () => clearTimeout(timer);
    }, [ticker, mode, date]);

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            const txDate = mode === 'HISTORICAL' && date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), 'BUY', txDate);
            handleClose();
        }
    };

    const handleClose = () => {
        if (!initialTicker) setTicker('');
        setShares('');
        setPrice('');
        setDate(undefined);
        setMode('PRESENT');
        setPriceError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#050505',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 450,
                    p: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                {initialTicker ? `Add ${initialTicker}` : 'Add Transaction'}
                <IconButton onClick={handleClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

                    {/* Toggle Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#111', p: 0.5, borderRadius: 2 }}>
                        {['PRESENT', 'HISTORICAL'].map((m) => (
                            <Button
                                key={m}
                                fullWidth
                                onClick={() => {
                                    setMode(m as any);
                                    setPrice('');
                                    setPriceError('');
                                }}
                                sx={{
                                    bgcolor: mode === m ? '#00E5FF' : 'transparent',
                                    color: mode === m ? '#000' : '#666',
                                    fontWeight: 700,
                                    borderRadius: 1.5,
                                    '&:hover': {
                                        bgcolor: mode === m ? '#00B8CC' : 'rgba(255,255,255,0.05)'
                                    }
                                }}
                            >
                                {m}
                            </Button>
                        ))}
                    </Box>

                    {/* Stock Search via Reusable Component - Hide if initialTicker is set */}
                    {!initialTicker ? (
                        <StockSearchInput
                            value={ticker}
                            onChange={(val: string) => setTicker(val.toUpperCase())}
                            onSelect={(item: any) => setTicker(item.symbol)}
                            placeholder="Search stocks..."
                            variant="standard"
                        />
                    ) : (
                        <TextField
                            label="Asset"
                            value={ticker}
                            disabled
                            fullWidth
                            InputProps={{
                                sx: {
                                    color: '#fff',
                                    bgcolor: '#111',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#333' }
                                }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                    )}

                    {priceError && (
                        <ErrorBanner error={priceError} onRetry={() => setTicker(ticker)} />
                    )}

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
                    </Box>

                    {mode === 'HISTORICAL' && (
                        <Box>
                            <Typography sx={{ color: '#666', fontSize: '0.8rem', mb: 1, ml: 1 }}>Purchase Date</Typography>
                            <CustomDatePicker
                                value={date ? date.toISOString().split('T')[0] : ''}
                                onChange={(d) => setDate(d ? new Date(d) : undefined)}
                                label="Select purchase date"
                            />
                        </Box>
                    )}

                    <TextField
                        label={mode === 'PRESENT' ? "Current Price" : "Buy Price"}
                        type="number"
                        fullWidth
                        value={price}
                        disabled={mode === 'PRESENT' && !priceError}
                        onChange={(e) => setPrice(e.target.value)}
                        InputProps={{
                            sx: {
                                color: '#00E5FF',
                                bgcolor: '#0A0A0A',
                                borderRadius: 2,
                                '& fieldset': { borderColor: '#333' },
                                fontWeight: 700
                            },
                            startAdornment: <Typography sx={{ color: '#00E5FF', mr: 1 }}>₹</Typography>
                        }}
                        InputLabelProps={{ sx: { color: '#666' } }}
                        helperText={fetchingPrice ? "Fetching..." : (mode === 'PRESENT' ? "Auto-updates with market" : "Enter manually or select date")}
                        FormHelperTextProps={{ sx: { color: '#666', fontSize: '0.7rem' } }}
                    />

                    {price && shares && (
                        <Box sx={{ p: 2, bgcolor: 'rgba(0, 229, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                            <Typography variant="caption" sx={{ color: '#888' }}>Total Investment</Typography>
                            <Typography variant="h5" sx={{ color: '#00E5FF', fontWeight: 700 }}>
                                ₹{(Number(price) * Number(shares)).toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0 || (fetchingPrice && mode === 'PRESENT') || (mode === 'HISTORICAL' && !date && !price)}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' }
                    }}
                >
                    {fetchingPrice && mode === 'PRESENT' ? 'Fetching Price...' : 'Confirm Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

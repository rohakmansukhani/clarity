import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { marketService } from '@/services/marketService';

interface AddTransactionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL') => void;
    initialTicker?: string;
}

export default function AddTransactionModal({ open, onClose, onSubmit, initialTicker }: AddTransactionModalProps) {
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [priceError, setPriceError] = useState('');

    useEffect(() => {
        if (open && initialTicker) {
            setTicker(initialTicker);
        } else if (open && !initialTicker) {
            setTicker('');
        }
    }, [open, initialTicker]);

    // Auto-fetch price when ticker changes
    useEffect(() => {
        const fetchPrice = async () => {
            if (!ticker || ticker.length < 2) {
                setPrice('');
                setPriceError('');
                return;
            }

            setFetchingPrice(true);
            setPriceError('');

            try {
                const data = await marketService.getStockDetails(ticker.toUpperCase());
                const currentPrice = data.market_data?.price || data.price || data.current_price || 0;

                if (currentPrice > 0) {
                    setPrice(currentPrice.toString());
                    setPriceError('');
                } else {
                    setPrice('');
                    setPriceError('Price unavailable');
                }
            } catch (error) {
                console.error('Failed to fetch price:', error);
                setPrice('');
                setPriceError('Stock not found');
            } finally {
                setFetchingPrice(false);
            }
        };

        const timer = setTimeout(fetchPrice, 500);
        return () => clearTimeout(timer);
    }, [ticker]);

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), type);
            // Reset
            if (!initialTicker) setTicker('');
            setShares('');
            setPrice('');
            setType('BUY');
            setPriceError('');
        }
    };

    const handleClose = () => {
        if (!initialTicker) setTicker('');
        setShares('');
        setPrice('');
        setType('BUY');
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
                    minWidth: 400,
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
                    {/* Buy/Sell buttons */}
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#111', p: 0.5, borderRadius: 2 }}>
                        {['BUY', 'SELL'].map((t) => (
                            <Tooltip
                                key={t}
                                title={t === 'SELL' ? 'Short selling coming soon' : ''}
                                arrow
                                placement="top"
                            >
                                <span style={{ flex: 1 }}>
                                    <Button
                                        fullWidth
                                        onClick={() => setType(t as any)}
                                        disabled={t === 'SELL'}
                                        sx={{
                                            bgcolor: type === t ? (t === 'BUY' ? '#10B981' : '#EF4444') : 'transparent',
                                            color: type === t ? '#000' : t === 'SELL' ? '#444' : '#666',
                                            fontWeight: 700,
                                            borderRadius: 1.5,
                                            cursor: t === 'SELL' ? 'not-allowed' : 'pointer',
                                            opacity: t === 'SELL' ? 0.4 : 1,
                                            '&:hover': {
                                                bgcolor: t === 'SELL' ? 'transparent' : (type === t ? (t === 'BUY' ? '#059669' : '#DC2626') : 'rgba(255,255,255,0.05)')
                                            },
                                            '&.Mui-disabled': {
                                                color: '#444',
                                                bgcolor: 'transparent'
                                            }
                                        }}
                                    >
                                        {t}
                                    </Button>
                                </span>
                            </Tooltip>
                        ))}
                    </Box>

                    {/* Stock Search via Reusable Component - Hide if initialTicker is set */}
                    {!initialTicker ? (
                        <StockSearchInput
                            value={ticker}
                            onChange={(val: string) => setTicker(val.toUpperCase())}
                            onSelect={(item: any) => {
                                setTicker(item.symbol);
                            }}
                            placeholder="Search stocks (e.g. RELIANCE, TCS)"
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
                            placeholder="Number of shares"
                            InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                        <TextField
                            label="Current Price"
                            type="text"
                            fullWidth
                            value={fetchingPrice ? 'Fetching...' : price ? `₹${Number(price).toLocaleString()}` : ''}
                            disabled
                            InputProps={{
                                sx: {
                                    color: '#00E5FF',
                                    bgcolor: '#0A0A0A',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#333' },
                                    fontWeight: 700
                                }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                            helperText="Auto-fetched from market"
                            FormHelperTextProps={{ sx: { color: '#666', fontSize: '0.7rem' } }}
                        />
                    </Box>

                    {price && shares && (
                        <Box sx={{ p: 2, bgcolor: 'rgba(0, 229, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                            <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
                                Total Investment
                            </Typography>
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
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0 || fetchingPrice || !!priceError}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    {fetchingPrice ? 'Fetching Price...' : 'Confirm Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

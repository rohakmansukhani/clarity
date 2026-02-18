import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Switch, FormControlLabel } from '@mui/material';
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
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [priceError, setPriceError] = useState('');

    useEffect(() => {
        if (open && initialTicker) {
            setTicker(initialTicker);
        } else if (open && !initialTicker) {
            setTicker('');
        }
    }, [open, initialTicker]);

    // Auto-fetch price when ticker changes or when switching back to auto mode
    useEffect(() => {
        const fetchPrice = async () => {
            if (!ticker || ticker.length < 2) {
                if (!useCustomPrice) setPrice('');
                setPriceError('');
                return;
            }

            // If using custom price, don't overwrite user input unless it's empty? 
            // Actually, if custom is on, we shouldn't auto-fetch to overwrite.
            if (useCustomPrice) return;

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
    }, [ticker, useCustomPrice]);

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), 'BUY');
            // Reset
            if (!initialTicker) setTicker('');
            setShares('');
            setPrice('');
            setUseCustomPrice(false);
            setPriceError('');
        }
    };

    const handleClose = () => {
        if (!initialTicker) setTicker('');
        setShares('');
        setPrice('');
        setUseCustomPrice(false);
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
                    </Box>

                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={useCustomPrice}
                                        onChange={(e) => setUseCustomPrice(e.target.checked)}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#00E5FF' },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00E5FF' },
                                        }}
                                    />
                                }
                                label={<Typography sx={{ color: '#666', fontSize: '0.9rem' }}>Add older purchase at specific price</Typography>}
                            />
                        </Box>

                        <TextField
                            label={useCustomPrice ? "Buy Price (Historical)" : "Market Price (Live)"}
                            type="number"
                            fullWidth
                            value={price} // Display raw price for editing
                            disabled={!useCustomPrice}
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
                            helperText={useCustomPrice ? "Enter the price you bought this share at" : (fetchingPrice ? "Fetching..." : "Auto-fetched from market")}
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
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0 || (fetchingPrice && !useCustomPrice) || (!useCustomPrice && !!priceError)}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    {fetchingPrice && !useCustomPrice ? 'Fetching Price...' : 'Confirm Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

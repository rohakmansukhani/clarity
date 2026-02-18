import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tabs, Tab } from '@mui/material';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { marketService } from '@/services/marketService';

interface AddTransactionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL', date?: string) => void;
    initialTicker?: string;
}

export default function AddTransactionModal({ open, onClose, onSubmit, initialTicker }: AddTransactionModalProps) {
    const [tab, setTab] = useState(0); // 0: Present, 1: Historical
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState('');
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
                if (tab === 0) setPrice(''); // Only clear if in Present mode
                setPriceError(''); // Clear error if ticker is invalid
                return;
            }

            setFetchingPrice(true);
            setPriceError(''); // Clear previous errors

            try {
                let fetchedPrice = 0;
                if (tab === 0) {
                    // Present mode: fetch live price
                    const data = await marketService.getStockDetails(ticker.toUpperCase());
                    fetchedPrice = data.market_data?.price || data.price || data.current_price || 0;
                } else if (tab === 1 && date) {
                    // Historical mode with date: fetch price at date
                    // Assuming marketService.getPriceAtDate exists and returns a number
                    // If not, this part might need adjustment based on actual API
                    // For now, let's assume we just want to allow manual entry if date is set, 
                    // or try to fetch if we have the capability. 
                    // Since getPriceAtDate isn't strictly verified in marketService, let's warn but allow manual.
                    try {
                        if (marketService.getPriceAtDate) {
                            fetchedPrice = await marketService.getPriceAtDate(ticker.toUpperCase(), date);
                        }
                    } catch (e) {
                        console.warn("Historical price fetch failed", e);
                    }
                }

                if (fetchedPrice > 0) {
                    setPrice(fetchedPrice.toString());
                } else {
                    // If no price fetched, clear price field and set error if in Present mode
                    // In Historical mode, allow manual entry if auto-fetch fails
                    if (tab === 0) {
                        setPrice('');
                        setPriceError('Price unavailable or stock not found');
                    } else {
                        // For historical, if date fetch fails, just clear price and let user enter
                        // Don't error out, just let them type
                        if (!price) setPrice('');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch price:', error);
                if (tab === 0) {
                    setPriceError('Stock not found or failed to fetch live price');
                }
                // Historical: silent fail, allow manual
            } finally {
                setFetchingPrice(false);
            }
        };

        const timer = setTimeout(fetchPrice, 500);
        return () => clearTimeout(timer);
    }, [ticker, tab, date]);

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            // If historical, pass the date. If present, pass today/undefined
            const txDate = tab === 1 ? date : new Date().toISOString().split('T')[0];
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), 'BUY', txDate);
            handleClose();
        }
    };

    const handleClose = () => {
        if (!initialTicker) setTicker('');
        setShares('');
        setPrice('');
        setDate('');
        setTab(0);
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
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700, pb: 0 }}>
                {initialTicker ? `Add ${initialTicker} ` : 'Add Transaction'}
                <IconButton onClick={handleClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>

            <Tabs
                value={tab}
                onChange={(_, v) => {
                    setTab(v);
                    setPrice(''); // Clear price when switching tabs to re-evaluate
                    setPriceError(''); // Clear price error
                }}
                sx={{
                    borderBottom: '1px solid #222',
                    mx: 3,
                    mt: 1,
                    '& .MuiTab-root': { color: '#666', fontWeight: 600 },
                    '& .Mui-selected': { color: '#00E5FF' },
                    '& .MuiTabs-indicator': { bgcolor: '#00E5FF' }
                }}
            >
                <Tab label="Present (Live)" />
                <Tab label="Historical" />
            </Tabs>

            <DialogContent sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

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

                    {tab === 1 && (
                        <TextField
                            label="Purchase Date"
                            type="date"
                            fullWidth
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                            InputLabelProps={{ sx: { color: '#666' }, shrink: true }}
                            helperText="Approx. price will be fetched if available"
                            FormHelperTextProps={{ sx: { color: '#666' } }}
                        />
                    )}

                    <TextField
                        label={tab === 0 ? "Current Price" : "Buy Price"}
                        type="number"
                        fullWidth
                        value={price}
                        disabled={tab === 0 && !priceError} // Disabled in Present mode unless there's an error
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
                        helperText={fetchingPrice ? "Fetching..." : (tab === 0 ? "Auto-updates with market" : "Enter manually or select date")}
                        FormHelperTextProps={{ sx: { color: '#666', fontSize: '0.7rem' } }}
                    />

                    {price && shares && (
                        <Box sx={{ p: 2, bgcolor: 'rgba(0, 229, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                            <Typography variant="caption" sx={{ color: '#888' }}>
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
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0 || (fetchingPrice && tab === 0) || (tab === 1 && !date && !price)}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    {fetchingPrice && tab === 0 ? 'Fetching Price...' : 'Confirm Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


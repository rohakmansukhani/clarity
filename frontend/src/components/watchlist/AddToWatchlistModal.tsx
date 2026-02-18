'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
} from '@mui/material';
import { Eye } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';

interface AddToWatchlistModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: (ticker: string, options: { target_buy_price?: number; target_sell_price?: number; notes?: string }) => Promise<void>;
    initialTicker?: string;
}

export default function AddToWatchlistModal({ open, onClose, onAdd, initialTicker = '' }: AddToWatchlistModalProps) {
    const [ticker, setTicker] = useState(initialTicker);
    const [buyTarget, setBuyTarget] = useState('');
    const [sellTarget, setSellTarget] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleClose = () => {
        setTicker(initialTicker);
        setBuyTarget('');
        setSellTarget('');
        setNotes('');
        onClose();
    };

    const handleSubmit = async () => {
        if (!ticker.trim()) return;
        setIsLoading(true);
        try {
            await onAdd(ticker, {
                target_buy_price: buyTarget ? parseFloat(buyTarget) : undefined,
                target_sell_price: sellTarget ? parseFloat(sellTarget) : undefined,
                notes: notes || undefined,
            });
            handleClose();
        } catch (e) {
            console.error('Failed to add to watchlist:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: '#333' },
            '&:hover fieldset': { borderColor: '#555' },
            '&.Mui-focused fieldset': { borderColor: '#00E5FF' },
        },
        '& .MuiInputLabel-root': { color: '#666' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#00E5FF' },
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0B0B0B',
                    border: '1px solid #333',
                    borderRadius: 4,
                    minWidth: { xs: '90%', sm: 500 },
                    p: 1,
                    backgroundImage: 'none',
                }
            }}
        >
            <DialogTitle sx={{ color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Eye size={20} color="#00E5FF" />
                Add to Buy List
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {!initialTicker && (
                        <Box>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                                STOCK
                            </Typography>
                            <StockSearchInput
                                value={ticker}
                                onChange={setTicker}
                                onSelect={(item) => setTicker(item.symbol)}
                                placeholder="Search symbol (e.g. RELIANCE)..."
                            />
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Target Buy Price (₹)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={buyTarget}
                            onChange={(e) => setBuyTarget(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                        <TextField
                            label="Target Sell Price (₹)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={sellTarget}
                            onChange={(e) => setSellTarget(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Box>

                    <TextField
                        label="Notes (strategy, thesis...)"
                        multiline
                        rows={3}
                        fullWidth
                        variant="outlined"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={fieldSx}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={isLoading}
                    sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!ticker.trim() || isLoading}
                    variant="contained"
                    sx={{
                        bgcolor: '#00E5FF',
                        color: '#000',
                        fontWeight: 700,
                        px: 3,
                        '&:hover': { bgcolor: '#00B2CC' },
                        '&.Mui-disabled': { bgcolor: 'rgba(0, 229, 255, 0.2)', color: 'rgba(0,0,0,0.4)' },
                    }}
                >
                    {isLoading ? 'Adding...' : 'Add to Buy List'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

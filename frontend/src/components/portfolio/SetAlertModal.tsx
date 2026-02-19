'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, ToggleButton, ToggleButtonGroup, InputAdornment } from '@mui/material';
import { X, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { portfolioService } from '@/services/portfolioService';

interface SetAlertModalProps {
    open: boolean;
    onClose: () => void;
    ticker: string;
    currentPrice: number;
    onAlertSet?: () => void;
}

export default function SetAlertModal({ open, onClose, ticker, currentPrice, onAlertSet }: SetAlertModalProps) {
    const [mode, setMode] = useState<'PRICE' | 'PERCENT'>('PRICE');
    const [targetPrice, setTargetPrice] = useState<string>('');
    const [percent, setPercent] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let condition = '';
            let payload: any = { ticker, initial_price: currentPrice, condition: '' };

            if (mode === 'PRICE') {
                const price = parseFloat(targetPrice);
                if (!price) return;
                condition = price > currentPrice ? 'ABOVE' : 'BELOW';
                payload = { ...payload, target_price: price, condition };
            } else {
                const pct = parseFloat(percent);
                if (!pct) return;
                condition = pct > 0 ? 'GAIN_PCT' : 'LOSS_PCT';
                payload = { ...payload, target_percent_change: pct, condition };
            }

            await portfolioService.createAlert(payload);
            if (onAlertSet) onAlertSet();
            onClose();
        } catch (error) {
            console.error("Failed to set alert", error);
        } finally {
            setLoading(false);
            setTargetPrice('');
            setPercent('');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0B0B0B',
                    border: '1px solid #222',
                    borderRadius: 3,
                    minWidth: 400,
                    p: 1
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Bell size={20} color="#00E5FF" />
                    Set Alert for {ticker}
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Typography variant="body2" sx={{ color: '#888' }}>
                        Current Price: <span style={{ color: '#fff', fontWeight: 700 }}>₹{currentPrice.toLocaleString()}</span>
                    </Typography>

                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(_, v) => v && setMode(v)}
                        fullWidth
                        sx={{ bgcolor: '#111', borderRadius: 2 }}
                    >
                        <ToggleButton value="PRICE" sx={{ color: '#666', '&.Mui-selected': { color: '#00E5FF', bgcolor: 'rgba(0,229,255,0.1)' }, fontWeight: 600 }}>
                            Target Price
                        </ToggleButton>
                        <ToggleButton value="PERCENT" sx={{ color: '#666', '&.Mui-selected': { color: '#00E5FF', bgcolor: 'rgba(0,229,255,0.1)' }, fontWeight: 600 }}>
                            % Change
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'PRICE' ? (
                        <TextField
                            label="Target Price"
                            type="number"
                            fullWidth
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#666' }}>₹</Typography></InputAdornment>,
                                sx: {
                                    color: '#fff',
                                    bgcolor: '#111',
                                    borderRadius: 2,
                                    height: 56, // Explicit height
                                    alignItems: 'center',
                                    '& .MuiInputBase-input': {
                                        height: '100%',
                                        boxSizing: 'border-box',
                                        py: 0
                                    },
                                    '& fieldset': { borderColor: '#333' }
                                }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                    ) : (
                        <TextField
                            label="Percentage Change"
                            type="number"
                            fullWidth
                            placeholder="e.g. 10 for +10%"
                            value={percent}
                            onChange={(e) => setPercent(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography sx={{ color: '#666' }}>%</Typography></InputAdornment>,
                                sx: {
                                    color: '#fff',
                                    bgcolor: '#111',
                                    borderRadius: 2,
                                    height: 56,
                                    alignItems: 'center',
                                    '& .MuiInputBase-input': {
                                        height: '100%',
                                        boxSizing: 'border-box',
                                        py: 0
                                    },
                                    '& fieldset': { borderColor: '#333' }
                                }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                            helperText="Enter positive for gain, negative for loss"
                            FormHelperTextProps={{ sx: { color: '#666' } }}
                        />
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || (mode === 'PRICE' && !targetPrice) || (mode === 'PERCENT' && !percent)}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 2,
                        '&:hover': { bgcolor: '#e0e0e0' }
                    }}
                >
                    {loading ? 'Setting Alert...' : 'Create Alert'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

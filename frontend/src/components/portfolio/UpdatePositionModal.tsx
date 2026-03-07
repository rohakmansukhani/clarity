'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

interface UpdatePositionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (holdingId: string, shares: number, avgPrice: number) => void;
    holding: {
        id: string;
        ticker: string;
        shares: number;
        avg_price: number;
    } | null;
}

export default function UpdatePositionModal({ open, onClose, onSubmit, holding }: UpdatePositionModalProps) {
    const theme = useTheme();
    const [shares, setShares] = useState('');
    const [avgPrice, setAvgPrice] = useState('');

    useEffect(() => {
        if (holding) {
            setShares(holding.shares.toString());
            setAvgPrice(holding.avg_price.toString());
        }
    }, [holding, open]);

    const handleSubmit = () => {
        if (holding && shares && avgPrice && Number(shares) >= 0 && Number(avgPrice) >= 0) {
            onSubmit(holding.id, Number(shares), Number(avgPrice));
            onClose();
        }
    };

    if (!holding) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    backgroundImage: 'none',
                    boxShadow: theme.shadows[16]
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                Update {holding.ticker} Position
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Manually override the total shares and average purchase price for this holding.
                    </Typography>

                    <TextField
                        label="Total Shares"
                        type="number"
                        fullWidth
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        InputProps={{
                            sx: {
                                color: 'text.primary',
                                bgcolor: 'background.default',
                                borderRadius: 2,
                                '& fieldset': { borderColor: 'divider' }
                            }
                        }}
                        InputLabelProps={{ sx: { color: 'text.secondary' } }}
                    />

                    <TextField
                        label="Average Purchase Price"
                        type="number"
                        fullWidth
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                        InputProps={{
                            sx: {
                                color: 'primary.main',
                                bgcolor: 'background.default',
                                borderRadius: 2,
                                '& fieldset': { borderColor: 'divider' },
                                fontWeight: 700
                            },
                            startAdornment: <Typography sx={{ color: 'primary.main', mr: 1 }}>₹</Typography>
                        }}
                        InputLabelProps={{ sx: { color: 'text.secondary' } }}
                    />

                    {shares && avgPrice && (
                        <Box sx={{
                            p: 2,
                            bgcolor: (theme) => `${theme.palette.primary.main}10`,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: (theme) => `${theme.palette.primary.main}30`
                        }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Investment Value</Typography>
                            <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                ₹{(Number(avgPrice) * Number(shares)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    disabled={!shares || !avgPrice || Number(shares) < 0 || Number(avgPrice) < 0}
                    sx={{
                        bgcolor: 'text.primary',
                        color: 'background.paper',
                        fontWeight: 700,
                        py: 1.5,
                        borderRadius: 3,
                        '&:hover': {
                            bgcolor: 'text.secondary'
                        }
                    }}
                >
                    Update Position
                </Button>
            </DialogActions>
        </Dialog>
    );
}

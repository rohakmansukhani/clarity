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
    Chip
} from '@mui/material';
import { Wallet, TrendingUp } from 'lucide-react';

interface CreatePortfolioModalProps {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    allocations?: any[];
    totalBudget?: number;
    isLoading?: boolean;
}

export default function CreatePortfolioModal({
    open,
    onClose,
    onCreate,
    allocations = [],
    totalBudget = 0,
    isLoading = false
}: CreatePortfolioModalProps) {
    const [name, setName] = useState('');

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (name.trim()) {
            onCreate(name);
            setName('');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    minWidth: { xs: '90%', sm: 400 },
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Wallet size={20} color="#00E5FF" />
                    Create Portfolio
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            {totalBudget > 0 && (
                                <Chip
                                    icon={<Wallet size={14} color="#000" />}
                                    label={`Budget: ₹${totalBudget.toLocaleString('en-IN')}`}
                                    sx={{ bgcolor: '#00E5FF', color: '#000', fontWeight: 600 }}
                                />
                            )}
                            {allocations.length > 0 && (
                                <Chip
                                    icon={<TrendingUp size={14} />}
                                    label={`${allocations.length} Stocks`}
                                    sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            )}
                        </Box>

                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                            Give your new portfolio a name to save it to your dashboard.
                        </Typography>

                        <TextField
                            autoFocus
                            fullWidth
                            placeholder="e.g., Aggressive Growth Fund"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: '#00E5FF' }
                                }
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button
                        onClick={onClose}
                        sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!name.trim() || isLoading}
                        sx={{
                            bgcolor: '#00E5FF',
                            color: '#000',
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#00B2CC' },
                            '&.Mui-disabled': { bgcolor: 'rgba(0, 229, 255, 0.2)' }
                        }}
                    >
                        {isLoading ? 'Creating...' : 'Create Portfolio'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

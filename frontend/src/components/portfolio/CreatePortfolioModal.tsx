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
    Chip,
    useTheme
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
    const theme = useTheme();

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
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    minWidth: { xs: '90%', sm: 400 },
                    boxShadow: theme.shadows[16],
                    backgroundImage: 'none'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                    <Wallet size={20} color={theme.palette.primary.main} />
                    Create Portfolio
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                            {totalBudget > 0 && (
                                <Chip
                                    icon={<Wallet size={14} color={theme.palette.primary.contrastText} />}
                                    label={`Budget: ₹${totalBudget.toLocaleString('en-IN')}`}
                                    sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600, height: 28 }}
                                />
                            )}
                            {allocations.length > 0 && (
                                <Chip
                                    icon={<TrendingUp size={14} />}
                                    label={`${allocations.length} Stocks`}
                                    sx={{ bgcolor: 'action.hover', color: 'text.primary', fontWeight: 600, height: 28 }}
                                />
                            )}
                        </Box>

                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                            Give your new portfolio a name to save it to your dashboard and track your investments.
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
                                    color: 'text.primary',
                                    bgcolor: 'background.default',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'primary.main', opacity: 0.5 },
                                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                                }
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button
                        onClick={onClose}
                        sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'text.primary', bgcolor: 'transparent' } }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!name.trim() || isLoading}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 700,
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                        }}
                    >
                        {isLoading ? 'Creating...' : 'Create Portfolio'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}


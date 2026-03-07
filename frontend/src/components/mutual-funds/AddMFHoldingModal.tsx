import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, IconButton, Tooltip, useTheme, Typography } from '@mui/material';
import { X, Calculator, Info } from 'lucide-react';
import MFSearchBar from './MFSearchBar';
import { MutualFundSearchResult } from '@/services/mutualFundService';
import { useColorMode } from '@/theme/ThemeContext';

interface AddMFHoldingModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: (data: any) => Promise<void>;
}

export default function AddMFHoldingModal({ open, onClose, onAdd }: AddMFHoldingModalProps) {
    const theme = useTheme();
    const { mode } = useColorMode();
    const [selectedScheme, setSelectedScheme] = useState<MutualFundSearchResult | null>(null);
    const [units, setUnits] = useState('');
    const [avgNav, setAvgNav] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedScheme || !units || !avgNav) return;
        setLoading(true);
        try {
            await onAdd({
                scheme_code: selectedScheme.schemeCode,
                scheme_name: selectedScheme.schemeName,
                units: parseFloat(units),
                avg_nav: parseFloat(avgNav)
            });
            handleClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedScheme(null);
        setUnits('');
        setAvgNav('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    backgroundImage: 'none',
                    boxShadow: theme.shadows[16],
                    minWidth: { xs: '90%', sm: 500 }
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'text.primary' }}>
                Add Mutual Fund Holding
                <IconButton onClick={handleClose} size="small" sx={{ color: 'text.secondary' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {!selectedScheme ? (
                        <MFSearchBar
                            onSelect={(item) => setSelectedScheme(item)}
                            placeholder="Search scheme to add..."
                            variant="header"
                        />
                    ) : (
                        <Box sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Box>
                                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{selectedScheme.schemeName}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                    Code: {selectedScheme.schemeCode}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                onClick={() => setSelectedScheme(null)}
                                sx={{ color: 'primary.main', fontWeight: 600 }}
                            >
                                Change
                            </Button>
                        </Box>
                    )}

                    <TextField
                        label="Number of Units"
                        type="number"
                        fullWidth
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        disabled={!selectedScheme}
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
                        label="Average Purchase NAV"
                        type="number"
                        fullWidth
                        value={avgNav}
                        onChange={(e) => setAvgNav(e.target.value)}
                        disabled={!selectedScheme}
                        InputProps={{
                            sx: {
                                color: 'primary.main',
                                bgcolor: 'background.default',
                                borderRadius: 2,
                                '& fieldset': { borderColor: 'divider' },
                                fontWeight: 700
                            },
                            startAdornment: <Typography sx={{ color: 'primary.main', mr: 1, fontWeight: 700 }}>₹</Typography>
                        }}
                        InputLabelProps={{ sx: { color: 'text.secondary' } }}
                        helperText="Average cost per unit at the time of purchase"
                        FormHelperTextProps={{ sx: { color: 'text.secondary', fontSize: '0.7rem' } }}
                    />

                    {units && avgNav && (
                        <Box sx={{
                            p: 2,
                            bgcolor: `${theme.palette.primary.main}10`,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: `${theme.palette.primary.main}30`
                        }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Investment</Typography>
                            <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                ₹{(Number(units) * Number(avgNav)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button
                    fullWidth
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!selectedScheme || !units || !avgNav || loading}
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
                    {loading ? 'Adding...' : 'Add Holding'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import MFSearchBar from './MFSearchBar';
import { MutualFundSearchResult } from '@/services/mutualFundService';

interface AddMFHoldingModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: (data: any) => Promise<void>;
}

export default function AddMFHoldingModal({ open, onClose, onAdd }: AddMFHoldingModalProps) {
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
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 600 }}>Add Mutual Fund Holding</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {!selectedScheme ? (
                        <MFSearchBar
                            onSelect={(item) => setSelectedScheme(item)}
                            placeholder="Search scheme to add..."
                            variant="header"
                        />
                    ) : (
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Box sx={{ fontWeight: 600 }}>{selectedScheme.schemeName}</Box>
                                <Box sx={{ typography: 'caption', color: 'text.secondary' }}>Code: {selectedScheme.schemeCode}</Box>
                            </Box>
                            <Button size="small" onClick={() => setSelectedScheme(null)}>Change</Button>
                        </Box>
                    )}

                    <TextField
                        label="Number of Units"
                        type="number"
                        fullWidth
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        disabled={!selectedScheme}
                    />

                    <TextField
                        label="Average Purchase NAV"
                        type="number"
                        fullWidth
                        value={avgNav}
                        onChange={(e) => setAvgNav(e.target.value)}
                        disabled={!selectedScheme}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={handleClose} color="inherit">Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!selectedScheme || !units || !avgNav || loading}
                >
                    {loading ? 'Adding...' : 'Add Holding'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

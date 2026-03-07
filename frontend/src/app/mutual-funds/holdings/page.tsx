'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import MFHoldingsTable from '@/components/mutual-funds/MFHoldingsTable';
import AddMFHoldingModal from '@/components/mutual-funds/AddMFHoldingModal';

// Dummy implementation until backend is fully hooked
const DUMMY_HOLDINGS = [
    { id: '1', scheme_code: '122639', scheme_name: 'Parag Parikh Flexi Cap Fund Direct Growth', units: 105.45, avg_nav: 55.45 },
    { id: '2', scheme_code: '119062', scheme_name: 'HDFC Index Fund Nifty 50 Plan Direct Growth', units: 500.22, avg_nav: 195.30 }
];

export default function MutualFundHoldingsPage() {
    const theme = useTheme();
    const [holdings, setHoldings] = useState<any[]>(DUMMY_HOLDINGS);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleAddHolding = async (data: any) => {
        // In reality, call mutualFundService.addHolding(data)
        const newHolding = {
            id: Math.random().toString(36).substring(7),
            ...data
        };
        setHoldings([...holdings, newHolding]);
        setIsAddModalOpen(false);
    };

    const handleDeleteHolding = async (id: string) => {
        // In reality, call mutualFundService.deleteHolding(id)
        setHoldings(holdings.filter(h => h.id !== id));
    };

    const totalInvested = holdings.reduce((sum, item) => sum + (item.units * item.avg_nav), 0);

    return (
        <Box sx={{ minHeight: '100vh', pb: 8, pt: { xs: 8, md: 10 }, px: { xs: 2, md: 4 } }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Box>
                            <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: theme.palette.text.primary }}>
                                Mutual Fund Holdings
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Track your mutual fund investments and SIPs
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => setIsAddModalOpen(true)}
                            sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
                        >
                            Add Holding
                        </Button>
                    </Box>

                    {/* Summary Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
                        <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>TOTAL INVESTED</Typography>
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalInvested)}
                            </Typography>
                        </Box>
                    </Box>

                    <MFHoldingsTable holdings={holdings} onDelete={handleDeleteHolding} />

                    <AddMFHoldingModal
                        open={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onAdd={handleAddHolding}
                    />
                </motion.div>
            </Box>
        </Box>
    );
}

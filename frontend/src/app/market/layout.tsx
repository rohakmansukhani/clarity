'use client';

import Sidebar from '@/components/layout/Sidebar';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import DisclaimerModal from '@/components/layout/DisclaimerModal';
import { Box, Typography } from '@mui/material';

export default function MarketLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0B0B0B' }}>
            <DisclaimerModal />
            <Sidebar />

            {/* Top Right Floating Brand - Consistent with Dashboard */}
            <Box sx={{ position: 'fixed', top: 28, right: 30, zIndex: 50 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#00E5FF', letterSpacing: '0.1em', fontSize: '1rem' }}>
                    CLARITY
                </Typography>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 6 }, pl: { xs: 2, md: '144px' }, py: { xs: 10, md: 6 }, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1 }}>{children}</Box>
                <DisclaimerFooter />
            </Box>
        </Box>
    );
}

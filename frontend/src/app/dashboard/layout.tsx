'use client';

import Sidebar from '@/components/layout/Sidebar';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import DisclaimerModal from '@/components/layout/DisclaimerModal';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const theme = useTheme();

    const { mode } = useColorMode();

    return (
        <Box sx={{
            display: 'flex',
            minHeight: '100vh',
            bgcolor: theme.palette.background.default,
            position: 'relative'
        }}>
            <DisclaimerModal />
            <Sidebar />

            {/* Top Right Floating Brand */}
            <Box sx={{ position: 'fixed', top: 28, right: 30, zIndex: 50 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: theme.palette.primary.main, letterSpacing: '0.1em', fontSize: '1rem' }}>
                    CLARITY
                </Typography>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, pl: { xs: 2, md: '80px' }, py: { xs: 10, md: 6 }, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1 }}>{children}</Box>
                <DisclaimerFooter />
            </Box>
        </Box>
    );
}

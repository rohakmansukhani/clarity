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
            background: mode === 'dark'
                ? 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #0B0B0B 70%)'
                : 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.05) 0%, #FFFFFF 70%)',
            position: 'relative'
        }}>
            {/* Grid Decoration */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: mode === 'dark'
                        ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
                        : 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
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

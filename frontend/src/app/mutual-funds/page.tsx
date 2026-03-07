'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useColorMode } from '@/theme/ThemeContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import MFSearchBar from '@/components/mutual-funds/MFSearchBar';

export default function MutualFundsHome() {
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pt: 10,
                px: 2,
                position: 'relative',
                bgcolor: 'background.default'
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 680 }}>
                {/* Hero Title */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', md: '5rem' },
                            fontWeight: 700,
                            textAlign: 'center',
                            mb: 2,
                            letterSpacing: '-0.03em',
                            lineHeight: 1,
                            color: theme.palette.text.primary
                        }}
                    >
                        MUTUAL<br />FUNDS
                        <Box component="span" sx={{ color: theme.palette.primary.main }}>.</Box>
                    </Typography>

                    <Typography variant="h5" sx={{ textAlign: 'center', color: theme.palette.text.secondary, mb: 8, fontWeight: 400 }}>
                        Search any AMC or scheme to track performance and calculate SIP returns.
                    </Typography>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <MFSearchBar
                        onSelect={(item) => router.push(`/mutual-funds/${item.schemeCode}`)}
                        placeholder="Type a scheme (e.g. Parag Parikh Flexi Cap)..."
                        variant="hero"
                        autoFocus
                    />
                </motion.div>
            </Box>
        </Box>
    );
}

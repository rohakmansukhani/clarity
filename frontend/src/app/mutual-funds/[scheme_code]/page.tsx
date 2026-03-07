'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Chip, CircularProgress, useTheme } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import MFSearchBar from '@/components/mutual-funds/MFSearchBar';
import NAVChart from '@/components/mutual-funds/NAVChart';
import SIPCalculator from '@/components/mutual-funds/SIPCalculator';
import { mutualFundService, MutualFundDetails } from '@/services/mutualFundService';
import { useColorMode } from '@/theme/ThemeContext';

export default function MutualFundDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();
    const schemeCode = params.scheme_code as string;

    const [details, setDetails] = useState<MutualFundDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!schemeCode) return;
            setLoading(true);
            try {
                const data = await mutualFundService.getFundDetails(schemeCode);
                setDetails(data);
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Failed to load Mutual Fund details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [schemeCode]);

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !details) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', p: 4, pt: 12 }}>
                <MFSearchBar onSelect={(item) => router.push(`/mutual-funds/${item.schemeCode}`)} variant="header" />
                <Typography color="error" variant="h6" sx={{ mt: 4 }}>
                    {error || "Fund not found."}
                </Typography>
            </Box>
        );
    }

    const currentNav = details.data?.length > 0 ? details.data[0].nav : 'N/A';
    const asOfDate = details.data?.length > 0 ? details.data[0].date : '';

    return (
        <Box sx={{ minHeight: '100vh', pb: 8 }}>
            {/* Header Search Area */}
            <Box sx={{
                position: 'sticky', top: 0, zIndex: 40,
                bgcolor: 'background.default',
                borderBottom: `1px solid ${theme.palette.divider}`,
                pb: 2, pt: { xs: 8, md: 3 }, px: { xs: 2, md: 4 }
            }}>
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <MFSearchBar
                        onSelect={(item) => router.push(`/mutual-funds/${item.schemeCode}`)}
                        variant="header"
                    />
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 }, mt: 2 }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    {/* Header Info */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h3" fontWeight={700} sx={{ mb: 1, letterSpacing: '-0.02em', color: theme.palette.text.primary }}>
                            {details.meta.scheme_name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                            <Chip label={details.meta.scheme_category || "N/A"} size="small" sx={{ bgcolor: theme.palette.primary.main, color: '#fff', fontWeight: 600 }} />
                            <Chip label={details.meta.fund_house || "N/A"} size="small" variant="outlined" sx={{ borderColor: theme.palette.divider }} />
                            <Chip label={details.meta.scheme_type || "N/A"} size="small" variant="outlined" sx={{ borderColor: theme.palette.divider }} />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                            <Typography variant="h2" fontWeight={700} sx={{ color: theme.palette.text.primary }}>
                                ₹{currentNav}
                            </Typography>
                            {asOfDate && (
                                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                    NAV as of {asOfDate}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Content Grid */}
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Paper sx={{
                                p: 3,
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`
                            }}>
                                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>NAV History</Typography>
                                <NAVChart data={details.data || []} />
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <SIPCalculator />
                        </Grid>
                    </Grid>
                </motion.div>
            </Box>
        </Box>
    );
}

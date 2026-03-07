'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Chip, CircularProgress, IconButton, useTheme } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Building2, Tag } from 'lucide-react';

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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
        );
    }

    if (error || !details) {
        return (
            <Box sx={{ p: 4 }}>
                <IconButton onClick={() => router.back()} sx={{ mb: 3, color: 'text.secondary' }}>
                    <ArrowLeft size={20} />
                </IconButton>
                <Typography color="error" variant="h6">{error || 'Fund not found.'}</Typography>
            </Box>
        );
    }

    const currentNav = details.data?.length > 0 ? details.data[0].nav : 'N/A';
    const asOfDate = details.data?.length > 0 ? details.data[0].date : '';

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 8 }}>

                {/* Back Button */}
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        onClick={() => router.back()}
                        sx={{
                            color: 'text.secondary',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            '&:hover': { color: 'text.primary', borderColor: theme.palette.text.secondary }
                        }}
                    >
                        <ArrowLeft size={18} />
                    </IconButton>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Mutual Funds</Typography>
                </Box>

                {/* Hero Header */}
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h3" fontWeight={800} sx={{
                        mb: 2, letterSpacing: '-0.03em',
                        background: mode === 'dark'
                            ? 'linear-gradient(to right, #fff, #888)'
                            : 'linear-gradient(to right, #0F172A, #64748B)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {details.meta.scheme_name}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                        <Chip
                            icon={<Tag size={12} />}
                            label={details.meta.scheme_category || 'N/A'}
                            size="small"
                            sx={{
                                bgcolor: `${theme.palette.primary.main}22`,
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                border: `1px solid ${theme.palette.primary.main}44`
                            }}
                        />
                        <Chip
                            icon={<Building2 size={12} />}
                            label={details.meta.fund_house || 'N/A'}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: theme.palette.divider, color: 'text.secondary' }}
                        />
                        <Chip
                            icon={<TrendingUp size={12} />}
                            label={details.meta.scheme_type || 'N/A'}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: theme.palette.divider, color: 'text.secondary' }}
                        />
                    </Box>

                    {/* NAV Price */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
                        <Typography
                            variant="h2"
                            fontWeight={800}
                            sx={{ letterSpacing: '-0.04em', color: theme.palette.text.primary }}
                        >
                            ₹{currentNav}
                        </Typography>
                        {asOfDate && (
                            <Box sx={{
                                px: 2, py: 0.5, borderRadius: 2,
                                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${theme.palette.divider}`
                            }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    NAV as of {asOfDate}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Main Content Grid */}
                <Grid container spacing={4}>
                    {/* Chart */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper elevation={0} sx={{
                            p: 3, borderRadius: 4,
                            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundImage: 'none',
                        }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                                NAV History
                            </Typography>
                            <NAVChart data={details.data || []} />
                        </Paper>
                    </Grid>

                    {/* SIP Calculator */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <SIPCalculator navData={details.data || []} />
                    </Grid>
                </Grid>

            </Box>
        </motion.div>
    );
}

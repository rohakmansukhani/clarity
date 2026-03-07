'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Button, Snackbar, Alert, useTheme } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import NAVChart from '@/components/mutual-funds/NAVChart';
import SIPCalculator from '@/components/mutual-funds/SIPCalculator';
import BacktrackInline from '@/components/stocks/BacktrackInline';
import { mutualFundService, MutualFundDetails } from '@/services/mutualFundService';
import { useColorMode } from '@/theme/ThemeContext';
import { parse } from 'date-fns';

export default function MutualFundDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();
    const schemeCode = params.scheme_code as string;

    const [details, setDetails] = useState<MutualFundDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<string>('1Y');

    // Toast State
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const showToast = (message: string, severity: 'success' | 'error' = 'success') =>
        setToast({ open: true, message, severity });

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
            <Box sx={{
                display: 'flex',
                height: '80vh',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: theme.palette.background.default
            }}>
                <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
            </Box>
        );
    }

    if (error || !details) {
        return (
            <Box sx={{
                display: 'flex',
                height: '80vh',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column'
            }}>
                <Typography color="error" gutterBottom>{error || 'Fund not found'}</Typography>
                <Button variant="outlined" onClick={() => router.back()}>Go Back</Button>
            </Box>
        );
    }

    const currentNav = details.data?.length > 0 ? details.data[0].nav : 'N/A';
    const asOfDate = details.data?.length > 0 ? details.data[0].date : '';

    // Calculate NAV change if we have at least 2 data points
    let navChange = 0;
    let navChangePercent = 0;
    if (details.data && details.data.length >= 2) {
        const latest = parseFloat(details.data[0].nav);
        const previous = parseFloat(details.data[1].nav);
        if (!isNaN(latest) && !isNaN(previous)) {
            navChange = latest - previous;
            navChangePercent = (navChange / previous) * 100;
        }
    }

    const handleAddToHoldings = () => {
        // Placeholder for Add to Holdings functionality
        showToast('Add to Holdings feature coming soon!');
    };

    const handleAddToWatchlist = () => {
        // Placeholder for Add to Watchlist functionality
        showToast('Add to Watchlist feature coming soon!');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Box sx={{
                maxWidth: 1600,
                mx: 'auto',
                pb: 10,
                pt: 6,
                px: { xs: 2, md: 6 },
                bgcolor: theme.palette.background.default,
                minHeight: '100vh',
                color: theme.palette.text.primary
            }}>
                {/* Back Button */}
                <Button
                    startIcon={<ArrowLeft size={20} />}
                    onClick={() => router.back()}
                    sx={{
                        color: theme.palette.text.secondary,
                        mb: 2,
                        pl: 0,
                        '&:hover': {
                            color: theme.palette.text.primary,
                            bgcolor: 'transparent'
                        }
                    }}
                >
                    Back
                </Button>

                {/* Header Section - Matching Stock Page Style */}
                <Box sx={{ mb: 6 }}>
                    {/* Fund House as Subtitle */}
                    <Typography
                        variant="h6"
                        sx={{
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                            mb: 1
                        }}
                    >
                        {details.meta.fund_house || 'N/A'}
                    </Typography>

                    {/* Scheme Name as Main Title */}
                    <Typography
                        variant="h1"
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: '2rem', md: '3rem' },
                            lineHeight: 1.1,
                            letterSpacing: '-0.04em',
                            color: theme.palette.text.primary,
                            mb: 3
                        }}
                    >
                        {details.meta.scheme_name}
                    </Typography>

                    {/* Current NAV and Change */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 600,
                                fontSize: { xs: '2rem', md: '3rem' },
                                color: theme.palette.text.primary
                            }}
                        >
                            ₹{currentNav}
                        </Typography>

                        {navChange !== 0 && (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: navChange >= 0 ? theme.palette.success.main : theme.palette.error.main,
                                bgcolor: navChange >= 0
                                    ? `${theme.palette.success.main}15`
                                    : `${theme.palette.error.main}15`,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1
                            }}>
                                {navChange >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                <Typography variant="h6" sx={{ fontWeight: 600, ml: 0.5 }}>
                                    {navChange > 0 ? '+' : ''}{navChange.toFixed(2)} ({navChangePercent.toFixed(2)}%)
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Date Badge */}
                    {asOfDate && (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{
                                display: 'inline-block',
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${theme.palette.divider}`
                            }}>
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                                >
                                    NAV as of {asOfDate}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Main Content Grid */}
                <Grid container spacing={6}>
                    {/* Left Column: Chart */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{
                            height: 450,
                            bgcolor: theme.palette.background.paper,
                            borderRadius: 4,
                            p: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            mb: 6
                        }}>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ mb: 3, color: 'text.primary' }}
                            >
                                NAV History
                            </Typography>
                            <Box sx={{ height: 'calc(100% - 48px)' }}>
                                <NAVChart data={details.data || []} period={period} setPeriod={setPeriod} />
                            </Box>
                        </Box>

                        {/* Backtrack Inline Integration */}
                        {(() => {
                            if (!details.data || details.data.length === 0) return null;

                            // Find start price based on period
                            const reversed = [...details.data].reverse();
                            const now = new Date();
                            const cutoff = new Date();
                            switch (period) {
                                case '1M': cutoff.setMonth(now.getMonth() - 1); break;
                                case '6M': cutoff.setMonth(now.getMonth() - 6); break;
                                case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
                                case '3Y': cutoff.setFullYear(now.getFullYear() - 3); break;
                                case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
                                default: cutoff.setFullYear(1900); break;
                            }
                            const filtered = reversed.filter(item => {
                                const itemDate = parse(item.date, 'dd-MM-yyyy', new Date());
                                return itemDate >= cutoff;
                            });

                            const startPrice = filtered.length > 0 ? parseFloat(filtered[0].nav) : 0;
                            const currentPrice = parseFloat(details.data[0].nav);

                            return (
                                <BacktrackInline
                                    symbol={details.meta.scheme_name}
                                    startPrice={startPrice}
                                    currentPrice={currentPrice}
                                    timeRange={period}
                                />
                            );
                        })()}
                    </Grid>

                    {/* Right Column: Stats & Actions */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                color: theme.palette.text.secondary,
                                letterSpacing: '0.1em',
                                fontWeight: 600,
                                mb: 3,
                                display: 'block'
                            }}
                        >
                            KEY STATISTICS
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6 }}>
                            <StatRow
                                label="Fund House"
                                value={details.meta.fund_house || 'N/A'}
                                theme={theme}
                            />
                            <StatRow
                                label="Category"
                                value={details.meta.scheme_category || 'N/A'}
                                theme={theme}
                            />
                            <StatRow
                                label="Scheme Type"
                                value={details.meta.scheme_type || 'N/A'}
                                theme={theme}
                            />
                            <StatRow
                                label="Scheme Code"
                                value={details.meta.scheme_code || 'N/A'}
                                theme={theme}
                            />
                            <StatRow
                                label="Current NAV"
                                value={`₹${currentNav}`}
                                theme={theme}
                            />
                        </Box>

                        <Typography
                            variant="caption"
                            sx={{
                                color: theme.palette.text.secondary,
                                letterSpacing: '0.1em',
                                fontWeight: 600,
                                mb: 3,
                                display: 'block'
                            }}
                        >
                            ACTIONS
                        </Typography>

                        {/* Add to Holdings Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleAddToHoldings}
                            sx={{
                                bgcolor: mode === 'dark' ? '#fff' : theme.palette.primary.main,
                                color: mode === 'dark' ? '#000' : '#fff',
                                py: 2,
                                fontWeight: 700,
                                fontSize: '1rem',
                                mb: 2,
                                '&:hover': {
                                    bgcolor: mode === 'dark' ? '#ddd' : theme.palette.primary.dark
                                }
                            }}
                        >
                            Add to Holdings
                        </Button>

                        {/* Add to Watchlist Button */}
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            onClick={handleAddToWatchlist}
                            sx={{
                                color: theme.palette.primary.main,
                                borderColor: `${theme.palette.primary.main}40`,
                                py: 2,
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: `${theme.palette.primary.main}10`
                                }
                            }}
                        >
                            Add to Watchlist
                        </Button>
                    </Grid>
                </Grid>

                {/* SIP Calculator - Below Grid */}
                <Box sx={{ mt: 6 }}>
                    <SIPCalculator navData={details.data || []} />
                </Box>

                {/* Global Toast */}
                <Snackbar
                    open={toast.open}
                    autoHideDuration={3000}
                    onClose={() => setToast(prev => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity={toast.severity}
                        onClose={() => setToast(prev => ({ ...prev, open: false }))}
                        sx={{
                            bgcolor: toast.severity === 'success'
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                            color: mode === 'dark' ? '#000' : '#fff',
                            fontWeight: 600
                        }}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            </Box>
        </motion.div>
    );
}

// Helper Component for Stat Rows
function StatRow({ label, value, theme }: { label: string, value: string | number | React.ReactNode, theme: any }) {
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`
        }}>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {value}
            </Typography>
        </Box>
    );
}

'use client';

import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DollarSign, Trash2, TrendingUp, Shield, Activity, PieChart as PieIcon } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

interface PortfolioAllocation {
    symbol: string;
    allocation_percent: number;
    amount: number;
    shares: number;
    price_per_share: number;
}

interface PortfolioBuilderProps {
    allocations: PortfolioAllocation[];
    totalBudget: number;
    riskLevel: string;
    estimatedReturn: number;
}

const COLORS = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function PortfolioBuilder({ allocations, totalBudget, riskLevel, estimatedReturn }: PortfolioBuilderProps) {
    const theme = useTheme();
    const { mode } = useColorMode();

    const pieData = allocations.map((alloc, i) => ({
        name: alloc.symbol,
        value: alloc.allocation_percent,
        color: COLORS[i % COLORS.length]
    }));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Your Optimized Portfolio
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    AI-calculated allocation based on your preferences
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Pie Chart */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid ' + theme.palette.divider, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                            Allocation Breakdown
                        </Typography>

                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid ' + theme.palette.divider }}>
                                                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                        {payload[0].name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {payload[0].value}%
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <Box sx={{ mt: 3 }}>
                            {pieData.map((entry, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: entry.color }} />
                                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {entry.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                        {entry.value}%
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Allocation Details */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Summary Cards */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid ' + theme.palette.divider }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <DollarSign size={20} color={theme.palette.primary.main} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Total Investment
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        ₹{totalBudget.toLocaleString()}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid ' + theme.palette.divider }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Shield size={20} color={theme.palette.success.main} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Risk Level
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                                        {riskLevel}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid ' + theme.palette.divider }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <TrendingUp size={20} color={theme.palette.warning.main} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Est. Return (1Y)
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                        {estimatedReturn}%
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Stock Breakdown */}
                        {allocations.map((alloc, i) => (
                            <Paper
                                key={alloc.symbol}
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: 'background.paper',
                                    border: '1px solid ' + theme.palette.divider,
                                    borderLeft: `4px solid ${COLORS[i % COLORS.length]}`
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {alloc.symbol}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {alloc.allocation_percent}% of portfolio
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                                        ₹{alloc.amount.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 4 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                            Shares
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {alloc.shares}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                            Price/Share
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            ₹{alloc.price_per_share.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </Grid>
            </Grid>
        </motion.div>
    );
}

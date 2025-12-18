import React from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ComparisonChartProps {
    chartData: any[];
    selectedStocks: string[];
    chartPeriod: string;
}

export function ComparisonChart({ chartData, selectedStocks, chartPeriod }: ComparisonChartProps) {
    const colors = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                    Relative Performance
                </Typography>
            </Box>

            {/* Chart */}
            <ResponsiveContainer width="100%" height="90%">
                <LineChart
                    data={chartData.length > 0 ? chartData : [{ date: 'Loading...', stock1: 100 }]}
                    margin={{ top: 20, right: 20, left: -20, bottom: 40 }}
                >
                    <defs>
                        {selectedStocks.map((s, i) => (
                            <linearGradient key={s} id={`gradient${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[i % 5]} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={colors[i % 5]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>

                    <XAxis
                        dataKey="date"
                        stroke="none"
                        tick={{ fill: '#666', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: '#222', strokeWidth: 1 }}
                        dy={10}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            if (chartPeriod === '1mo') {
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } else if (chartPeriod === '3mo' || chartPeriod === '6mo') {
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } else {
                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            }
                        }}
                        interval="preserveStartEnd"
                        minTickGap={60}
                    />

                    <YAxis
                        stroke="none"
                        tick={{ fill: '#666', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: '#222', strokeWidth: 1 }}
                        dx={-5}
                        tickFormatter={(value) => `${value}`}
                        domain={['auto', 'auto']}
                    />

                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length && label) {
                                const date = new Date(label);
                                const formattedDate = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });

                                const sortedPayload = [...payload].sort((a, b) => (b.value as number) - (a.value as number));

                                return (
                                    <Box sx={{
                                        bgcolor: 'rgba(0, 0, 0, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 3,
                                        p: 2,
                                        minWidth: 180,
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#888', mb: 1.5, display: 'block', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                            {formattedDate}
                                        </Typography>
                                        {sortedPayload.map((entry: any, index: number) => {
                                            const stockSymbol = selectedStocks[parseInt(entry.dataKey.replace('stock', '')) - 1];
                                            const stockIndex = parseInt(entry.dataKey.replace('stock', ''));
                                            const actualPrice = (payload as any)[0]?.payload?.[`price${stockIndex}`];

                                            return (
                                                <Box key={index} sx={{ mb: index < sortedPayload.length - 1 ? 1 : 0 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: entry.stroke }} />
                                                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>
                                                                {stockSymbol}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{
                                                            color: '#fff',
                                                            fontWeight: 700,
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            {actualPrice ? `₹${actualPrice.toFixed(2)}` : 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                );
                            }
                            return null;
                        }}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                    />

                    {selectedStocks.map((s, i) => (
                        <Line
                            key={s}
                            type="monotone"
                            dataKey={`stock${i + 1}`}
                            stroke={colors[i % 5]}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#000', fill: colors[i % 5] }}
                            animationDuration={1000}
                            animationEasing="ease-in-out"
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </>
    );
}

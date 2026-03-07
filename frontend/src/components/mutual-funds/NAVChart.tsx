import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parse } from 'date-fns';

interface NAVChartProps {
    data: { date: string; nav: string }[];
}

export default function NAVChart({ data }: NAVChartProps) {
    const theme = useTheme();
    const [period, setPeriod] = useState<string>('1Y');

    const formattedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        // The data is usually from newest to oldest. Reverse it to show chronological order.
        const reversed = [...data].reverse();

        let filtered = reversed;
        const now = new Date();
        const cutoff = new Date();

        switch (period) {
            case '1M':
                cutoff.setMonth(now.getMonth() - 1);
                break;
            case '6M':
                cutoff.setMonth(now.getMonth() - 6);
                break;
            case '1Y':
                cutoff.setFullYear(now.getFullYear() - 1);
                break;
            case '3Y':
                cutoff.setFullYear(now.getFullYear() - 3);
                break;
            case '5Y':
                cutoff.setFullYear(now.getFullYear() - 5);
                break;
            default: // ALL
                cutoff.setFullYear(1900); // effectively all
                break;
        }

        filtered = reversed.filter(item => {
            const itemDate = parse(item.date, 'dd-MM-yyyy', new Date());
            return itemDate >= cutoff;
        });

        return filtered.map(item => {
            const parsedDate = parse(item.date, 'dd-MM-yyyy', new Date());
            return {
                date: format(parsedDate, 'PP'),
                shortDate: format(parsedDate, 'MMM yyyy'),
                nav: parseFloat(item.nav),
            };
        });
    }, [data, period]);

    if (!data || data.length === 0) {
        return <Typography variant="body2" color="text.secondary">No historical NAV data available.</Typography>;
    }

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <ToggleButtonGroup
                    value={period}
                    exclusive
                    onChange={(e, newPeriod) => {
                        if (newPeriod !== null) setPeriod(newPeriod);
                    }}
                    size="small"
                >
                    <ToggleButton value="1M">1M</ToggleButton>
                    <ToggleButton value="6M">6M</ToggleButton>
                    <ToggleButton value="1Y">1Y</ToggleButton>
                    <ToggleButton value="3Y">3Y</ToggleButton>
                    <ToggleButton value="5Y">5Y</ToggleButton>
                    <ToggleButton value="ALL">ALL</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="shortDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            minTickGap={50}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme.palette.background.paper,
                                borderRadius: 8,
                                border: `1px solid ${theme.palette.divider}`,
                                boxShadow: theme.shadows[3]
                            }}
                            labelStyle={{ color: theme.palette.text.secondary, marginBottom: 4 }}
                            itemStyle={{ color: theme.palette.primary.main, fontWeight: 700 }}
                            formatter={(value: any) => [`₹${value.toFixed(4)}`, 'NAV']}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                    return payload[0].payload.date;
                                }
                                return label;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="nav"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorNav)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}

import { useMemo, useState } from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format, parse } from 'date-fns';
import { useColorMode } from '@/theme/ThemeContext';

interface NAVChartProps {
    data: { date: string; nav: string }[];
    period: string;
    setPeriod: (period: string) => void;
}

export default function NAVChart({ data, period, setPeriod }: NAVChartProps) {
    const theme = useTheme();
    const { mode } = useColorMode();

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
                date: parsedDate.toISOString(),
                shortDate: format(parsedDate, 'MMM yyyy'),
                nav: parseFloat(item.nav),
            };
        });
    }, [data, period]);

    if (!data || data.length === 0) {
        return <Typography variant="body2" color="text.secondary">No historical NAV data available.</Typography>;
    }

    const years = new Set(formattedData.map(d => new Date(d.date).getFullYear()));
    const showYear = years.size > 1;

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Time Range Buttons - Horizontally Scrollable on Mobile */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                zIndex: 10,
                display: 'flex',
                gap: 1,
                maxWidth: '100%',
                overflowX: 'auto',
                pb: { xs: 0.5, md: 0 },
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {['1M', '6M', '1Y', '3Y', '5Y', 'ALL'].map((range) => (
                    <Button
                        key={range}
                        size="small"
                        onClick={() => setPeriod(range)}
                        sx={{
                            minWidth: 'fit-content',
                            px: 1.5,
                            whiteSpace: 'nowrap',
                            color: period === range ? theme.palette.primary.main : theme.palette.text.secondary,
                            fontWeight: 700,
                            bgcolor: period === range ? `${theme.palette.primary.main}15` : 'transparent',
                            '&:hover': {
                                color: theme.palette.text.primary,
                                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                            }
                        }}
                    >
                        {range}
                    </Button>
                ))}
            </Box>

            <Box sx={{ width: '100%', height: '100%', mt: 4 }}>
                {formattedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    if (period === '1M') return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
                                    return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                }}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                                dy={10}
                                minTickGap={period === '1M' ? 30 : 50}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                                width={45}
                                tickFormatter={(val) => `₹${val.toFixed(1)}`}
                            />
                            <RechartsTooltip
                                content={<CustomTooltip showYear={showYear} theme={theme} />}
                                cursor={{ stroke: theme.palette.divider, strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="nav"
                                stroke={theme.palette.primary.main}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorNav)"
                                animationDuration={500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <Box sx={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography color="text.secondary">No data for this period</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

function CustomTooltip({ active, payload, label, showYear, theme }: any) {
    if (active && payload && payload.length) {
        const dateObj = new Date(label);
        const options: any = { month: 'short', day: 'numeric' };
        if (showYear) {
            options.year = 'numeric';
        }
        const dateStr = dateObj.toLocaleDateString([], options);

        return (
            <Box sx={{
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 1.5,
                boxShadow: theme.palette.mode === 'light' ? '0 4px 20px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                minWidth: 140
            }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>
                    {dateStr}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 700, lineHeight: 1 }}>
                        ₹{parseFloat(payload[0].value).toFixed(4)}
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.7rem' }}>
                    NAV
                </Typography>
            </Box>
        );
    }
    return null;
}

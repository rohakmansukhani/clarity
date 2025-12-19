import React, { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type MetricDefinition = {
    key: string;
    label: string;
    format: (v: any) => string;
    winnerKey: string | null;
    tooltip?: string;
    sortable?: boolean;
};

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc' | null;
};

// Helper component for displaying comparison data
export function ComparisonTable({ comparisonData, selectedStocks }: { comparisonData: any, selectedStocks: string[] }) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    if (!comparisonData || !comparisonData.comparison || Object.keys(comparisonData.comparison).length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                <Typography>No comparison data available</Typography>
            </Box>
        );
    }

    const metrics: MetricDefinition[] = [
        {
            key: 'composite_score',
            label: 'Overall Score',
            format: (v: number) => v.toFixed(1),
            winnerKey: 'best_overall',
            tooltip: 'Composite score combining all factors. Higher is better. Score > 70 is excellent, 50-70 is good, < 50 needs caution.',
            sortable: true
        },
        {
            key: 'market_cap',
            label: 'Market Cap',
            format: (v: any) => typeof v === 'string' ? v : `₹${v}`,
            winnerKey: 'highest_market_cap',
            tooltip: 'Total market value of the company. Large cap (>₹20,000 Cr) is more stable, small cap (<₹5,000 Cr) has higher growth potential.',
            sortable: false
        },
        {
            key: 'pe_ratio',
            label: 'P/E Ratio',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) : v,
            winnerKey: 'lowest_pe',
            tooltip: 'Price-to-Earnings ratio. Lower generally means better value. Industry average is 15-25. High P/E may indicate overvaluation or high growth expectations.',
            sortable: true
        },
        {
            key: 'roe',
            label: 'ROE (%)',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) + '%' : v,
            winnerKey: 'highest_roe',
            tooltip: 'Return on Equity - how efficiently the company uses shareholder money. Higher is better. > 15% is good, > 20% is excellent.',
            sortable: true
        },
        {
            key: 'debt_to_equity',
            label: 'Debt/Equity',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) : v,
            winnerKey: 'best_equity_to_debt',
            tooltip: 'Debt-to-Equity ratio measures financial leverage. Lower is generally safer. < 1 is good, < 0.5 is very safe, > 2 may be risky.',
            sortable: true
        },
        {
            key: 'dividend_yield',
            label: 'Div Yield (%)',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) + '%' : v,
            winnerKey: 'highest_dividend',
            tooltip: 'Annual dividend as % of stock price. Higher means more income. 2-4% is typical, > 5% is high (but check sustainability).',
            sortable: true
        },
        {
            key: 'stability_label',
            label: 'Stability',
            format: (v: string) => v,
            winnerKey: 'most_stable',
            tooltip: 'Price stability score. More stable stocks have lower volatility and are safer for conservative investors.',
            sortable: false
        },
        {
            key: 'risk_level',
            label: 'Risk Level',
            format: (v: string) => v,
            winnerKey: 'lowest_risk',
            tooltip: 'Overall risk assessment. LOW risk is safer but may have lower returns. HIGH risk has potential for higher returns but more volatility.',
            sortable: false
        },
        {
            key: 'valuation',
            label: 'Valuation',
            format: (v: string) => v,
            winnerKey: 'best_value',
            tooltip: 'Current valuation level. UNDERVALUED may be a buying opportunity, OVERVALUED suggests caution, FAIR is appropriately priced.',
            sortable: false
        },
        {
            key: 'action',
            label: 'Recommendation',
            format: (v: string) => v,
            winnerKey: null,
            tooltip: 'AI-powered recommendation based on all factors. BUY = strong opportunity, HOLD = maintain position, SELL = consider exiting.',
            sortable: false
        },
    ];

    const colors = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    // Sort stocks based on current sort config
    const getSortedStocks = () => {
        if (!sortConfig.direction || !sortConfig.key) return selectedStocks;

        return [...selectedStocks].sort((a, b) => {
            const aValue = comparisonData.comparison[a]?.[sortConfig.key];
            const bValue = comparisonData.comparison[b]?.[sortConfig.key];

            // Handle N/A or missing values
            if (aValue === 'N/A' || aValue === undefined) return 1;
            if (bValue === 'N/A' || bValue === undefined) return -1;

            // Numeric comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
    };

    const handleSort = (metricKey: string) => {
        if (!metrics.find(m => m.key === metricKey)?.sortable) return;

        setSortConfig(prev => {
            if (prev.key !== metricKey) {
                return { key: metricKey, direction: 'desc' };
            }
            if (prev.direction === 'desc') {
                return { key: metricKey, direction: 'asc' };
            }
            return { key: '', direction: null };
        });
    };

    const sortedStocks = getSortedStocks();

    return (
        <>
            {metrics.map((metric, idx) => {
                const isActionRow = metric.key === 'action';
                const isSorted = sortConfig.key === metric.key;

                return (
                    <Box
                        key={metric.key}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`,
                            gap: { xs: 1, md: 2 },
                            py: { xs: 2, md: 2.5 },
                            borderBottom: idx === metrics.length - 1 ? 'none' : '1px solid #1a1a1a',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: metric.sortable ? 'pointer' : 'default',
                                '&:hover': metric.sortable ? { color: '#00E5FF' } : {}
                            }}
                            onClick={() => handleSort(metric.key)}
                        >
                            <Typography variant="body2" sx={{ color: isSorted ? '#00E5FF' : '#888', fontWeight: 600, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {metric.label}
                            </Typography>
                            {metric.sortable && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: isSorted ? '#00E5FF' : '#666' }}>
                                    {!isSorted && <ArrowUpDown size={14} />}
                                    {isSorted && sortConfig.direction === 'desc' && <ArrowDown size={14} />}
                                    {isSorted && sortConfig.direction === 'asc' && <ArrowUp size={14} />}
                                </Box>
                            )}
                            {metric.tooltip && (
                                <Tooltip
                                    title={metric.tooltip}
                                    arrow
                                    placement="top"
                                    sx={{
                                        '& .MuiTooltip-tooltip': {
                                            bgcolor: 'rgba(10, 10, 10, 0.95)',
                                            border: '1px solid #333',
                                            borderRadius: 2,
                                            p: 1.5,
                                            maxWidth: 300,
                                            fontSize: '0.875rem',
                                            lineHeight: 1.5
                                        },
                                        '& .MuiTooltip-arrow': {
                                            color: 'rgba(10, 10, 10, 0.95)',
                                            '&::before': {
                                                border: '1px solid #333'
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                                        <Info size={14} color="#666" />
                                    </Box>
                                </Tooltip>
                            )}
                        </Box>
                        {sortedStocks.map((symbol) => {
                            const data = comparisonData.comparison[symbol];
                            const value = data?.[metric.key];
                            const isWinner = metric.winnerKey && comparisonData.winners?.[metric.winnerKey] === symbol;
                            const stockIdx = selectedStocks.indexOf(symbol);
                            const winColor = colors[stockIdx % 5];

                            // Special coloring for action
                            const textColor = isActionRow
                                ? (value === 'BUY' ? '#10B981' : value === 'SELL' ? '#EF4444' : '#F59E0B')
                                : (isWinner ? winColor : '#fff');

                            return (
                                <Typography
                                    key={symbol}
                                    variant="body2"
                                    sx={{
                                        color: textColor,
                                        fontWeight: isWinner || isActionRow ? 700 : 500,
                                        textAlign: 'center',
                                        opacity: isWinner || isActionRow ? 1 : 0.7,
                                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                                    }}
                                >
                                    {value ? metric.format(value) : 'N/A'}
                                </Typography>
                            );
                        })}
                    </Box>
                );
            })}
        </>
    );
}

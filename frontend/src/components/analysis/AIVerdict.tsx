import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Scale } from 'lucide-react';

interface AIVerdictProps {
    comparisonData: any;
    selectedStocks: string[];
}

export function AIVerdict({ comparisonData, selectedStocks }: AIVerdictProps) {
    if (!comparisonData || !comparisonData.winners) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>
                <Typography>Analyzing stocks...</Typography>
            </Box>
        );
    }

    const { winners, comparison, summary } = comparisonData;

    // Get winner details
    const overallWinner = winners.best_overall;
    const mostStable = winners.most_stable;
    const bestValue = winners.best_value;
    const lowestRisk = winners.lowest_risk;

    // Get overall winner's data
    const winnerData = comparison[overallWinner];

    return (
        <Box>
            {/* Main Verdict Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(0, 229, 255, 0.1)',
                    color: '#00E5FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Scale size={24} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                        Analysis Summary
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00E5FF', letterSpacing: '0.05em', fontWeight: 600 }}>
                        AI-POWERED RECOMMENDATION
                    </Typography>
                </Box>
            </Box>

            {/* Summary Text */}
            <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.7, mb: 3 }}>
                {summary || 'Analyzing comparison data...'}
            </Typography>

            {/* Overall Winner - Minimal Design with Teal Accent */}
            <Box sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                bgcolor: 'rgba(0, 229, 255, 0.03)',
                border: '1px solid rgba(0, 229, 255, 0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#00E5FF', mb: 0.5, display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>
                            TOP PICK
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                            {overallWinner}
                        </Typography>
                    </Box>
                    <Chip
                        label={winnerData?.action || 'HOLD'}
                        sx={{
                            bgcolor: winnerData?.action === 'BUY' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: winnerData?.action === 'BUY' ? '#00E5FF' : '#fff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            border: `1px solid ${winnerData?.action === 'BUY' ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Score</Typography>
                        <Typography variant="body2" sx={{ color: '#00E5FF', fontWeight: 700 }}>
                            {winnerData?.composite_score || 'N/A'}/100
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Valuation</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {winnerData?.valuation || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Risk</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {winnerData?.risk_level || 'N/A'}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Category Winners - Minimal Grid with Teal Accents */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {/* Most Stable */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        MOST STABLE
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {mostStable}
                    </Typography>
                </Box>

                {/* Best Value */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        BEST VALUE
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {bestValue}
                    </Typography>
                </Box>

                {/* Lowest Risk */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        LOWEST RISK
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {lowestRisk}
                    </Typography>
                </Box>
            </Box>

            {/* Investment Strategy - Clean List with Teal Accent */}
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="subtitle2" sx={{ color: '#00E5FF', fontWeight: 600, mb: 2, letterSpacing: '0.02em' }}>
                    Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {selectedStocks.map((stock) => {
                        const stockData = comparison[stock];
                        const action = stockData?.action;
                        const score = stockData?.composite_score;

                        return (
                            <Box key={stock} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', '&:last-child': { borderBottom: 'none' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, minWidth: 80 }}>
                                        {stock}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        color: action === 'BUY' ? '#00E5FF' : '#888',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        bgcolor: action === 'BUY' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        fontWeight: 600,
                                        fontSize: '0.7rem'
                                    }}>
                                        {action || 'HOLD'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                    Score: <span style={{ color: '#fff', fontWeight: 600 }}>{score || 'N/A'}</span>/100
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}

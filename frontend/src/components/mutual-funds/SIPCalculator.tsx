import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, TextField, InputAdornment, Button, CircularProgress, Tooltip, useTheme } from '@mui/material';
import { mutualFundService, SIPCalculationResponse } from '@/services/mutualFundService';
import { Calculator, Info } from 'lucide-react';
import { parse } from 'date-fns';

interface SIPCalculatorProps {
    navData?: { date: string; nav: string }[];
}

/** Compute 3-year CAGR from NAV history (newest-first array). Returns null if insufficient data. */
function computeCAGR(navData: { date: string; nav: string }[]): { cagr: number; years: number } | null {
    if (!navData || navData.length < 2) return null;

    // Data is newest → oldest. Index 0 is latest NAV.
    const latestNav = parseFloat(navData[0].nav);
    const latestDate = parse(navData[0].date, 'dd-MM-yyyy', new Date());

    // Try to find entry closest to 3Y ago, fallback to 1Y, then whatever we have
    const targets = [3, 1];
    for (const years of targets) {
        const cutoffDate = new Date(latestDate);
        cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

        // Find closest data point at or before the cutoff
        const pastEntry = navData.find(item => {
            try {
                return parse(item.date, 'dd-MM-yyyy', new Date()) <= cutoffDate;
            } catch {
                return false;
            }
        });

        if (pastEntry) {
            const pastNav = parseFloat(pastEntry.nav);
            if (pastNav > 0) {
                const cagr = (Math.pow(latestNav / pastNav, 1 / years) - 1) * 100;
                return { cagr: Math.round(cagr * 100) / 100, years };
            }
        }
    }
    return null;
}

export default function SIPCalculator({ navData }: SIPCalculatorProps) {
    const theme = useTheme();
    const [type, setType] = useState<'sip' | 'lumpsum'>('sip');
    const [amount, setAmount] = useState<number>(10000);
    const [tenure, setTenure] = useState<number>(10);
    const [result, setResult] = useState<SIPCalculationResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // Auto-compute return rate from NAV history
    const cagrInfo = useMemo(() => navData ? computeCAGR(navData) : null, [navData]);
    const returnPct = cagrInfo?.cagr ?? 12; // fallback to 12% if no data

    const calculate = async () => {
        setLoading(true);
        try {
            const data = await mutualFundService.calculateSIP({
                type,
                amount,
                return_pct: returnPct,
                tenure_years: tenure
            });
            setResult(data);
        } catch (e) {
            console.error("Failed to calculate", e);
        } finally {
            setLoading(false);
        }
    };

    // Recalculate whenever returnPct or type changes
    useEffect(() => {
        calculate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [returnPct, type]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, height: '100%', backgroundImage: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Calculator size={24} color={theme.palette.primary.main} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Return Calculator</Typography>
            </Box>

            {/* SIP / Lumpsum Toggle */}
            <Box sx={{ display: 'flex', gap: 1, mb: 4, p: 0.5, bgcolor: 'background.default', borderRadius: 2 }}>
                <Button
                    fullWidth
                    variant={type === 'sip' ? 'contained' : 'text'}
                    onClick={() => setType('sip')}
                    sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: type === 'sip' ? undefined : 'text.secondary'
                    }}
                    disableElevation
                >
                    SIP
                </Button>
                <Button
                    fullWidth
                    variant={type === 'lumpsum' ? 'contained' : 'text'}
                    onClick={() => setType('lumpsum')}
                    sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: type === 'lumpsum' ? undefined : 'text.secondary'
                    }}
                    disableElevation
                >
                    Lumpsum
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Investment Amount */}
                <TextField
                    label={type === 'sip' ? "Monthly Investment" : "Total Investment"}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                />

                {/* Auto-computed Return Rate (read-only) */}
                <Box>
                    <Tooltip
                        title={cagrInfo
                            ? `Calculated from this fund's actual ${cagrInfo.years}Y CAGR based on historical NAV data.`
                            : "Using a default 12% p.a. estimate. No NAV history available for auto-calculation."}
                        placement="top"
                        arrow
                    >
                        <TextField
                            label="Expected Return Rate (p.a)"
                            type="number"
                            value={returnPct}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                readOnly: true,
                            }}
                            sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    cursor: 'default',
                                }
                            }}
                        />
                    </Tooltip>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, px: 1 }}>
                        <Info size={11} color={theme.palette.text.disabled} />
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                            {cagrInfo
                                ? `Based on this fund's actual ${cagrInfo.years}Y CAGR`
                                : 'Default estimate — no NAV history available'}
                        </Typography>
                    </Box>
                </Box>

                {/* Time Period */}
                <TextField
                    label="Time Period"
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(Number(e.target.value))}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">Years</InputAdornment>,
                    }}
                />

                <Button
                    variant="contained"
                    color="primary"
                    onClick={calculate}
                    disabled={loading}
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Calculate Returns'}
                </Button>
            </Box>

            {result && (
                <Box sx={{ mt: 5, pt: 4, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Invested Amount</Typography>
                        <Typography variant="body1" fontWeight={600}>{formatCurrency(result.total_investment)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Est. Returns</Typography>
                        <Typography variant="body1" fontWeight={600} color="success.main">+{formatCurrency(result.wealth_gain)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700}>Total Value</Typography>
                        <Typography variant="h6" fontWeight={800} color="primary.main">{formatCurrency(result.maturity_value)}</Typography>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}

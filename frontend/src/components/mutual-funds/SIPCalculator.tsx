import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, InputAdornment, Button, CircularProgress, useTheme } from '@mui/material';
import { mutualFundService, SIPCalculationResponse } from '@/services/mutualFundService';
import { Calculator } from 'lucide-react';

export default function SIPCalculator() {
    const theme = useTheme();
    const [type, setType] = useState<'sip' | 'lumpsum'>('sip');
    const [amount, setAmount] = useState<number>(10000);
    const [returnPct, setReturnPct] = useState<number>(12);
    const [tenure, setTenure] = useState<number>(10);
    const [result, setResult] = useState<SIPCalculationResponse | null>(null);
    const [loading, setLoading] = useState(false);

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

    // Calculate on initial load
    useEffect(() => {
        calculate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Calculator size={24} color={theme.palette.primary.main} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Return Calculator</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 4, p: 0.5, bgcolor: 'background.default', borderRadius: 2 }}>
                <Button
                    fullWidth
                    variant={type === 'sip' ? 'contained' : 'text'}
                    onClick={() => setType('sip')}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                    disableElevation
                >
                    SIP
                </Button>
                <Button
                    fullWidth
                    variant={type === 'lumpsum' ? 'contained' : 'text'}
                    onClick={() => setType('lumpsum')}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                    disableElevation
                >
                    Lumpsum
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                    label={type === 'sip' ? "Monthly Investment" : "Total Investment"}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                />

                <TextField
                    label="Expected Return Rate (p.a)"
                    type="number"
                    value={returnPct}
                    onChange={(e) => setReturnPct(Number(e.target.value))}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                />

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
                    {loading ? <CircularProgress size={24} /> : 'Calculate Returns'}
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

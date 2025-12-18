'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, CircularProgress, Autocomplete, Paper } from '@mui/material';
import Sidebar from '@/components/layout/Sidebar';
import { marketService } from '@/services/marketService';
import { RotateCcw, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function BacktrackPage() {
    const [ticker, setTicker] = useState('');
    const [searchOptions, setSearchOptions] = useState<any[]>([]);
    const [date, setDate] = useState('');
    const [sellDate, setSellDate] = useState('');
    const [useCustomSellDate, setUseCustomSellDate] = useState(false);
    const [minDate, setMinDate] = useState(''); // New state for constraint

    const [shares, setShares] = useState<string>('1');
    const [amount, setAmount] = useState<string>('10000');
    const [inputMode, setInputMode] = useState<'shares' | 'amount'>('shares');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    // Fetch listing date when ticker changes (debounced or on selection)
    // We'll do it on selection for now in Autocomplete onChange
    const [priceAtDate, setPriceAtDate] = useState<number | null>(null);

    // Check URL params for pre-filled stock
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stockParam = params.get('stock');

        if (stockParam) {
            const symbol = stockParam.trim().toUpperCase();
            handleTickerSelect(symbol);
        }
    }, []);

    // Fetch listing date when ticker changes (debounced or on selection)
    // We'll do it on selection for now in Autocomplete onChange
    const handleTickerSelect = async (symbol: string) => {
        setTicker(symbol);
        if (symbol) {
            try {
                const d = await marketService.getListingDate(symbol);
                setMinDate(d);
                // If current selected date is before minDate, reset it?
                if (date && d && new Date(date) < new Date(d)) {
                    setDate('');
                }
            } catch (e) {
                console.error("Failed to fetch listing date", e);
            }
        } else {
            setMinDate('');
        }
    };

    // Fetch price when date and ticker are valid
    React.useEffect(() => {
        const fetchPrice = async () => {
            if (ticker && date) {
                try {
                    const p = await marketService.getPriceAtDate(ticker, date);
                    setPriceAtDate(p);
                    // Initial Sync logic upon selection?
                    // If we have shares, update amount. Or preserve user intent?
                    // Let's just update the non-active field or both?
                    // Safe default: Update Amount based on Shares (since default shares=1)
                    if (p > 0) {
                        if (inputMode === 'shares') {
                            setAmount((parseFloat(shares) * p).toFixed(2));
                        } else {
                            setShares((parseFloat(amount) / p).toFixed(4));
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch price", e);
                }
            } else {
                setPriceAtDate(null);
            }
        };
        fetchPrice();
    }, [ticker, date]);


    const handleCalculate = async () => {
        if (!ticker || !date) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            let data;
            const finalSellDate = useCustomSellDate ? sellDate : undefined;
            if (inputMode === 'shares') {
                data = await marketService.backtest(ticker, date, Number(shares), undefined, finalSellDate);
            } else {
                data = await marketService.backtest(ticker, date, undefined, Number(amount), finalSellDate);
            }
            setResult(data);
        } catch (e) {
            console.error(e);
            setError("Failed to fetch backtest data. check ticker or date.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: '#000', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, p: 4, pl: { xs: 4, md: '140px' }, maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <RotateCcw size={32} color="#00E5FF" />
                    Backtrack
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 6 }}>
                    Simulate past investments. "If I had bought X shares of Y on date Z..."
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6 }}>
                    {/* Input Section */}
                    <Box component={motion.div} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <Card sx={{ bgcolor: '#0A0A0A', border: '1px solid #222', borderRadius: 4, p: 2, overflow: 'visible' }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <Autocomplete
                                    freeSolo
                                    options={searchOptions}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.symbol}
                                    onInputChange={async (event, newInputValue) => {
                                        setTicker(newInputValue.toUpperCase());
                                        if (newInputValue.length > 1) {
                                            try {
                                                const results = await marketService.searchStocks(newInputValue);
                                                setSearchOptions(results || []);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        } else {
                                            setSearchOptions([]);
                                        }
                                    }}
                                    onChange={(event, value: any) => {
                                        if (value) {
                                            const sym = typeof value === 'string' ? value : value.symbol;
                                            handleTickerSelect(sym);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Stock Ticker"
                                            placeholder="e.g. RELIANCE"
                                            fullWidth
                                            variant="outlined"
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': { borderColor: '#333' },
                                                    '& input': { color: '#fff', fontSize: '1.2rem', fontWeight: 700 }
                                                },
                                                '& .MuiInputBase-root': { color: '#fff' }
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option: any) => {
                                        const { key, ...otherProps } = props;
                                        return (
                                            <li key={key} {...otherProps} style={{ backgroundColor: '#111', color: '#fff', borderBottom: '1px solid #222' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#888' }}>{option.name}</Typography>
                                                </Box>
                                            </li>
                                        );
                                    }}
                                    PaperComponent={({ children }) => (
                                        <Paper sx={{ bgcolor: '#111', border: '1px solid #333', color: '#fff' }}>
                                            {children}
                                        </Paper>
                                    )}
                                />

                                <Box sx={{ opacity: ticker ? 1 : 0.5, pointerEvents: ticker ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                    <CustomDatePicker
                                        value={date}
                                        onChange={setDate}
                                        label={minDate ? `Buy Date (Data since: ${minDate})` : "Buy Date"}
                                        minDate={minDate}
                                    />
                                </Box>

                                {/* Sell Date Toggle */}
                                <Box sx={{ opacity: date ? 1 : 0.5, pointerEvents: date ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: useCustomSellDate ? 2 : 0 }}>
                                        <Typography
                                            onClick={() => {
                                                setUseCustomSellDate(false);
                                                setSellDate('');
                                            }}
                                            sx={{
                                                cursor: 'pointer',
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                bgcolor: !useCustomSellDate ? '#00E5FF' : 'transparent',
                                                color: !useCustomSellDate ? '#000' : '#666',
                                                fontWeight: !useCustomSellDate ? 700 : 500,
                                                border: !useCustomSellDate ? 'none' : '1px solid #333',
                                                transition: 'all 0.2s',
                                                '&:hover': { bgcolor: !useCustomSellDate ? '#00E5FF' : 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            Holding till today
                                        </Typography>
                                        <Typography
                                            onClick={() => setUseCustomSellDate(true)}
                                            sx={{
                                                cursor: 'pointer',
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                bgcolor: useCustomSellDate ? '#00E5FF' : 'transparent',
                                                color: useCustomSellDate ? '#000' : '#666',
                                                fontWeight: useCustomSellDate ? 700 : 500,
                                                border: useCustomSellDate ? 'none' : '1px solid #333',
                                                transition: 'all 0.2s',
                                                '&:hover': { bgcolor: useCustomSellDate ? '#00E5FF' : 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            Custom sell date
                                        </Typography>
                                    </Box>

                                    {/* Conditional Sell Date Picker */}
                                    {useCustomSellDate && (
                                        <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                                            <CustomDatePicker
                                                value={sellDate}
                                                onChange={setSellDate}
                                                label="Sell Date"
                                                minDate={date}
                                            />
                                        </Box>
                                    )}
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                        <Typography
                                            onClick={() => setInputMode('shares')}
                                            sx={{
                                                cursor: 'pointer',
                                                color: inputMode === 'shares' ? '#fff' : '#666',
                                                fontWeight: inputMode === 'shares' ? 700 : 500,
                                                borderBottom: inputMode === 'shares' ? '2px solid #00E5FF' : 'none'
                                            }}
                                        >
                                            By Shares
                                        </Typography>
                                        <Typography
                                            onClick={() => setInputMode('amount')}
                                            sx={{
                                                cursor: 'pointer',
                                                color: inputMode === 'amount' ? '#fff' : '#666',
                                                fontWeight: inputMode === 'amount' ? 700 : 500,
                                                borderBottom: inputMode === 'amount' ? '2px solid #00E5FF' : 'none'
                                            }}
                                        >
                                            By Amount (₹)
                                        </Typography>
                                    </Box>

                                    {inputMode === 'shares' ? (
                                        <TextField
                                            label="Number of Shares"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={shares}
                                            onChange={(e) => {
                                                const s = e.target.value;
                                                setShares(s);
                                                if (priceAtDate && s) {
                                                    setAmount((parseFloat(s) * priceAtDate).toFixed(2));
                                                }
                                            }}
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            InputProps={{ style: { color: '#fff' } }}
                                            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } } }}
                                        />
                                    ) : (
                                        <TextField
                                            label="Investment Amount (₹)"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={amount}
                                            onChange={(e) => {
                                                const a = e.target.value;
                                                setAmount(a);
                                                if (priceAtDate && a) {
                                                    setShares((parseFloat(a) / priceAtDate).toFixed(4));
                                                }
                                            }}
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            InputProps={{
                                                style: { color: '#fff' },
                                                startAdornment: <Typography sx={{ color: '#666', mr: 1 }}>₹</Typography>
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } } }}
                                        />
                                    )}
                                </Box>

                                <Button
                                    onClick={handleCalculate}
                                    disabled={loading || !date || !ticker}
                                    variant="contained"
                                    sx={{
                                        py: 2,
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        '&:hover': { bgcolor: '#00B2CC' },
                                        '&.Mui-disabled': { bgcolor: '#222', color: '#666' }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Calculate Returns'}
                                </Button>
                                {error && <Typography color="error">{error}</Typography>}
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Result Section */}
                    <Box component={motion.div} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        {result ? (
                            <Card sx={{ bgcolor: '#0A0A0A', border: '1px solid #222', borderRadius: 4, height: '100%', position: 'relative', overflow: 'visible' }}>
                                {/* Glow Effect */}
                                <Box sx={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, bgcolor: result.pnl >= 0 ? '#10B981' : '#EF4444', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

                                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, height: '100%', justifyContent: 'center' }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="overline" sx={{ color: '#666', letterSpacing: '0.2em', fontWeight: 700 }}>NET PROFEIT / LOSS</Typography>
                                        <Typography variant="h1" sx={{ color: result.pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: { xs: '3rem', md: '4rem' }, letterSpacing: '-0.02em', my: 2 }}>
                                            {result.pnl >= 0 ? '+' : ''}₹{Math.abs(result.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </Typography>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 0.5, borderRadius: 2, bgcolor: result.pnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: result.pnl >= 0 ? '#10B981' : '#EF4444' }}>
                                            {result.pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>{result.pnl_percent.toFixed(2)}%</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderTop: '1px solid #222', pt: 4 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#666' }}>INVESTED VALUE</Typography>
                                            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{result.invested_value.toLocaleString()}</Typography>
                                            <Typography variant="caption" sx={{ color: '#444' }}>{result.shares} shares @ ₹{result.initial_price.toFixed(2)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#666' }}>CURRENT VALUE</Typography>
                                            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{result.current_value.toLocaleString()}</Typography>
                                            <Typography variant="caption" sx={{ color: '#444' }}>@ ₹{result.current_price.toFixed(2)} today</Typography>
                                        </Box>
                                    </Box>

                                    {/* Graph */}
                                    {result.history && result.history.length > 0 && (
                                        <Box sx={{ height: 200, mt: 2, width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={result.history}>
                                                    <defs>
                                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={result.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={result.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#666"
                                                        style={{ fontSize: '0.7rem' }}
                                                        tickLine={false}
                                                        interval={result.history.length > 20 ? 'preserveStartEnd' : 0}
                                                        angle={result.history.length > 10 ? -45 : 0}
                                                        textAnchor={result.history.length > 10 ? 'end' : 'middle'}
                                                        height={result.history.length > 10 ? 60 : 30}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Value']}
                                                        labelStyle={{ color: '#888' }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={result.pnl >= 0 ? '#10B981' : '#EF4444'}
                                                        fillOpacity={1}
                                                        fill="url(#colorValue)"
                                                        strokeWidth={2}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #222', borderRadius: 4, color: '#444', p: 4 }}>
                                <Typography variant="h6">Results will appear here</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

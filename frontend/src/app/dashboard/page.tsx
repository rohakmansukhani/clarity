'use client';

import { Box, Typography, Grid, Paper, IconButton, TextField, InputAdornment, Button, Tooltip } from '@mui/material';
import { Search, Bell, Settings, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, MessageSquare, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 6 }, pb: 4 }}>
            {/* Header: Minimal Greeting + Search */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: { xs: 4, md: 8 }, gap: { xs: 3, md: 0 } }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: '#fff', fontSize: { xs: '2rem', md: '3rem' } }}>
                        Good Evening, Rohak
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#666', fontWeight: 500 }}>
                        Market is <span style={{ color: '#10B981' }}>Bullish</span> today.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
                    <TextField
                        id="dashboard-search"
                        variant="standard"
                        placeholder="Search stocks..."
                        fullWidth
                        InputProps={{
                            disableUnderline: true,
                            startAdornment: <Search size={20} color="#666" style={{ marginRight: 10 }} />,
                            sx: {
                                fontSize: '1rem',
                                color: '#fff',
                                borderBottom: '1px solid #333',
                                pb: 0.5,
                                width: { xs: '100%', md: 250 },
                                transition: 'all 0.2s',
                                '&:hover': { borderBottom: '1px solid #666' },
                                '&.Mui-focused': { borderBottom: '1px solid #00E5FF', width: { xs: '100%', md: 300 } }
                            }
                        }}
                        onKeyDown={(e: any) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                                router.push(`/market/${e.target.value.trim().toUpperCase()}`);
                            }
                        }}
                    />
                    <IconButton sx={{ color: '#666', '&:hover': { color: '#fff' } }}><Bell size={20} /></IconButton>

                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#333', border: '1px solid #444', flexShrink: 0 }} />
                </Box>
            </Box>

            <Grid container spacing={{ xs: 3, md: 6 }}>
                {/* Left Col: Main Stats (Portfolio) */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>Market Overview</Typography>
                        <Grid container spacing={4}>
                            {[
                                { name: 'NIFTY 50', value: '21,817.45', change: '+0.5%', isUp: true },
                                { name: 'SENSEX', value: '72,400.10', change: '+0.3%', isUp: true },
                                { name: 'BANK NIFTY', value: '46,300.20', change: '-0.1%', isUp: false }
                            ].map((index) => (
                                <Grid size={{ xs: 12, sm: 4 }} key={index.name}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>{index.name}</Typography>
                                        <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, fontSize: '2.5rem' }}>{index.value}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {index.isUp ? <ArrowUpRight size={20} color="#10B981" /> : <ArrowDownRight size={20} color="#EF4444" />}
                                            <Typography variant="body1" sx={{ color: index.isUp ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                                {index.change}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Quick Actions Grid */}
                    <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>Quick Actions</Typography>
                    <Grid container spacing={3}>
                        <ActionCard
                            icon={Zap}
                            title="Analyze Stock"
                            desc="Get deep AI insights on any ticker"
                            onClick={() => router.push('/market')}
                            delay={0.1}
                        />
                        <ActionCard
                            icon={MessageSquare}
                            title="Ask Advisor"
                            desc="Chat with Clarity AI about strategy"
                            onClick={() => router.push('/advisor')}
                            delay={0.2}
                        />
                        <ActionCard
                            icon={PieChart}
                            title="Sector Heatmap"
                            desc="Identify leading & lagging sectors"
                            onClick={() => router.push('/market')} // Placeholder for now, or dedicated sector page
                            delay={0.3}
                        />
                    </Grid>
                </Grid>

                {/* Right Col: Top Movers */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 4,
                            bgcolor: '#0A0A0A',
                            border: '1px solid #222',
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative Background Glow */}
                        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, bgcolor: '#00E5FF', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%' }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <TrendingUp size={20} className="text-[#00E5FF]" />
                                Top Movers
                            </Typography>
                            <Button size="small" sx={{ color: '#666', textTransform: 'none', '&:hover': { color: '#fff' } }}>View All</Button>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[
                                { s: 'ADANIENT', p: '3,150.00', c: '+4.2%', u: true },
                                { s: 'TATAMOTORS', p: '945.50', c: '+2.8%', u: true },
                                { s: 'INFY', p: '1,650.20', c: '-1.5%', u: false },
                                { s: 'HDFCBANK', p: '1,420.00', c: '+0.8%', u: true },
                                { s: 'BAJFINANCE', p: '6,800.00', c: '-2.1%', u: false },
                            ].map((stock) => (
                                <MoverRow
                                    key={stock.s}
                                    symbol={stock.s}
                                    price={stock.p}
                                    change={stock.c}
                                    isUp={stock.u}
                                    onClick={() => router.push(`/market/${stock.s}`)}
                                />
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

function ActionCard({ icon: Icon, title, desc, onClick, delay }: any) {
    return (
        <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                onClick={onClick}
                sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: '#111',
                    border: '1px solid #222',
                    cursor: 'pointer',
                    height: '100%',
                    minHeight: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    '&:hover': {
                        borderColor: '#00E5FF',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 10px 30px -10px rgba(0, 229, 255, 0.1)'
                    }
                }}
            >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Icon size={20} color="#fff" />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>{desc}</Typography>
            </Paper>
        </Grid>
    );
}

function MarketRow({ name, value, change, isUp }: any) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{name}</Typography>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#ddd' }}>{value}</Typography>
                <Typography variant="caption" sx={{ color: isUp ? '#10B981' : '#EF4444', fontWeight: 600 }}>{change}</Typography>
            </Box>
        </Box>
    );
}

function MoverRow({ symbol, price, change, isUp, onClick }: any) {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', transform: 'translateX(4px)' }
            }}
        >
            <Box sx={{ display: 'flex', items: 'center', gap: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>
                    {symbol[0]}
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{symbol}</Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>NSE</Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>₹{price}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {isUp ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
                    <Typography variant="caption" sx={{ color: isUp ? '#10B981' : '#EF4444', fontWeight: 700 }}>{change}</Typography>
                </Box>
            </Box>
        </Box>
    );
}

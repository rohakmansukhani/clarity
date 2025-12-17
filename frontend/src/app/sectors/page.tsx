'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, IconButton, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Layers } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';

interface SectorData {
    sector: string;
    current: number;
    percent_change: number;
}

export default function SectorsPage() {
    const router = useRouter();
    const [sectors, setSectors] = useState<SectorData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSectors = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/market/sectors');
            if (res.ok) {
                const data = await res.json();
                setSectors(data);
            } else {
                throw new Error("API Failed");
            }
        } catch (error) {
            console.log("Using Mock Data for Sectors");
            // Fallback Mock Data
            setSectors([
                { sector: "NIFTY IT", current: 35400.20, percent_change: 1.2 },
                { sector: "NIFTY BANK", current: 46500.00, percent_change: 0.5 },
                { sector: "NIFTY AUTO", current: 18200.50, percent_change: -0.8 },
                { sector: "NIFTY PHARMA", current: 15600.10, percent_change: 2.1 },
                { sector: "NIFTY FMCG", current: 54300.75, percent_change: -0.3 },
                { sector: "NIFTY METAL", current: 7800.40, percent_change: -1.5 },
                { sector: "NIFTY REALTY", current: 890.30, percent_change: 3.4 },
                { sector: "NIFTY ENERGY", current: 34500.60, percent_change: 0.1 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSectors();
    }, []);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                    <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                            Sector Heatmap <Layers className="text-[#00E5FF]" size={32} />
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#666' }}>
                            Real-time performance across major market sectors.
                        </Typography>
                    </Box>
                    <IconButton onClick={fetchSectors} sx={{ color: '#666', '&:hover': { color: '#fff' } }}>
                        <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
                    </IconButton>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                        <CircularProgress sx={{ color: '#333' }} />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {sectors.map((sector, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={sector.sector}>
                                <SectorCard data={sector} index={index} />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        </Box>
    );
}

function SectorCard({ data, index }: { data: SectorData, index: number }) {
    const isPositive = data.percent_change >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: '#0A0A0A',
                    border: '1px solid',
                    borderColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                        borderColor: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        bgcolor: '#111'
                    }
                }}
            >
                {/* Background Glow */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        filter: 'blur(80px)',
                        opacity: 0.15,
                        bgcolor: isPositive ? '#10B981' : '#EF4444'
                    }}
                />

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, mb: 1, letterSpacing: '0.05em' }}>
                        {data.sector}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {data.current.toLocaleString()}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                            {isPositive ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-red-500" />}
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isPositive ? '#10B981' : '#EF4444' }}>
                                {Math.abs(data.percent_change)}%
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </motion.div>
    );
}

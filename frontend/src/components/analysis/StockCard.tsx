import { Paper, Box, Typography, IconButton, Skeleton, useTheme } from '@mui/material';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StockCardProps {
    symbol: string;
    companyName?: string;
    stockData?: {
        price: string;
        change: string;
        up: boolean;
    };
    isComparing: boolean;
    onRemove: () => void;
}

export function StockCard({ symbol, companyName, stockData, isComparing, onRemove }: StockCardProps) {
    const theme = useTheme();

    return (
        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 4,
                        height: { xs: 180, md: 240 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': {
                            transform: 'scale(1.02)',
                            bgcolor: theme.palette.mode === 'dark' ? '#151515' : '#F1F5F9',
                            borderColor: theme.palette.text.secondary,
                            boxShadow: theme.palette.mode === 'light' ? '0 10px 30px rgba(0,0,0,0.05)' : 'none'
                        }
                    }}
                >
                    {!isComparing && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                color: theme.palette.text.secondary,
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                '&:hover': { color: '#fff', bgcolor: theme.palette.error.main }
                            }}
                            size="small"
                        >
                            <X size={14} />
                        </IconButton>
                    )}

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', p: 3 }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                                color: theme.palette.text.primary,
                                letterSpacing: '-0.02em',
                                fontSize: symbol.length > 8 ? '1.5rem' : symbol.length > 6 ? '1.75rem' : '2rem',
                                textAlign: 'center',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                lineHeight: 1.2
                            }}
                        >
                            {symbol}
                        </Typography>

                        {stockData ? (
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: isComparing ? '1.5rem' : '2rem', letterSpacing: '-0.03em', mb: 1 }}>{stockData.price}</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: '99px', bgcolor: stockData.up ? `${theme.palette.success.main}15` : `${theme.palette.error.main}15` }}>
                                    {stockData.up ? <TrendingUp size={12} color={theme.palette.success.main} /> : <TrendingDown size={12} color={theme.palette.error.main} />}
                                    <Typography variant="caption" sx={{ color: stockData.up ? theme.palette.success.main : theme.palette.error.main, fontWeight: 700 }}>{stockData.change}</Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', textAlign: 'center' }}>
                                <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#E2E8F0', mx: 'auto', mb: 1 }} />
                                <Skeleton variant="rectangular" width={80} height={24} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#E2E8F0', mx: 'auto', borderRadius: '99px' }} />
                            </Box>
                        )}
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
}

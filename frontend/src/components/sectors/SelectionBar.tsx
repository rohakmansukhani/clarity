'use client';

import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, TrendingUp, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

interface SelectionBarProps {
    selectedStocks: string[];
    onRemove: (symbol: string) => void;
    onClear: () => void;
    onNext: () => void;
    maxStocks?: number;
}

export default function SelectionBar({ selectedStocks, onRemove, onClear, onNext, maxStocks = 5 }: SelectionBarProps) {
    const theme = useTheme();
    const { mode } = useColorMode();
    if (selectedStocks.length === 0) return null;

    const isValid = selectedStocks.length >= 2;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000
                }}
            >
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: { xs: '90%', md: '800px' },
                        bgcolor: 'background.paper',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: '24px',
                        p: { xs: 2, md: 3 },
                        boxShadow: mode === 'dark' ? '0 20px 40px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'center',
                        gap: 3
                    }}
                >
                    {/* Selected Stocks */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                Selected Stocks ({selectedStocks.length}/{maxStocks})
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                {isValid ? 'Ready to build portfolio' : `Select ${2 - selectedStocks.length} more stock${2 - selectedStocks.length > 1 ? 's' : ''}`}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {selectedStocks.map((symbol) => (
                                <Box
                                    key={symbol}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: '8px',
                                        bgcolor: 'primary.main' + '1A',
                                        border: '1px solid',
                                        borderColor: 'primary.main',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                        {symbol}
                                    </Typography>
                                    <Box
                                        onClick={() => onRemove(symbol)}
                                        sx={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'primary.main',
                                            '&:hover': { color: theme.palette.primary.light }
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <Button
                            variant="outlined"
                            onClick={onClear}
                            sx={{
                                borderColor: 'divider',
                                color: 'text.secondary',
                                '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
                            }}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="contained"
                            onClick={onNext}
                            disabled={!isValid}
                            sx={{
                                bgcolor: 'primary.main',
                                color: theme.palette.primary.contrastText,
                                fontWeight: 700,
                                px: 3,
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark
                                },
                                '&:disabled': {
                                    bgcolor: 'action.disabledBackground',
                                    color: 'action.disabled'
                                }
                            }}
                            endIcon={<ChevronRight size={20} />}
                        >
                            Build Portfolio
                        </Button>
                    </Box>
                </Box>
            </motion.div>
        </AnimatePresence>
    );
}

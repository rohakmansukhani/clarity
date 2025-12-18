'use client';

import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SelectionBarProps {
    selectedStocks: string[];
    onRemove: (symbol: string) => void;
    onContinue: () => void;
    onCompare: () => void;
    onBacktrack: () => void;
}

export default function SelectionBar({ selectedStocks, onRemove, onContinue, onCompare, onBacktrack }: SelectionBarProps) {
    if (selectedStocks.length === 0) return null;

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
                <Paper
                    sx={{
                        p: 3,
                        bgcolor: '#0A0A0A',
                        borderTop: '2px solid #00E5FF',
                        borderRadius: 0,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <Box sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                    }}>
                        {/* Selected Stocks */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#666', fontWeight: 600 }}>
                                Selected ({selectedStocks.length}/5):
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {selectedStocks.map((symbol) => (
                                    <Box
                                        key={symbol}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            px: 2,
                                            py: 1,
                                            borderRadius: 2,
                                            bgcolor: '#00E5FF20',
                                            border: '1px solid #00E5FF'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: '#00E5FF', fontWeight: 600 }}>
                                            {symbol}
                                        </Typography>
                                        <Box
                                            onClick={() => onRemove(symbol)}
                                            sx={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#00E5FF',
                                                '&:hover': { color: '#fff' }
                                            }}
                                        >
                                            <X size={14} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={onBacktrack}
                                disabled={selectedStocks.length === 0}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#8B5CF6',
                                        color: '#8B5CF6',
                                        bgcolor: 'rgba(139, 92, 246, 0.05)'
                                    },
                                    '&:disabled': {
                                        borderColor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Backtrack
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={onCompare}
                                disabled={selectedStocks.length < 2}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#00E5FF',
                                        color: '#00E5FF',
                                        bgcolor: 'rgba(0, 229, 255, 0.05)'
                                    },
                                    '&:disabled': {
                                        borderColor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Compare Stocks
                            </Button>
                            <Button
                                variant="contained"
                                onClick={onContinue}
                                disabled={selectedStocks.length < 2}
                                sx={{
                                    bgcolor: '#00E5FF',
                                    color: '#000',
                                    fontWeight: 700,
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: '#00D4E6'
                                    },
                                    '&:disabled': {
                                        bgcolor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Build Portfolio ({selectedStocks.length})
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </motion.div>
        </AnimatePresence>
    );
}

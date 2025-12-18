'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Zap } from 'lucide-react';

interface HorizonSelectorProps {
    value: 'short' | 'medium' | 'long' | null;
    onChange: (value: 'short' | 'medium' | 'long') => void;
    onNext: () => void;
}

const HORIZONS = [
    {
        value: 'short' as const,
        label: 'Short Term',
        subtitle: '< 1 year',
        icon: Zap,
        color: '#F59E0B',
        description: 'Quick gains, higher volatility'
    },
    {
        value: 'medium' as const,
        label: 'Medium Term',
        subtitle: '1-3 years',
        icon: TrendingUp,
        color: '#00E5FF',
        description: 'Balanced growth & stability'
    },
    {
        value: 'long' as const,
        label: 'Long Term',
        subtitle: '3+ years',
        icon: Clock,
        color: '#10B981',
        description: 'Wealth building, compounding'
    }
];

export default function HorizonSelector({ value, onChange, onNext }: HorizonSelectorProps) {
    const handleSelect = (horizon: 'short' | 'medium' | 'long') => {
        onChange(horizon);
        // Auto-advance after selection
        setTimeout(() => onNext(), 500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {HORIZONS.map((horizon, index) => {
                    const Icon = horizon.icon;
                    const isSelected = value === horizon.value;

                    return (
                        <motion.div
                            key={horizon.value}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ flex: 1 }}
                        >
                            <Button
                                onClick={() => handleSelect(horizon.value)}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: 180,
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: isSelected ? `${horizon.color}20` : '#0A0A0A',
                                    border: isSelected ? `2px solid ${horizon.color}` : '1px solid #222',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: horizon.color,
                                        bgcolor: `${horizon.color}10`,
                                        '& .icon-box': {
                                            bgcolor: horizon.color,
                                            transform: 'scale(1.1)'
                                        }
                                    }
                                }}
                            >
                                {/* Background Glow */}
                                {isSelected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -50,
                                            right: -50,
                                            width: 150,
                                            height: 150,
                                            borderRadius: '50%',
                                            filter: 'blur(60px)',
                                            opacity: 0.3,
                                            bgcolor: horizon.color
                                        }}
                                    />
                                )}

                                {/* Icon */}
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 3,
                                        bgcolor: isSelected ? horizon.color : 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    <Icon size={28} color={isSelected ? '#000' : horizon.color} />
                                </Box>

                                {/* Content */}
                                <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: isSelected ? horizon.color : '#fff',
                                            mb: 0.5
                                        }}
                                    >
                                        {horizon.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#666',
                                            display: 'block',
                                            mb: 1
                                        }}
                                    >
                                        {horizon.subtitle}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#888',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {horizon.description}
                                    </Typography>
                                </Box>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: horizon.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2
                                        }}
                                    >
                                        <Typography sx={{ color: '#000', fontSize: '0.75rem', fontWeight: 700 }}>
                                            ✓
                                        </Typography>
                                    </motion.div>
                                )}
                            </Button>
                        </motion.div>
                    );
                })}
            </Box>
        </motion.div>
    );
}

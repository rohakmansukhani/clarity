'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Shield, BarChart3, Rocket } from 'lucide-react';

interface RiskProfileCardsProps {
    value: 'conservative' | 'balanced' | 'aggressive' | null;
    onChange: (value: 'conservative' | 'balanced' | 'aggressive') => void;
    onNext: () => void;
}

const RISK_PROFILES = [
    {
        value: 'conservative' as const,
        label: 'Conservative',
        icon: Shield,
        color: '#10B981',
        traits: ['Low volatility', 'Stable returns', 'Capital preservation'],
        description: 'Minimize risk, steady growth'
    },
    {
        value: 'balanced' as const,
        label: 'Balanced',
        icon: BarChart3,
        color: '#00E5FF',
        traits: ['Moderate risk', 'Balanced gains', 'Diversified approach'],
        description: 'Growth with controlled risk'
    },
    {
        value: 'aggressive' as const,
        label: 'Aggressive',
        icon: Rocket,
        color: '#F59E0B',
        traits: ['High growth', 'Accept swings', 'Maximum returns'],
        description: 'High risk, high reward'
    }
];

export default function RiskProfileCards({ value, onChange, onNext }: RiskProfileCardsProps) {
    const handleSelect = (profile: 'conservative' | 'balanced' | 'aggressive') => {
        onChange(profile);
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
                {RISK_PROFILES.map((profile, index) => {
                    const Icon = profile.icon;
                    const isSelected = value === profile.value;

                    return (
                        <motion.div
                            key={profile.value}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ flex: 1 }}
                        >
                            <Button
                                onClick={() => handleSelect(profile.value)}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: 220,
                                    p: 4,
                                    borderRadius: 4,
                                    bgcolor: isSelected ? `${profile.color}20` : '#0A0A0A',
                                    border: isSelected ? `2px solid ${profile.color}` : '1px solid #222',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    justifyContent: 'flex-start',
                                    gap: 2,
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    textAlign: 'left',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: profile.color,
                                        bgcolor: `${profile.color}10`,
                                        '& .icon-box': {
                                            bgcolor: profile.color,
                                            transform: 'rotate(10deg) scale(1.1)'
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
                                            bgcolor: profile.color
                                        }}
                                    />
                                )}

                                {/* Icon */}
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 3,
                                        bgcolor: isSelected ? profile.color : 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        zIndex: 1,
                                        mb: 1
                                    }}
                                >
                                    <Icon size={26} color={isSelected ? '#000' : profile.color} />
                                </Box>

                                {/* Content */}
                                <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: isSelected ? profile.color : '#fff',
                                            mb: 0.5
                                        }}
                                    >
                                        {profile.label}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#888',
                                            fontSize: '0.85rem',
                                            mb: 2
                                        }}
                                    >
                                        {profile.description}
                                    </Typography>

                                    {/* Traits */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {profile.traits.map((trait, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 4,
                                                        height: 4,
                                                        borderRadius: '50%',
                                                        bgcolor: isSelected ? profile.color : '#666'
                                                    }}
                                                />
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: isSelected ? '#fff' : '#666',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    {trait}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
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
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            backgroundColor: profile.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2
                                        }}
                                    >
                                        <Typography sx={{ color: '#000', fontSize: '0.875rem', fontWeight: 700 }}>
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

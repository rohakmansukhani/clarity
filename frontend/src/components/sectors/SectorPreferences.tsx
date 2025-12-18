'use client';

import React from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { Code, Cloud, Shield as ShieldIcon, Cpu, Database, Smartphone } from 'lucide-react';

interface SectorPreferencesProps {
    sector: string;
    value: string[];
    onChange: (value: string[]) => void;
    onNext: () => void;
    onSkip: () => void;
}

// Sector-specific sub-categories
const SECTOR_CATEGORIES: Record<string, Array<{ label: string; icon: any }>> = {
    'NIFTY IT': [
        { label: 'IT Services', icon: Code },
        { label: 'Software Products', icon: Cpu },
        { label: 'Cloud Infrastructure', icon: Cloud },
        { label: 'Cybersecurity', icon: ShieldIcon },
        { label: 'Data Analytics', icon: Database }
    ],
    'NIFTY BANK': [
        { label: 'Private Banks', icon: Code },
        { label: 'PSU Banks', icon: Cpu },
        { label: 'NBFCs', icon: Cloud },
        { label: 'Digital Banking', icon: ShieldIcon }
    ],
    'NIFTY PHARMA': [
        { label: 'Generic Drugs', icon: Code },
        { label: 'Specialty Pharma', icon: Cpu },
        { label: 'Biotech', icon: Cloud },
        { label: 'API Manufacturers', icon: ShieldIcon }
    ],
    'DEFAULT': [
        { label: 'Large Cap', icon: Code },
        { label: 'Mid Cap', icon: Cpu },
        { label: 'Small Cap', icon: Cloud },
        { label: 'Blue Chip', icon: ShieldIcon }
    ]
};

export default function SectorPreferences({ sector, value, onChange, onNext, onSkip }: SectorPreferencesProps) {
    const categories = SECTOR_CATEGORIES[sector] || SECTOR_CATEGORIES['DEFAULT'];

    const handleToggle = (category: string) => {
        if (value.includes(category)) {
            onChange(value.filter(v => v !== category));
        } else {
            onChange([...value, category]);
        }
    };

    const handleContinue = () => {
        if (value.length > 0) {
            onNext();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box>
                <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>
                    Select one or more areas of interest (optional)
                </Typography>

                {/* Category Chips */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                    {categories.map((category, index) => {
                        const Icon = category.icon;
                        const isSelected = value.includes(category.label);

                        return (
                            <motion.div
                                key={category.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Chip
                                    icon={<Icon size={16} />}
                                    label={category.label}
                                    onClick={() => handleToggle(category.label)}
                                    sx={{
                                        px: 2,
                                        py: 2.5,
                                        height: 'auto',
                                        borderRadius: 3,
                                        bgcolor: isSelected ? '#00E5FF20' : '#0A0A0A',
                                        color: isSelected ? '#00E5FF' : '#666',
                                        border: isSelected ? '2px solid #00E5FF' : '1px solid #333',
                                        fontWeight: isSelected ? 700 : 500,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        '& .MuiChip-icon': {
                                            color: isSelected ? '#00E5FF' : '#666'
                                        },
                                        '&:hover': {
                                            bgcolor: isSelected ? '#00E5FF30' : 'rgba(255,255,255,0.05)',
                                            borderColor: isSelected ? '#00E5FF' : '#555',
                                            color: isSelected ? '#00E5FF' : '#fff',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    })}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        fullWidth
                        onClick={onSkip}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            bgcolor: 'transparent',
                            color: '#666',
                            border: '1px solid #333',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderColor: '#555',
                                color: '#fff'
                            }
                        }}
                    >
                        Skip
                    </Button>
                    <Button
                        fullWidth
                        onClick={handleContinue}
                        disabled={value.length === 0}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            bgcolor: value.length > 0 ? '#00E5FF' : '#222',
                            color: value.length > 0 ? '#000' : '#666',
                            fontWeight: 700,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: value.length > 0 ? '#00D4E6' : '#222',
                                transform: value.length > 0 ? 'translateY(-2px)' : 'none'
                            },
                            '&:disabled': {
                                bgcolor: '#222',
                                color: '#666'
                            }
                        }}
                    >
                        Continue ({value.length} selected)
                    </Button>
                </Box>
            </Box>
        </motion.div>
    );
}

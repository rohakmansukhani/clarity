'use client';

import React from 'react';
import { Box, Button, TextField, InputAdornment, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface BudgetInputProps {
    value: number;
    onChange: (value: number) => void;
    onNext: () => void;
}

const QUICK_SELECT_AMOUNTS = [25000, 50000, 100000, 250000];

export default function BudgetInput({ value, onChange, onNext }: BudgetInputProps) {
    const [customInput, setCustomInput] = React.useState(value > 0 ? value.toString() : '');

    const handleQuickSelect = (amount: number) => {
        onChange(amount);
        setCustomInput(amount.toString());
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setCustomInput(val);
        const numVal = parseInt(val) || 0;
        onChange(numVal);
    };

    const handleNext = () => {
        if (value >= 10000) {
            onNext();
        }
    };

    const isValid = value >= 10000 && value <= 10000000;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box>
                {/* Quick Select Chips */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    {QUICK_SELECT_AMOUNTS.map((amount) => (
                        <Button
                            key={amount}
                            onClick={() => handleQuickSelect(amount)}
                            variant={value === amount ? 'contained' : 'outlined'}
                            sx={{
                                px: 3,
                                py: 1.5,
                                borderRadius: 3,
                                bgcolor: value === amount ? '#00E5FF' : 'transparent',
                                color: value === amount ? '#000' : '#666',
                                border: value === amount ? 'none' : '1px solid #333',
                                fontWeight: value === amount ? 700 : 500,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: value === amount ? '#00E5FF' : 'rgba(255,255,255,0.05)',
                                    color: value === amount ? '#000' : '#fff',
                                    borderColor: value === amount ? 'transparent' : '#555'
                                }
                            }}
                        >
                            {amount >= 100000 ? `₹${amount / 100000}L` : `₹${amount / 1000}K`}
                        </Button>
                    ))}
                </Box>

                {/* Custom Input */}
                <TextField
                    fullWidth
                    value={customInput}
                    onChange={handleCustomChange}
                    placeholder="Enter amount (₹)"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Typography sx={{ color: '#666', ml: 0.5, fontWeight: 700 }}>₹</Typography>
                            </InputAdornment>
                        ),
                        sx: {
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            color: '#fff',
                            bgcolor: '#0A0A0A',
                            borderRadius: 3,
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#333'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#555'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#00E5FF'
                            }
                        }
                    }}
                />

                {/* Validation Message */}
                <Box sx={{ mt: 2, minHeight: 24 }}>
                    {value > 0 && value < 10000 && (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>
                            Minimum investment: ₹10,000
                        </Typography>
                    )}
                    {value > 1000000 && (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>
                            Maximum investment: ₹10,00,000
                        </Typography>
                    )}
                    {isValid && (
                        <Typography variant="caption" sx={{ color: '#10B981' }}>
                            ✓ Perfect! ₹{value.toLocaleString()} is a great starting point.
                        </Typography>
                    )}
                </Box>

                {/* Next Button */}
                <Button
                    fullWidth
                    onClick={handleNext}
                    disabled={!isValid}
                    sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: 3,
                        bgcolor: isValid ? '#00E5FF' : '#222',
                        color: isValid ? '#000' : '#666',
                        fontWeight: 700,
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: isValid ? '#00D4E6' : '#222',
                            transform: isValid ? 'translateY(-2px)' : 'none'
                        },
                        '&:disabled': {
                            bgcolor: '#222',
                            color: '#666'
                        }
                    }}
                >
                    Continue
                </Button>
            </Box>
        </motion.div>
    );
}

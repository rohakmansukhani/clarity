'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, TextField, InputAdornment, Paper, List, ListItem, ListItemButton, Typography, useTheme } from '@mui/material';
import { Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketService } from '@/services/marketService';

interface StockSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (stock: any) => void;
    variant?: 'hero' | 'standard';
    placeholder?: string;
    autoFocus?: boolean;
}

export default function StockSearchInput({
    value,
    onChange,
    onSelect,
    variant = 'standard',
    placeholder = 'Search stocks...',
    autoFocus = false
}: StockSearchInputProps) {
    const theme = useTheme();
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOptions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = async (query: string) => {
        onChange(query);
        if (query.length > 1) {
            setLoading(true);
            try {
                const results = await marketService.searchStocks(query);
                setOptions(results || []);
            } catch (err) {
                console.error(err);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        } else {
            setOptions([]);
        }
    };

    const isHero = variant === 'hero';

    return (
        <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%' }}>
            <TextField
                fullWidth
                variant={isHero ? "standard" : "outlined"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus={autoFocus}
                InputProps={{
                    ...(isHero ? { disableUnderline: true } : {}),
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search
                                size={isHero ? 28 : 20}
                                color={isHero ? (value ? theme.palette.text.primary : theme.palette.text.secondary) : theme.palette.text.secondary}
                            />
                        </InputAdornment>
                    ),
                    sx: isHero ? {
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        py: 2,
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        transition: 'all 0.3s',
                        '&.Mui-focused': {
                            borderBottom: `2px solid ${theme.palette.primary.main}`
                        }
                    } : {
                        color: theme.palette.text.primary,
                        bgcolor: theme.palette.background.paper,
                        borderRadius: 2,
                        '& fieldset': { borderColor: theme.palette.divider },
                        '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }
                    }
                }}
            />

            <AnimatePresence>
                {options.length > 0 && (
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: isHero ? 10 : -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isHero ? 10 : -5 }}
                        elevation={8}
                        sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: isHero ? 2 : 1,
                            maxHeight: 300,
                            overflow: 'auto',
                            borderRadius: 3,
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            zIndex: 1000,
                            boxShadow: theme.palette.mode === 'light' ? '0 4px 20px rgba(0,0,0,0.08)' : 'none'
                        }}
                    >
                        <List disablePadding>
                            {options.map((item: any) => (
                                <ListItem key={item.symbol} disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            onChange(item.symbol);
                                            onSelect(item);
                                            setOptions([]);
                                        }}
                                        sx={{
                                            py: isHero ? 2.5 : 1.5,
                                            px: isHero ? 3 : 2,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            '&:hover': { bgcolor: `${theme.palette.primary.main}10` }
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: isHero ? '1.1rem' : '0.95rem', color: theme.palette.text.primary }}>
                                                {item.symbol}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: isHero ? '0.875rem' : '0.75rem' }}>
                                                {item.name}
                                            </Typography>
                                        </Box>
                                        {isHero && <ArrowRight size={20} color={theme.palette.text.secondary} />}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </AnimatePresence>
        </Box>
    );
}

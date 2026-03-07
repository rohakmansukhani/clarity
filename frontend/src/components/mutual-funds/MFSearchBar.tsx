import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, Paper, List, ListItem, ListItemButton, ListItemText, Typography, CircularProgress, useTheme } from '@mui/material';
import { Search } from 'lucide-react';
import { MutualFundSearchResult, mutualFundService } from '@/services/mutualFundService';
import { useColorMode } from '@/theme/ThemeContext';

interface MFSearchBarProps {
    onSelect: (item: MutualFundSearchResult) => void;
    placeholder?: string;
    variant?: 'hero' | 'header';
    autoFocus?: boolean;
}

export default function MFSearchBar({ onSelect, placeholder = 'Search Mutual Funds...', variant = 'header', autoFocus = false }: MFSearchBarProps) {
    const theme = useTheme();
    const { mode } = useColorMode();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MutualFundSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const isHero = variant === 'hero';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 3) {
                setResults([]);
                setOpen(false);
                return;
            }

            setLoading(true);
            setOpen(true);
            try {
                const data = await mutualFundService.searchFunds(query);
                setResults(data.slice(0, 8)); // Show top 8
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%', zIndex: 10 }}>
            <TextField
                fullWidth
                autoFocus={autoFocus}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={() => { if (query.length >= 3) setOpen(true); }}
                placeholder={placeholder}
                variant="outlined"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search size={isHero ? 24 : 20} color={theme.palette.text.secondary} />
                        </InputAdornment>
                    ),
                    endAdornment: loading && (
                        <InputAdornment position="end">
                            <CircularProgress size={20} />
                        </InputAdornment>
                    )
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
                        borderRadius: isHero ? 4 : 2,
                        minHeight: isHero ? 64 : 48,
                        fontSize: isHero ? '1.2rem' : '1rem',
                        transition: 'all 0.3s',
                        boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        '& fieldset': {
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: theme.palette.primary.main,
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: theme.palette.primary.main,
                            borderWidth: 2,
                        }
                    }
                }}
            />

            {open && (query.length >= 3) && (
                <Paper
                    elevation={mode === 'dark' ? 0 : 4}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        mt: 1,
                        maxHeight: 400,
                        overflow: 'auto',
                        borderRadius: 2,
                        bgcolor: mode === 'dark' ? '#1E1E1E' : '#fff',
                        border: `1px solid ${theme.palette.divider}`,
                        zIndex: 20
                    }}
                >
                    <List disablePadding>
                        {loading && results.length === 0 ? (
                            <ListItem>
                                <ListItemText primary={<Typography color="text.secondary" variant="body2">Searching...</Typography>} />
                            </ListItem>
                        ) : results.length > 0 ? (
                            results.map((item) => (
                                <ListItemButton
                                    key={item.schemeCode}
                                    onClick={() => {
                                        setOpen(false);
                                        setQuery('');
                                        onSelect(item);
                                    }}
                                    sx={{ py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}
                                >
                                    <Box sx={{ width: '100%' }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                            {item.schemeName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                            Code: {item.schemeCode}
                                        </Typography>
                                    </Box>
                                </ListItemButton>
                            ))
                        ) : (
                            <ListItem>
                                <ListItemText primary={<Typography color="text.secondary" variant="body2">No mutual funds found</Typography>} />
                            </ListItem>
                        )}
                    </List>
                </Paper>
            )}
        </Box>
    );
}

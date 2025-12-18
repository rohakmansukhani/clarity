import React from 'react';
import { Paper, TextField, InputAdornment, CircularProgress, List, ListItem, ListItemButton, Box, Typography } from '@mui/material';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StockSearchBarProps {
    search: string;
    searchResults: any[];
    searchLoading: boolean;
    disabled: boolean;
    onSearchChange: (value: string) => void;
    onSelectStock: (symbol: string, name: string) => void;
}

export function StockSearchBar({ search, searchResults, searchLoading, disabled, onSearchChange, onSelectStock }: StockSearchBarProps) {
    return (
        <Box sx={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 10 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 0.5,
                    pl: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '24px',
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    '&:focus-within': { borderColor: '#00E5FF', boxShadow: '0 0 0 2px rgba(0, 229, 255, 0.1)' }
                }}
            >
                <TextField
                    fullWidth
                    variant="standard"
                    placeholder={disabled ? "Slots full" : "Search stocks (e.g. TCS)..."}
                    disabled={disabled}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        disableUnderline: true,
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={20} color={search ? "#fff" : "#666"} />
                            </InputAdornment>
                        ),
                        endAdornment: searchLoading ? <CircularProgress size={20} sx={{ color: '#666' }} /> : null,
                        sx: { color: '#fff', fontSize: '1rem', fontWeight: 500, px: 2, py: 1.5 }
                    }}
                />
            </Paper>

            {/* Search Results Dropdown */}
            <AnimatePresence>
                {searchResults.length > 0 && (
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: 1,
                            borderRadius: 3,
                            overflow: 'hidden',
                            bgcolor: '#0A0A0A',
                            border: '1px solid #222',
                            zIndex: 20,
                            maxHeight: 300,
                            overflowY: 'auto'
                        }}
                    >
                        <List>
                            {searchResults.map((item: any) => (
                                <ListItem key={item.symbol} disablePadding>
                                    <ListItemButton
                                        onClick={() => onSelectStock(item.symbol, item.name)}
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            borderBottom: '1px solid #1a1a1a',
                                            '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.05)' }
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, color: '#fff' }}>{item.symbol}</Typography>
                                            <Typography variant="body2" sx={{ color: '#666' }}>{item.name}</Typography>
                                        </Box>
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

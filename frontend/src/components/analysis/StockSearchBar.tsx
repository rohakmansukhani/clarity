import { Paper, TextField, InputAdornment, CircularProgress, List, ListItem, ListItemButton, Box, Typography, useTheme } from '@mui/material';
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
    const theme = useTheme();

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
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.3s',
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 20px rgba(0,0,0,0.05)' : '0 4px 20px rgba(0,0,0,0.4)',
                    '&:focus-within': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 2px ${theme.palette.primary.main}15`
                    }
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
                                <Search size={20} color={search ? theme.palette.text.primary : theme.palette.text.secondary} />
                            </InputAdornment>
                        ),
                        endAdornment: searchLoading ? <CircularProgress size={20} sx={{ color: theme.palette.text.secondary }} /> : null,
                        sx: { color: theme.palette.text.primary, fontSize: '1rem', fontWeight: 500, px: 2, py: 1.5 }
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
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
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
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            '&:hover': { bgcolor: `${theme.palette.primary.main}10` }
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{item.symbol}</Typography>
                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{item.name}</Typography>
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

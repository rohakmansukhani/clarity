'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Chip,
    Switch,
    FormControlLabel
} from '@mui/material';
import { Eye, Plus, X } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';

interface AddToWatchlistModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: (ticker: string, options: {
        target_price?: number;
        notes?: string;
        tags?: string[];
        rsi_alert?: boolean;
    }) => Promise<void>;
    initialTicker?: string;
}

const AVAILABLE_TAGS = ['High Conviction', 'Swing', 'Long Term', 'Speculative', 'Value', 'Growth', 'Dividend'];

export default function AddToWatchlistModal({ open, onClose, onAdd, initialTicker = '' }: AddToWatchlistModalProps) {
    const [ticker, setTicker] = useState(initialTicker);
    const [targetPrice, setTargetPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [rsiAlert, setRsiAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newTag, setNewTag] = useState('');

    const handleClose = () => {
        setTicker(initialTicker);
        setTargetPrice('');
        setNotes('');
        setSelectedTags([]);
        setRsiAlert(false);
        onClose();
    };

    const handleSubmit = async () => {
        // Validation: Target Price is MANDATORY as per user request
        if (!ticker.trim() || !targetPrice) return;

        setIsLoading(true);
        try {
            await onAdd(ticker, {
                target_price: parseFloat(targetPrice),
                notes: notes || undefined,
                tags: selectedTags,
                rsi_alert: rsiAlert
            });
            handleClose();
        } catch (e) {
            console.error('Failed to add to watchlist:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    const handleKeyAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            if (!selectedTags.includes(newTag.trim())) {
                setSelectedTags(prev => [...prev, newTag.trim()]);
            }
            setNewTag('');
        }
    };

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            color: '#fff',
            bgcolor: '#111',
            '& fieldset': { borderColor: '#333' },
            '&:hover fieldset': { borderColor: '#555' },
            '&.Mui-focused fieldset': { borderColor: '#00E5FF' },
        },
        '& .MuiInputLabel-root': { color: '#666' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#00E5FF' },
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0B0B0B',
                    border: '1px solid #333',
                    borderRadius: 4,
                    minWidth: { xs: '90%', sm: 550 },
                    backgroundImage: 'none',
                }
            }}
        >
            <DialogTitle sx={{ color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, p: 3, pb: 1 }}>
                <Eye size={24} color="#00E5FF" />
                Add to Buy List
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {!initialTicker && (
                        <Box>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                                STOCK
                            </Typography>
                            <StockSearchInput
                                value={ticker}
                                onChange={setTicker}
                                onSelect={(item) => setTicker(item.symbol)}
                                placeholder="Search symbol (e.g. RELIANCE)..."
                            />
                        </Box>
                    )}

                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                            ENTRY STRATEGY (MANDATORY)
                        </Typography>
                        <TextField
                            label="Target Entry Price (₹)"
                            type="number"
                            fullWidth
                            required
                            variant="outlined"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="At what price will you buy?"
                            sx={fieldSx}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                            INVESTMENT THESIS (THE "WHY")
                        </Typography>
                        <TextField
                            label="Why are you watching this?"
                            multiline
                            rows={3}
                            fullWidth
                            variant="outlined"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Strong Q3 expected, undervalued vs peers..."
                            sx={fieldSx}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                            TAGS
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                            {AVAILABLE_TAGS.map(tag => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    onClick={() => toggleTag(tag)}
                                    size="small"
                                    sx={{
                                        bgcolor: selectedTags.includes(tag) ? 'rgba(0, 229, 255, 0.2)' : '#1A1A1A',
                                        color: selectedTags.includes(tag) ? '#00E5FF' : '#888',
                                        border: '1px solid',
                                        borderColor: selectedTags.includes(tag) ? '#00E5FF' : '#333',
                                        fontWeight: 600,
                                        '&:hover': { bgcolor: selectedTags.includes(tag) ? 'rgba(0, 229, 255, 0.3)' : '#222' }
                                    }}
                                />
                            ))}
                        </Box>
                        <TextField
                            placeholder="Add custom tag + Enter"
                            size="small"
                            fullWidth
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleKeyAddTag}
                            sx={{ ...fieldSx, '& .MuiInputBase-root': { height: 40 } }}
                        />
                        {selectedTags.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                {selectedTags.filter(t => !AVAILABLE_TAGS.includes(t)).map(tag => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        onDelete={() => toggleTag(tag)}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(0, 229, 255, 0.2)', color: '#00E5FF', borderColor: '#00E5FF', border: '1px solid' }}
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>

                    <FormControlLabel
                        control={<Switch checked={rsiAlert} onChange={(e) => setRsiAlert(e.target.checked)} color="primary" />}
                        label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>Alert on RSI Oversold (30)</Typography>}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid #222' }}>
                <Button
                    onClick={handleClose}
                    disabled={isLoading}
                    sx={{ color: '#666', '&:hover': { color: '#fff' } }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!ticker.trim() || !targetPrice || isLoading}
                    variant="contained"
                    startIcon={isLoading ? null : <Plus size={18} />}
                    sx={{
                        bgcolor: '#00E5FF',
                        color: '#000',
                        fontWeight: 700,
                        px: 4,
                        py: 1,
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#00B2CC' },
                        '&.Mui-disabled': { bgcolor: 'rgba(51, 51, 51, 0.5)', color: '#666' },
                    }}
                >
                    {isLoading ? 'Adding...' : 'Add to List'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

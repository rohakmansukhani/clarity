'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { X, AlertTriangle } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    confirmColor = 'primary',
    loading = false
}: ConfirmDialogProps) {
    const theme = useTheme();
    const { mode } = useColorMode();

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'text.primary',
                fontWeight: 700,
                pb: 2
            }}>
                <Box sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: theme.palette[confirmColor].main + '1A', // 10% opacity
                    color: theme.palette[confirmColor].main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <AlertTriangle size={24} />
                </Box>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, gap: 1.5 }}>
                <Button
                    onClick={onCancel}
                    sx={{
                        flex: 1,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        border: '1px solid',
                        borderRadius: 2,
                        py: 1.2,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                            borderColor: 'text.primary'
                        }
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        flex: 1,
                        bgcolor: theme.palette[confirmColor].main,
                        color: theme.palette[confirmColor].contrastText,
                        borderRadius: 2,
                        py: 1.2,
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: `0 4px 14px ${theme.palette[confirmColor].main}40`,
                        '&:hover': {
                            bgcolor: theme.palette[confirmColor].dark,
                            boxShadow: `0 6px 20px ${theme.palette[confirmColor].main}60`,
                        }
                    }}
                >
                    {loading ? 'Processing...' : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

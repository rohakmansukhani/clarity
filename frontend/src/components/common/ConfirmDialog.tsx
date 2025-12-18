'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'error',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const colorMap = {
        primary: '#00E5FF',
        error: '#EF4444',
        warning: '#F59E0B'
    };

    const bgColorMap = {
        primary: 'rgba(0, 229, 255, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        warning: 'rgba(245, 158, 11, 0.1)'
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            PaperProps={{
                sx: {
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    maxWidth: 500,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: '#fff',
                fontWeight: 700,
                pb: 2
            }}>
                <Box sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: bgColorMap[confirmColor],
                    color: colorMap[confirmColor],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <AlertTriangle size={24} />
                </Box>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
                <Button
                    onClick={onCancel}
                    sx={{
                        flex: 1,
                        color: '#666',
                        borderColor: '#333',
                        border: '1px solid',
                        borderRadius: 2,
                        py: 1.2,
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                            color: '#fff',
                            borderColor: '#555',
                            bgcolor: 'rgba(255,255,255,0.05)'
                        }
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    sx={{
                        flex: 1,
                        bgcolor: colorMap[confirmColor],
                        color: confirmColor === 'primary' ? '#000' : '#fff',
                        fontWeight: 700,
                        py: 1.2,
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': {
                            bgcolor: confirmColor === 'error' ? '#DC2626' :
                                confirmColor === 'warning' ? '#D97706' : '#00B2CC'
                        }
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

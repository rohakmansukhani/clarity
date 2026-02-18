'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerModal() {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        const hasAcknowledged = sessionStorage.getItem('clarity_disclaimer_acknowledged');
        if (!hasAcknowledged) {
            setOpen(true);
        }
    }, []);

    const handleAcknowledge = () => {
        sessionStorage.setItem('clarity_disclaimer_acknowledged', 'true');
        setOpen(false);
    };

    return (
        <Dialog
            open={open}
            fullScreen={isMobile}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0B0B0B',
                    border: { md: '1px solid #333' },
                    borderRadius: { md: 4 },
                    // Let the dialog grow naturally — no fixed maxHeight that clips content
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogContent
                sx={{
                    maxWidth: 600,
                    width: '100%',
                    mx: 'auto',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    // Start from top, not centre
                    justifyContent: 'flex-start',
                    pt: 6,
                    pb: 4,
                    // Allow scrolling if content overflows
                    overflowY: 'auto',
                }}
            >
                <Box sx={{ mb: 4, p: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%' }}>
                    <AlertTriangle size={64} color="#00E5FF" />
                </Box>

                <Typography variant="h2" sx={{ fontWeight: 800, color: '#fff', mb: 2, letterSpacing: '-0.02em' }}>
                    EDUCATIONAL USE ONLY
                </Typography>

                <Typography variant="h5" sx={{ color: '#888', mb: 6, fontWeight: 400, lineHeight: 1.6 }}>
                    Clarity is a simulation and analysis tool designed strictly for educational purposes.
                </Typography>

                <Box sx={{ textAlign: 'left', bgcolor: '#111', p: 4, borderRadius: 4, border: '1px solid #222', mb: 6, width: '100%' }}>
                    <Typography variant="body1" sx={{ color: '#ccc', mb: 2, fontWeight: 500 }}>
                        By proceeding, you acknowledge that:
                    </Typography>
                    <ul style={{ color: '#888', paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li>This platform does <strong>not</strong> provide financial advice.</li>
                        <li>No real money is involved in simulated trades.</li>
                        <li>Data provided may not be accurate or real-time.</li>
                        <li>You are solely responsible for your own investment decisions.</li>
                    </ul>
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleAcknowledge}
                    sx={{
                        bgcolor: '#00E5FF',
                        color: '#000',
                        fontWeight: 800,
                        py: 2,
                        px: 8,
                        fontSize: '1.1rem',
                        '&:hover': { bgcolor: '#fff' }
                    }}
                >
                    I UNDERSTAND & AGREE
                </Button>
            </DialogContent>
        </Dialog>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { useColorMode } from '@/theme/ThemeContext';
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

    const { mode } = useColorMode();

    return (
        <Dialog
            open={open}
            fullScreen={isMobile}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: theme.palette.background.default,
                    border: { md: `1px solid ${theme.palette.divider}` },
                    borderRadius: { md: 4 },
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundImage: 'none'
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
                    justifyContent: 'flex-start',
                    pt: 6,
                    pb: 4,
                    overflowY: 'auto',
                }}
            >
                <Box sx={{ mb: 4, p: 2, bgcolor: `${theme.palette.primary.main}15`, borderRadius: '50%' }}>
                    <AlertTriangle size={64} color={theme.palette.primary.main} />
                </Box>

                <Typography variant="h2" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 2, letterSpacing: '-0.02em' }}>
                    EDUCATIONAL USE ONLY
                </Typography>

                <Typography variant="h5" sx={{ color: theme.palette.text.secondary, mb: 6, fontWeight: 400, lineHeight: 1.6 }}>
                    Clarity is a simulation and analysis tool designed strictly for educational purposes.
                </Typography>

                <Box sx={{ textAlign: 'left', bgcolor: theme.palette.background.paper, p: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, mb: 6, width: '100%' }}>
                    <Typography variant="body1" sx={{ color: theme.palette.text.primary, mb: 2, fontWeight: 500 }}>
                        By proceeding, you acknowledge that:
                    </Typography>
                    <ul style={{ color: theme.palette.text.secondary, paddingLeft: '20px', lineHeight: '1.8' }}>
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
                        bgcolor: theme.palette.primary.main,
                        color: mode === 'dark' ? '#000' : '#fff',
                        fontWeight: 800,
                        py: 2,
                        px: 8,
                        fontSize: '1.1rem',
                        '&:hover': { bgcolor: theme.palette.primary.dark }
                    }}
                >
                    I UNDERSTAND & AGREE
                </Button>
            </DialogContent>
        </Dialog>
    );
}

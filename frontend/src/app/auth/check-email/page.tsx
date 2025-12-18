'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CheckEmailPage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, #051a24 0%, #0B0B0B 70%)'
            }}
        >
            <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'rgba(0, 229, 255, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 4,
                        color: '#00E5FF'
                    }}>
                        <Mail size={40} />
                    </Box>

                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}>
                        Check your mail
                    </Typography>

                    <Typography variant="body1" sx={{ color: '#aaa', mb: 6, fontSize: '1.1rem', lineHeight: 1.6 }}>
                        We've sent a verification link to your email address.<br />
                        Please click the link to verify your account and access Clarity.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <Button
                            component={Link}
                            href="/login"
                            variant="outlined"
                            size="large"
                            sx={{
                                color: '#fff',
                                borderColor: 'rgba(255,255,255,0.2)',
                                px: 4,
                                py: 1.5,
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontSize: '1rem',
                                '&:hover': {
                                    borderColor: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.05)'
                                }
                            }}
                        >
                            Return to Login
                        </Button>
                    </Box>

                </motion.div>
            </Container>
        </Box>
    );
}

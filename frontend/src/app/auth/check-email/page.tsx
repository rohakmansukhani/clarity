'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { Mail, ArrowRight, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

export default function CheckEmailPage() {
    const theme = useTheme();
    const { mode, toggleColorMode } = useColorMode();
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                color: 'text.primary',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
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
                        bgcolor: 'primary.main' + '1A',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 4,
                        color: 'primary.main'
                    }}>
                        <Mail size={40} />
                    </Box>

                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}>
                        Check your mail
                    </Typography>

                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 6, fontSize: '1.1rem', lineHeight: 1.6 }}>
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
                                color: 'text.primary',
                                borderColor: 'divider',
                                px: 4,
                                py: 1.5,
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontSize: '1rem',
                                '&:hover': {
                                    borderColor: 'text.primary',
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            Return to Login
                        </Button>
                    </Box>

                </motion.div>
            </Container>

            {/* Theme Toggle Button */}
            <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
                <Button
                    onClick={toggleColorMode}
                    sx={{
                        minWidth: 48,
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        color: 'text.primary',
                        '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: 'text.secondary'
                        }
                    }}
                >
                    {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </Button>
            </Box>
        </Box>
    );
}

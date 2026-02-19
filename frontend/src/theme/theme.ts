'use client';

import { createTheme } from '@mui/material/styles';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

export const getThemeConfig = (mode: 'light' | 'dark') => ({
    palette: {
        mode,
        primary: {
            main: mode === 'dark' ? '#00E5FF' : '#00B2CC', // Deepened Electric Cyan for light mode
            light: '#5FFFFF',
            dark: '#008C9E',
        },
        secondary: {
            main: '#7C3AED',
        },
        background: {
            default: mode === 'dark' ? '#0F172A' : '#FFFFFF', // Slate 900 vs Pure Alabaster
            paper: mode === 'dark' ? '#1E293B' : '#F8F9FA',   // Slate 800 vs Soft Porcelain
        },
        text: {
            primary: mode === 'dark' ? '#F8FAFC' : '#0F172A',
            secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
        },
        divider: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        success: {
            main: '#10B981',
        },
        error: {
            main: '#EF4444',
        },
    },
    typography: {
        fontFamily: inter.style.fontFamily,
        h1: {
            fontFamily: outfit.style.fontFamily,
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontFamily: outfit.style.fontFamily,
            fontWeight: 600,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontFamily: outfit.style.fontFamily,
            fontWeight: 600,
        },
        button: {
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: '0.02em',
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '99px',
                    padding: '10px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: mode === 'dark'
                            ? '0 4px 12px rgba(0, 229, 255, 0.2)'
                            : '0 4px 12px rgba(0, 178, 204, 0.15)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
                },
            },
        },
    },
});

const theme = createTheme(getThemeConfig('dark'));
export default theme;


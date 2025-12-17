'use client';

import { createTheme } from '@mui/material/styles';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00E5FF', // Electric Cyan
            light: '#5FFFFF',
            dark: '#00B2CC',
        },
        secondary: {
            main: '#7C3AED', // Electric Violet
        },
        background: {
            default: '#0F172A', // Slate 900
            paper: '#1E293B',   // Slate 800
        },
        text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
        },
        success: {
            main: '#10B981', // Emerald 500
        },
        error: {
            main: '#EF4444', // Red 500
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
                    borderRadius: '99px', // Pill shape for that modern feel
                    padding: '10px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 229, 255, 0.2)', // Glow effect
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export default theme;

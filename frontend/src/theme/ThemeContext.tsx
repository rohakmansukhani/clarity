'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { getThemeConfig } from './theme';

type ColorMode = 'light' | 'dark';

interface ColorModeContextType {
    mode: ColorMode;
    toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
    mode: 'dark',
    toggleColorMode: () => { },
});

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }: { children: React.ReactNode }) => {
    // Always initialize with 'dark' for server-side consistency (avoids hydration mismatch)
    const [mode, setMode] = useState<ColorMode>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Runs only on client, after hydration is complete
        setMounted(true);
        const savedMode = localStorage.getItem('clarity-theme-mode') as ColorMode;
        if (savedMode) {
            setMode(savedMode);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setMode('light');
        }
    }, []);

    const toggleColorMode = () => {
        setMode((prevMode) => {
            const newMode = prevMode === 'light' ? 'dark' : 'light';
            localStorage.setItem('clarity-theme-mode', newMode);
            return newMode;
        });
    };

    // Update root background color
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        if (mode === 'dark') {
            root.style.backgroundColor = '#0B0B0B';
            root.classList.add('dark');
        } else {
            root.style.backgroundColor = '#FFFFFF';
            root.classList.remove('dark');
        }
    }, [mode, mounted]);

    const theme = useMemo(() => createTheme(getThemeConfig(mode)), [mode]);

    // IMPORTANT: No conditional early return here — that violates the Rules of Hooks (Error #300).
    // Instead, we use CSS visibility to hide children until mounted, preventing theme flash.
    return (
        <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
            <ThemeProvider theme={theme}>
                <div style={mounted ? undefined : { visibility: 'hidden' }}>
                    {children}
                </div>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
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
    // Check local storage or system preference for initial mode
    const [mode, setMode] = useState<ColorMode>('dark');

    useEffect(() => {
        const savedMode = localStorage.getItem('clarity-theme-mode') as ColorMode;
        if (savedMode) {
            setMode(savedMode);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            // Uncomment if you want to follow system preference by default
            // setMode('light');
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
        const root = document.documentElement;
        if (mode === 'dark') {
            root.style.backgroundColor = '#0B0B0B';
            root.classList.add('dark');
        } else {
            root.style.backgroundColor = '#FFFFFF';
            root.classList.remove('dark');
        }
    }, [mode]);

    const theme = useMemo(() => createTheme(getThemeConfig(mode)), [mode]);

    return (
        <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

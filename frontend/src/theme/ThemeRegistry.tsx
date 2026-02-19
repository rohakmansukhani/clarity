'use client';

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';
import { ColorModeProvider } from './ThemeContext';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    return (
        <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
            <ColorModeProvider>
                <CssBaseline />
                {children}
            </ColorModeProvider>
        </NextAppDirEmotionCacheProvider>
    );
}

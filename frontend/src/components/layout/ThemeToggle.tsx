'use client';

import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Sun, Moon } from 'lucide-react';
import { useColorMode } from '@/theme/ThemeContext';

interface ThemeToggleProps {
    sx?: any;
}

export default function ThemeToggle({ sx }: ThemeToggleProps) {
    const theme = useTheme();
    const { mode, toggleColorMode } = useColorMode();

    return (
        <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow>
            <IconButton
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
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'text.secondary',
                        transform: 'scale(1.05)',
                        boxShadow: theme.shadows[2]
                    },
                    '&:active': {
                        transform: 'scale(0.95)'
                    },
                    ...sx
                }}
            >
                {mode === 'dark' ? (
                    <Sun size={20} strokeWidth={2} />
                ) : (
                    <Moon size={20} strokeWidth={2} />
                )}
            </IconButton>
        </Tooltip>
    );
}

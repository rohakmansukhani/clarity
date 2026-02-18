'use client';

import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, Tooltip, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { LayoutDashboard, TrendingUp, PieChart, MessageSquare, LogOut, Menu, X, ChevronRight, ChevronLeft, Eye, RotateCcw, BarChart2, Compass } from 'lucide-react';
import { useUIStore } from '@/lib/ui-store';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Market', icon: TrendingUp, path: '/market' },
    { label: 'Analysis', icon: BarChart2, path: '/analysis' },
    { label: 'Discovery Hub', icon: Compass, path: '/sectors' },
    { label: 'Buy List', icon: Eye, path: '/watchlist' },
    { label: 'Backtrack', icon: RotateCcw, path: '/backtrack' },
    { label: 'Portfolio', icon: PieChart, path: '/portfolio' },
    { label: 'Advisor', icon: MessageSquare, path: '/advisor' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { isSidebarOpen, toggleSidebar, closeSidebar } = useUIStore();
    const isOpen = isSidebarOpen;

    // Auto-collapse on mobile, open on desktop
    useEffect(() => {
        if (isMobile) {
            closeSidebar();
        }
    }, [isMobile, closeSidebar]);

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && isMobile && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleSidebar}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 49 // Just below sidebar (50)
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Floating Toggle Button (Only visible when closed) */}
            {!isOpen && (
                <IconButton
                    onClick={toggleSidebar}
                    sx={{
                        position: 'fixed',
                        top: 24,
                        left: 24,
                        zIndex: 60,
                        color: '#fff',
                        bgcolor: 'rgba(11, 11, 11, 0.8)',
                        '&:hover': { color: '#00E5FF' }
                    }}
                >
                    <Menu size={24} />
                </IconButton>
            )}

            {/* Sidebar Container - Fixed Attached */}
            <AnimatePresence>
                {isOpen && (
                    <Box
                        component={motion.div}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        sx={{
                            width: 80,
                            height: 'calc(100vh - 48px)', // Floating Height
                            position: 'fixed',
                            left: 24, // Floating Margin
                            top: 24,
                            bottom: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            pt: 3,
                            pb: 4,
                            background: '#0B0B0B',
                            border: '1px solid #333', // Border for visibility
                            borderRadius: 4, // Rounded Corners
                            zIndex: 50,
                        }}
                    >
                        {/* Internal Close Button */}
                        <IconButton
                            onClick={toggleSidebar}
                            sx={{
                                mb: 4,
                                color: '#666',
                                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                            }}
                        >
                            <X size={24} />
                        </IconButton>
                        {/* Navigation */}
                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
                            {MENU_ITEMS.map((item) => {
                                const isActive = pathname.startsWith(item.path);
                                const Icon = item.icon;

                                return (
                                    <ListItem key={item.path} disablePadding sx={{ display: 'block', width: 'auto' }}>
                                        <Tooltip title={item.label} placement="right" arrow>
                                            <ListItemButton
                                                onClick={() => { router.push(item.path); if (isMobile) closeSidebar(); }}
                                                sx={{
                                                    minWidth: 0,
                                                    justifyContent: 'center',
                                                    p: 1.5,
                                                    borderRadius: 3,
                                                    color: isActive ? '#00E5FF' : '#666',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        color: '#fff',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        transform: 'scale(1.05)'
                                                    }
                                                }}
                                            >
                                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                                {isActive && (
                                                    <Box
                                                        component={motion.div}
                                                        layoutId="active-nav"
                                                        sx={{
                                                            position: 'absolute',
                                                            left: -2,
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            height: 4,
                                                            width: 4,
                                                            background: '#00E5FF',
                                                            borderRadius: '50%'
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        </Tooltip>
                                    </ListItem>
                                );
                            })}
                        </List>

                        {/* Logout */}
                        <Box sx={{ mt: 'auto', pb: 2 }}>
                            <Tooltip title="Logout" placement="right">
                                <ListItemButton onClick={() => {
                                    sessionStorage.removeItem('clarity_disclaimer_acknowledged');
                                    router.push('/login');
                                }} sx={{ color: '#666', borderRadius: 3, '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                                    <LogOut size={22} />
                                </ListItemButton>
                            </Tooltip>
                        </Box>
                    </Box>
                )}
            </AnimatePresence>
        </>
    );
}

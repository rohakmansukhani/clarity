'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper, List, ListItemButton, IconButton, Menu, MenuItem } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { History, MoreVertical, Pin, Trash2, Plus } from 'lucide-react';

interface HistorySession {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_pinned: boolean;
}

interface DiscoveryHistoryProps {
    isOpen: boolean;
    sessions: HistorySession[];
    currentSessionId: string | null;
    onClose: () => void;
    onSessionClick: (sessionId: string) => void;
    onNewChat: () => void;
    onPinSession: (sessionId: string, currentPinStatus: boolean) => void;
    onDeleteSession: (sessionId: string) => void;
}

function HistoryItem({ session, isActive, onClick, onPin, onDelete }: any) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        event.preventDefault();
        setAnchorEl(event.currentTarget as HTMLElement);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setAnchorEl(null);
    };

    const handlePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPin(session.id, session.is_pinned);
        handleClose(e);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(session.id);
        handleClose(e);
    };

    return (
        <ListItemButton
            selected={isActive}
            onClick={onClick}
            sx={{
                borderRadius: '12px',
                mb: 0.5,
                py: 1.5,
                color: '#ddd',
                transition: 'all 0.2s',
                bgcolor: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', pr: 1 },
                position: 'relative',
                group: 'true',
                '&:hover .menu-trigger': { opacity: 1 }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: isActive ? '#8B5CF6' : 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '85%'
                        }}
                    >
                        {session.title || "New Chat"}
                    </Typography>
                    {session.is_pinned && <Pin size={12} fill="#8B5CF6" color="#8B5CF6" />}
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(session.updated_at || session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Typography>
            </Box>

            <IconButton
                className="menu-trigger"
                size="small"
                onClick={handleMenuClick}
                sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: '#666',
                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)'
                }}
            >
                <MoreVertical size={16} />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={(e: any) => handleClose(e)}
                PaperProps={{
                    sx: {
                        bgcolor: '#111',
                        border: '1px solid #333',
                        color: '#ddd',
                        minWidth: 120
                    }
                }}
            >
                <MenuItem onClick={handlePin} sx={{ fontSize: '0.85rem', gap: 1.5 }}>
                    <Pin size={16} /> {session.is_pinned ? 'Unpin' : 'Pin Chat'}
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ fontSize: '0.85rem', gap: 1.5, color: '#EF4444' }}>
                    <Trash2 size={16} /> Delete
                </MenuItem>
            </Menu>
        </ListItemButton>
    );
}

export default function DiscoveryHistory({
    isOpen,
    sessions,
    currentSessionId,
    onClose,
    onSessionClick,
    onNewChat,
    onPinSession,
    onDeleteSession
}: DiscoveryHistoryProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Invisible Backdrop */}
                    <Box
                        onClick={onClose}
                        sx={{ position: 'absolute', inset: 0, zIndex: 19, bgcolor: 'transparent' }}
                    />

                    <motion.div
                        initial={{ opacity: 0, x: -50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            position: 'absolute',
                            top: 80,
                            bottom: 20,
                            left: 24,
                            width: 320,
                            zIndex: 20,
                        }}
                    >
                        <Paper sx={{
                            height: '100%',
                            bgcolor: 'rgba(18, 18, 18, 0.9)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '24px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', fontSize: '1.1rem' }}>
                                        Chat History
                                    </Typography>
                                    <IconButton
                                        onClick={onNewChat}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(139, 92, 246, 0.15)',
                                            color: '#8B5CF6',
                                            '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.25)' }
                                        }}
                                    >
                                        <Plus size={18} />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ px: 1.5, py: 1, display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                                    RECENT
                                </Typography>
                                <List disablePadding>
                                    {sessions.map((session) => (
                                        <HistoryItem
                                            key={session.id}
                                            session={session}
                                            isActive={currentSessionId === session.id}
                                            onClick={() => onSessionClick(session.id)}
                                            onPin={onPinSession}
                                            onDelete={onDeleteSession}
                                        />
                                    ))}
                                    {sessions.length === 0 && (
                                        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.3 }}>
                                            <History size={32} style={{ margin: '0 auto', marginBottom: 8 }} />
                                            <Typography variant="body2">No history yet</Typography>
                                        </Box>
                                    )}
                                </List>
                            </Box>
                        </Paper>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

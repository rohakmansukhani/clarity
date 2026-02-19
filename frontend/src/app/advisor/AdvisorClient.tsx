'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, CircularProgress, Paper, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, Menu, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';
import { Send, Paperclip, Bot, User, Sparkles, Zap, TrendingUp, History, Plus, MoreVertical, Pin, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import ClarityLogo from '@/components/ui/ClarityLogo';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { marketService } from '@/services/marketService';
import { useUIStore } from '@/lib/ui-store';
import SwitchAIButton from '@/components/common/SwitchAIButton';
import ConfirmDialog from '@/components/common/ConfirmDialog';

// --- Interfaces ---
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isThinking?: boolean;
    suggest_switch?: {
        to: 'advisor' | 'discovery_hub';
        reason: string;
        original_query?: string;
    };
}

const SUGGESTED_PROMPTS = [
    { icon: TrendingUp, text: "Analyze Reliance Industries" },
    { icon: Zap, text: "What moved the Nifty 50 today?" },
    { icon: Sparkles, text: "Explain 'Beta' in investing" },
];

function MsgGap(role: string) {
    return role === 'assistant' ? '16px' : '0px';
}

function HistoryItem({ session, isActive, onClick, onPin, onDelete }: any) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget as HTMLElement);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setAnchorEl(null);
    };

    const handlePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPin(session.id, session.is_pinned);
        handleClose();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(session.id);
        handleClose();
    };

    return (
        <ListItemButton
            selected={isActive}
            onClick={onClick}
            sx={{
                borderRadius: '12px',
                mb: 0.5,
                py: 1.5,
                transition: 'all 0.2s',
                bgcolor: isActive ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', pr: 1 },
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
                            color: isActive ? '#00E5FF' : 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '85%'
                        }}
                    >
                        {session.title || "New Chat"}
                    </Typography>
                    {session.is_pinned && <Pin size={12} fill="#00E5FF" color="#00E5FF" />}
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.7 }}>
                    {new Date(session.updated_at || session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Typography>
            </Box>

            {/* Menu Trigger */}
            <IconButton
                className="menu-trigger"
                size="small"
                onClick={handleMenuClick}
                sx={{
                    opacity: 0, // Hidden by default, shown on hover
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
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        color: 'text.primary',
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

export default function AdvisorClient() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('query');
    const { quickChatMessages, resetQuickChat, openSidebar, closeSidebar, advisorQuery, setAdvisorQuery } = useUIStore();
    const theme = useTheme();
    const { mode } = useColorMode();

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Default to loading

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasAutoQueried = useRef(false);

    // Auto-scroll to bottom whenever messages update or AI is typing
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Handle query injected from ContextMenu when already on /advisor
    useEffect(() => {
        if (advisorQuery) {
            setAdvisorQuery(null); // Clear immediately to prevent re-firing
            handleSend(advisorQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [advisorQuery]);

    // Helper to toggle history and main sidebar together
    const toggleHistory = () => {
        if (!isHistoryOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
        setIsHistoryOpen(!isHistoryOpen);
    };

    // Helper to close history explicitly
    const closeHistory = () => {
        openSidebar();
        setIsHistoryOpen(false);
    };

    // Fetch Sessions on Mount
    useEffect(() => {
        loadSessions();

        // Hydrate from Quick Chat Store
        if (quickChatMessages.length > 0) {
            const history: Message[] = quickChatMessages.map(m => ({
                ...m,
                timestamp: new Date()
            }));
            setMessages(history);

            // Auto-Save Quick Chat to History
            const saveQuickChat = async () => {
                try {
                    const firstUserMsg = history.find(m => m.role === 'user')?.content || "Quick Chat";
                    // Create session with all messages
                    const session = await marketService.createSession(
                        firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? "..." : ""),
                        history.map(m => ({ role: m.role, content: m.content }))
                    );
                    setCurrentSessionId(session.id);
                    loadSessions(); // Refresh sidebar to show new chat
                } catch (e) {
                    console.error("Failed to save quick chat", e);
                }
            };
            saveQuickChat();

            resetQuickChat();
        }
    }, [quickChatMessages]); // Hydrate dependency

    const loadSessions = async () => {
        try {
            const data = await marketService.getChatSessions('advisor');
            setSessions(data);
        } catch (e) {
            console.error("Failed to load sessions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSessionClick = async (sessionId: string) => {
        try {
            setIsLoading(true);
            setCurrentSessionId(sessionId);
            setIsHistoryOpen(false); // Close sidebar on mobile/action
            setMessages([]); // Clear current

            const msgs = await marketService.getSessionMessages(sessionId);
            const formattedMsgs: Message[] = msgs.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at)
            }));
            setMessages(formattedMsgs);
        } catch (e) {
            console.error("Failed to load session messages", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setIsHistoryOpen(false);
    };

    // Handle initial query from Context Menu
    useEffect(() => {
        if (initialQuery && !hasAutoQueried.current) {
            hasAutoQueried.current = true;
            handleSend(initialQuery);
        }
    }, [initialQuery]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        // Optimistic UI Update
        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsTyping(true);

        try {
            let sessionId = currentSessionId;

            // If no session, create one
            if (!sessionId) {
                // Initial creation
                const session = await marketService.createSession(text.slice(0, 30) + "...", [
                    { role: 'user', content: text }
                ]);
                sessionId = session.id;
                setCurrentSessionId(sessionId);
                loadSessions(); // Refresh list
            } else {
                // existing session, just add message to history in bg
                await marketService.addMessageToSession(sessionId!, 'user', text);
            }

            // Prepare history (excluding current message which is passed as query)
            const conversationHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Get AI Response with History
            const responseData = await marketService.chatWithAI(text, { type: 'advisor_chat' }, conversationHistory);

            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseData.response,
                suggest_switch: responseData.suggest_switch,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newAiMsg]);

            // Save AI Response to History (only text content)
            await marketService.addMessageToSession(sessionId!, 'assistant', responseData.response);

            // Generate Title if it's the first interaction (User + AI = 2 messages in current view, roughly)
            // Or explicitly if we just created the session.
            // Safer check: If messages list was empty before this, or very short.
            if (messages.length <= 2) {
                // Trigger background title generation
                marketService.generateSessionTitle(sessionId!).then((data: { title: string }) => {
                    // Update sidebar title locally
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: data.title } : s));
                }).catch(err => console.error("Title gen failed", err));
            }

        } catch (error) {
            console.error("AI Error", error);
        } finally {
            setIsTyping(false);
        }
    };


    // --- Actions ---
    const handlePinSession = async (sessionId: string, currentPinStatus: boolean) => {
        try {
            await marketService.togglePinSession(sessionId, !currentPinStatus);
            // Optimistic update
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_pinned: !currentPinStatus } : s).sort((a, b) => {
                // Sort logic: Pinned first, then date
                if (a.is_pinned === b.is_pinned) return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                return (a.is_pinned ? -1 : 1);
            }));
            loadSessions(); // Full refresh to be safe
        } catch (e) {
            console.error("Pin failed", e);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        setSessionToDelete(sessionId);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;

        try {
            await marketService.deleteSession(sessionToDelete);
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
            if (currentSessionId === sessionToDelete) {
                handleNewChat();
            }
        } catch (e) {
            console.error("Delete failed", e);
        } finally {
            setDeleteConfirmOpen(false);
            setSessionToDelete(null);
        }
    };

    // (Render logic below)

    return (
        <>
            {/* Main Navigation Sidebar - Always Visible */}
            <Sidebar />

            <Box sx={{
                pl: { xs: 0, md: '100px' }, // Main Sidebar width
                height: '100vh',
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: mode === 'dark'
                    ? 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #0B0B0B 70%)'
                    : 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.05) 0%, #FFFFFF 70%)'
            }}>
                {/* Grid Decoration */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: mode === 'dark'
                            ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
                            : 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)',
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                />
                {/* Header */}
                <Box sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    pl: { xs: '80px', md: '120px' }
                }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <IconButton
                            onClick={() => window.history.back()}
                            sx={{
                                color: 'text.primary',
                                bgcolor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <ArrowLeft size={20} />
                        </IconButton>
                        <IconButton
                            onClick={toggleHistory}
                            sx={{
                                color: 'text.primary',
                                bgcolor: isHistoryOpen ? 'rgba(0, 229, 255, 0.15)' : 'background.paper',
                                border: isHistoryOpen ? '1px solid rgba(0, 229, 255, 0.4)' : `1px solid ${theme.palette.divider}`,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <History size={20} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Custom Floating History Panel */}
                <AnimatePresence>
                    {isHistoryOpen && (
                        <>
                            {/* Invisible Backdrop to close on click outside */}
                            <Box
                                onClick={closeHistory}
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
                                    left: 24, // Main Sidebar position
                                    width: 320,
                                    zIndex: 20,
                                }}
                            >
                                <Paper sx={{
                                    height: '100%',
                                    bgcolor: 'background.paper',
                                    backdropFilter: 'blur(20px)',
                                    backgroundImage: 'none',
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: '24px',
                                    boxShadow: theme.shadows[10],
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}>
                                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.palette.divider}` }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>Chats</Typography>
                                        <IconButton
                                            onClick={handleNewChat}
                                            sx={{
                                                bgcolor: 'rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                width: 32, height: 32,
                                                '&:hover': { bgcolor: '#00E5FF', color: '#000' }
                                            }}
                                        >
                                            <Plus size={16} />
                                        </IconButton>
                                    </Box>

                                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6, fontWeight: 700, mb: 1, display: 'block', px: 1, letterSpacing: '0.05em' }}>
                                            RECENT
                                        </Typography>
                                        <List disablePadding>
                                            {sessions.map((session) => (
                                                <HistoryItem
                                                    key={session.id}
                                                    session={session}
                                                    isActive={currentSessionId === session.id}
                                                    onClick={() => handleSessionClick(session.id)}
                                                    onPin={handlePinSession}
                                                    onDelete={handleDeleteSession}
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

                {/* Messages Area */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, pt: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <AnimatePresence mode='popLayout'>
                        {isLoading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-full gap-4"
                            >
                                <CircularProgress size={40} sx={{ color: '#00E5FF' }} />
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Loading history...</Typography>
                            </motion.div>
                        ) : messages.length === 0 && (
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center h-full text-center space-y-8 mt-20"
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <ClarityLogo size={80} />
                                </motion.div>
                                <div>
                                    <Typography variant="h3" sx={{ fontWeight: 800, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 2 }}>
                                        How can I help you?
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#666', maxWidth: 400, mx: 'auto' }}>
                                        Ask about market trends, specific stocks, or financial concepts.
                                    </Typography>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl px-4">
                                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 1.05, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSend(prompt.text)}
                                            className="flex flex-col items-center justify-center p-6 gap-3 rounded-2xl border transition-colors group cursor-pointer text-left"
                                            style={{
                                                backgroundColor: theme.palette.background.paper,
                                                borderColor: theme.palette.divider
                                            }}
                                        >
                                            <prompt.icon className="text-[#00E5FF] group-hover:text-primary-main transition-colors" size={24} />
                                            <span className="text-sm font-medium transition-colors" style={{ color: theme.palette.text.secondary }}>{prompt.text}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    display: 'flex',
                                    gap: MsgGap(msg.role)
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <Box sx={{ mt: 1 }}>
                                        <ClarityLogo size={32} />
                                    </Box>
                                )}
                                <Paper sx={{
                                    p: 2.5,
                                    borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '4px 24px 24px 24px', // Chat bubble shape
                                    bgcolor: msg.role === 'user' ? '#00E5FF' : 'background.paper',
                                    backdropFilter: 'blur(10px)',
                                    color: msg.role === 'user' ? '#000' : 'text.primary',
                                    fontWeight: 500,
                                    border: msg.role === 'assistant' ? `1px solid ${theme.palette.divider}` : 'none',
                                    boxShadow: msg.role === 'user' ? '0 4px 20px rgba(0, 229, 255, 0.2)' : 'none',
                                    backgroundImage: 'none',
                                    position: 'relative'
                                }}>
                                    <Box sx={{
                                        '& p': { m: 0, mb: 1.5, lineHeight: 1.6 },
                                        '& p:last-child': { mb: 0 },
                                        '& strong': { fontWeight: 700, color: theme.palette.primary.main },
                                        '& ul': { pl: 3, mb: 1.5 },
                                        '& li': { mb: 0.5 },
                                        '& blockquote': { borderLeft: '3px solid #00E5FF', pl: 2, fontStyle: 'italic', my: 2, opacity: 0.8 },
                                        color: msg.role === 'user' ? '#000' : 'inherit'
                                    }}>
                                        <div className={`prose prose-sm max-w-none ${mode === 'dark' ? 'prose-invert' : ''}`}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>

                                        {/* Show Switch Button if suggested */}
                                        {msg.suggest_switch && (
                                            <Box sx={{ mt: 2 }}>
                                                <SwitchAIButton
                                                    target={msg.suggest_switch.to}
                                                    originalQuery={msg.suggest_switch.original_query || ''}
                                                    reason={msg.suggest_switch.reason}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center ml-2">
                            <ClarityLogo size={24} />
                            <div className="flex gap-1 bg-white/5 px-4 py-3 rounded-full">
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-gray-500 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-gray-500 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-gray-500 rounded-full" />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Input Area - Floating Glass */}
                <Box sx={{ p: { xs: 2, md: 4 }, pt: 0, width: '100%', maxWidth: 1000, mx: 'auto' }}>
                    <Paper
                        component="form"
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        sx={{
                            p: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: mode === 'dark' ? 'rgba(20, 20, 20, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '50px', // Pill shape
                            backgroundImage: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: theme.shadows[8],
                            '&:hover': { borderColor: theme.palette.text.secondary, transform: 'translateY(-1px)' },
                            '&:focus-within': { borderColor: '#00E5FF', boxShadow: '0 8px 32px rgba(0, 229, 255, 0.1)' }
                        }}
                    >
                        <IconButton sx={{ p: '10px', color: 'text.secondary', transition: 'color 0.2s', '&:hover': { color: 'text.primary' } }}>
                            <Paperclip size={20} />
                        </IconButton>
                        <TextField
                            sx={{ flex: 1, px: 1, '& fieldset': { border: 'none' }, input: { color: 'text.primary', fontSize: '1rem', fontWeight: 500 } }}
                            placeholder="Ask Clarity AI..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            autoComplete="off"
                        />
                        <IconButton
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            sx={{
                                p: '10px',
                                mr: 0.5,
                                bgcolor: input.trim() ? '#00E5FF' : 'action.disabledBackground',
                                color: input.trim() ? '#000' : 'text.disabled',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: input.trim() ? '#00B2CC' : 'transparent', transform: input.trim() ? 'scale(1.1)' : 'none' }
                            }}
                        >
                            <Send size={18} fill={input.trim() ? "currentColor" : "none"} />
                        </IconButton>
                    </Paper>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.5, mt: 2, display: 'block', textAlign: 'center', fontWeight: 500 }}>
                        Clarity AI can make mistakes. Verify important financial data.
                    </Typography>
                </Box>
            </Box>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Chat"
                message="Are you sure you want to delete this chat? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={confirmDeleteSession}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setSessionToDelete(null);
                }}
            />
        </>
    );
}

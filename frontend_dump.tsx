# middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Public paths that don't require authentication
    const publicPaths = ['/login', '/signup', '/auth/check-email'];
    const path = request.nextUrl.pathname;

    // Check if the path is static resource or public
    if (
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('.') || // Files like favicon.ico, logo.png
        publicPaths.includes(path)
    ) {
        return NextResponse.next();
    }

    // Check for auth token in cookies
    const token = request.cookies.get('token')?.value;

    if (!token) {
        // Redirect to login if accessing protected route without token
        const url = new URL('/login', request.url);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};


# layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '@/theme/ThemeRegistry'
import ContextMenu from '@/components/ui/ContextMenu'
import FloatingAdvisor from '@/components/ui/FloatingAdvisor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clarity AI | Financial Advisor',
  description: 'AI-powered financial insights for the Indian market',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeRegistry>
          <ContextMenu />
          {children}
          <FloatingAdvisor />
        </ThemeRegistry>
      </body>
    </html>
  )
}


# page.tsx

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}


# page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, CircularProgress, Paper, Avatar, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, Menu, MenuItem } from '@mui/material';
import { Send, Paperclip, Bot, User, Sparkles, Zap, TrendingUp, History, Plus, MoreVertical, Pin, Trash2 } from 'lucide-react';
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

export default function AdvisorPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('query');
    const { quickChatMessages, resetQuickChat, openSidebar, closeSidebar } = useUIStore();

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

    // ... scroll logic ... 

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
                bgcolor: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, #051a24 0%, #000 70%)'
            }}>
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
                    pl: { xs: 2, md: '120px' }
                }}>
                    <IconButton
                        onClick={toggleHistory}
                        sx={{
                            color: '#fff',
                            bgcolor: isHistoryOpen ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: isHistoryOpen ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <History size={20} />
                    </IconButton>
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
                                    bgcolor: 'rgba(18, 18, 18, 0.9)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '24px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}>
                                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>Chats</Typography>
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
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, mb: 1, display: 'block', px: 1 }}>
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
                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSend(prompt.text)}
                                            className="flex flex-col items-center justify-center p-6 gap-3 rounded-2xl bg-[#0A0A0A] border border-white/5 hover:border-[#00E5FF]/30 transition-colors group cursor-pointer text-left"
                                        >
                                            <prompt.icon className="text-[#00E5FF] group-hover:text-white transition-colors" size={24} />
                                            <span className="text-gray-400 text-sm font-medium group-hover:text-white text-center">{prompt.text}</span>
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
                                    bgcolor: msg.role === 'user' ? '#00E5FF' : 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    color: msg.role === 'user' ? '#000' : '#E0E0E0',
                                    fontWeight: 500,
                                    boxShadow: msg.role === 'user' ? '0 4px 20px rgba(0, 229, 255, 0.2)' : 'none',
                                    position: 'relative'
                                }}>
                                    <Box sx={{
                                        '& p': { m: 0, mb: 1.5, lineHeight: 1.6 },
                                        '& p:last-child': { mb: 0 },
                                        '& strong': { fontWeight: 700 },
                                        '& ul': { pl: 3, mb: 1.5 },
                                        '& li': { mb: 0.5 },
                                        '& blockquote': { borderLeft: '3px solid #00E5FF', pl: 2, fontStyle: 'italic', my: 2, opacity: 0.8 }
                                    }}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>

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
                            bgcolor: 'rgba(20, 20, 20, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '50px', // Pill shape
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            '&:hover': { borderColor: 'rgba(255,255,255,0.2)', transform: 'translateY(-1px)' },
                            '&:focus-within': { borderColor: '#00E5FF', boxShadow: '0 8px 32px rgba(0, 229, 255, 0.1)' }
                        }}
                    >
                        <IconButton sx={{ p: '10px', color: '#666', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>
                            <Paperclip size={20} />
                        </IconButton>
                        <TextField
                            sx={{ flex: 1, px: 1, '& fieldset': { border: 'none' }, input: { color: '#fff', fontSize: '1rem', fontWeight: 500 } }}
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
                                bgcolor: input.trim() ? '#00E5FF' : 'transparent',
                                color: input.trim() ? '#000' : '#444',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: input.trim() ? '#00B2CC' : 'transparent', transform: input.trim() ? 'scale(1.1)' : 'none' }
                            }}
                        >
                            <Send size={18} fill={input.trim() ? "currentColor" : "none"} />
                        </IconButton>
                    </Paper>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 2, display: 'block', textAlign: 'center', fontWeight: 500 }}>
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
                color: '#ddd',
                transition: 'all 0.2s',
                bgcolor: isActive ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
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
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
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


# page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Button, Avatar, Snackbar, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scale } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { marketService } from '@/services/marketService';
import { normalizeChartData } from '@/utils/chartDataUtils';
import { ComparisonTable } from '@/components/analysis/ComparisonTable';
import { StockSearchBar } from '@/components/analysis/StockSearchBar';
import { StockCard } from '@/components/analysis/StockCard';
import { CompareButton } from '@/components/analysis/CompareButton';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { ComparisonChart } from '@/components/analysis/ComparisonChart';
import { AIVerdict } from '@/components/analysis/AIVerdict';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function AnalysisPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'error' | 'success' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [stockNames, setStockNames] = useState<Record<string, string>>({});
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartPeriod, setChartPeriod] = useState('1y');

    const MAX_SLOTS = 5;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stocksParam = params.get('stocks');
        if (stocksParam) {
            const symbols = stocksParam.split(',').map(s => s.trim().toUpperCase()).slice(0, MAX_SLOTS);
            setSelectedStocks(symbols);
            if (symbols.length >= 2) {
                setTimeout(() => handleCompare(symbols), 500);
            }
        }
    }, []);

    useEffect(() => {
        selectedStocks.forEach(async (ticker) => {
            if (!stockPrices[ticker]) {
                try {
                    const details = await marketService.getStockDetails(ticker);
                    setStockPrices(prev => ({ ...prev, [ticker]: details.market_data }));
                    setStockNames(prev => ({ ...prev, [ticker]: details.name || ticker }));
                } catch (error) {
                    console.error(`Failed to fetch details for ${ticker}`, error);
                }
            }
        });
    }, [selectedStocks]);

    const handleSearchChange = async (value: string) => {
        setSearch(value);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await marketService.searchStocks(value);
            setSearchResults(results || []);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddStock = (ticker: string, companyName?: string) => {
        const upperTicker = ticker.trim().toUpperCase();
        if (!upperTicker) return;
        if (selectedStocks.includes(upperTicker)) {
            setToast({ open: true, message: `${upperTicker} is already in comparison`, severity: 'error' });
            return;
        }
        if (selectedStocks.length >= MAX_SLOTS) {
            setToast({ open: true, message: 'Maximum 5 stocks allowed', severity: 'error' });
            return;
        }
        setSelectedStocks([...selectedStocks, upperTicker]);
        setSearch('');
        setSearchResults([]);
        setShowSearchOverlay(false);
    };

    const handleRemoveStock = (ticker: string) => {
        setSelectedStocks(selectedStocks.filter(s => s !== ticker));
    };


    const handleCompare = async (stocks: string[] = selectedStocks) => {
        if (stocks.length >= 2) {
            setIsComparing(true);
            setLoadingComparison(true);
            try {
                // Fetch comparison data and historical data in parallel
                const [comparisonResult, historyResults] = await Promise.all([
                    marketService.compareStocks(stocks),
                    marketService.getComparisonHistory(stocks, chartPeriod)
                ]);

                setComparisonData(comparisonResult);

                // Normalize and set chart data
                const normalized = normalizeChartData(historyResults, stocks);
                setChartData(normalized);

                setTimeout(() => {
                    document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } catch (error) {
                console.error('Comparison failed:', error);
                setComparisonData({ error: 'Failed to compare stocks. Please try again.' });
            } finally {
                setLoadingComparison(false);
            }
        }
    };

    const quickInfo = stockPrices[search.toUpperCase()];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Header */}
                <AnimatePresence>
                    {!isComparing && (
                        <Box sx={{ textAlign: 'center', mb: 10, mt: 4 }}>
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                                <Typography variant="overline" sx={{ color: '#00E5FF', fontWeight: 700, letterSpacing: '0.2em', mb: 1, display: 'block' }}>
                                    MARKET INTELLIGENCE
                                </Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 2, background: '#ffffff', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Compare & Analyze
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#888', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
                                    Institutional-grade comparison. Add up to 5 assets to visualize relative performance and fundamental strength.
                                </Typography>
                            </motion.div>
                        </Box>
                    )}
                </AnimatePresence>

                {/* Stock Cards Grid */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: 1200, mb: isComparing ? 4 : 8, width: '100%', transition: 'all 0.5s' }}>
                    {selectedStocks.map((stock) => (
                        <StockCard
                            key={stock}
                            symbol={stock}
                            companyName={stockNames[stock]}
                            stockData={stockPrices[stock]}
                            isComparing={isComparing}
                            onRemove={() => handleRemoveStock(stock)}
                        />
                    ))}

                    {selectedStocks.length < MAX_SLOTS && (
                        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.1, rotate: 90 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                                <IconButton
                                    onClick={() => setShowSearchOverlay(true)}
                                    sx={{ width: 80, height: 80, borderRadius: '50%', border: '1px dashed #333', color: '#444', transition: 'all 0.3s', '&:hover': { borderColor: '#00E5FF', color: '#00E5FF', bgcolor: 'rgba(0, 229, 255, 0.05)' } }}
                                >
                                    <Plus size={32} />
                                </IconButton>
                            </motion.div>
                        </Box>
                    )}
                </Box>

                {/* Search Bar - Using Component - Only show if less than 2 stocks OR overlay is active */}
                {(selectedStocks.length < 2 || showSearchOverlay) && (
                    <StockSearchBar
                        search={search}
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        disabled={selectedStocks.length >= MAX_SLOTS}
                        onSearchChange={handleSearchChange}
                        onSelectStock={(symbol, name) => {
                            handleAddStock(symbol, name);
                            setShowSearchOverlay(false);
                        }}
                    />
                )}

                {/* Compare Button - Using Component */}
                <Box sx={{ mt: 8 }}>
                    {!isComparing && selectedStocks.length >= 2 && (
                        <CompareButton
                            stockCount={selectedStocks.length}
                            isLoading={loadingComparison}
                            onClick={() => handleCompare()}
                        />
                    )}
                    {!isComparing && selectedStocks.length < 2 && (
                        <Button variant="contained" size="large" disabled sx={{ bgcolor: '#222', color: '#444', fontWeight: 700, px: 6, py: 1.8, borderRadius: '16px', textTransform: 'none' }}>
                            Select at least 2 assets
                        </Button>
                    )}
                    {isComparing && (
                        <Button variant="outlined" onClick={() => setIsComparing(false)} sx={{ color: '#666', borderColor: '#333', borderRadius: '99px', '&:hover': { color: '#fff', borderColor: '#fff' } }}>
                            Reset Comparison
                        </Button>
                    )}
                </Box>

                {/* Analysis Section */}
                <AnimatePresence>
                    {isComparing && (
                        <motion.div id="analysis-section" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: 0.6 }} style={{ width: '100%', maxWidth: 1200, marginTop: 60, paddingBottom: 100 }}>

                            {/* Error Banner - Using Component */}
                            {comparisonData?.error && (
                                <ErrorBanner error={comparisonData.error} onRetry={() => handleCompare()} />
                            )}

                            {/* Chart */}
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', p: 3, height: { xs: 350, sm: 450, md: 500 }, mb: 4, position: 'relative' }}>
                                {/* Date Range Selector */}
                                <Box sx={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', gap: 1 }}>
                                    {['1mo', '3mo', '6mo', '1y', '5y'].map((range) => (
                                        <Button
                                            key={range}
                                            size="small"
                                            onClick={async () => {
                                                setChartPeriod(range);
                                                // Refetch comparison with new period
                                                if (selectedStocks.length >= 2) {
                                                    setLoadingComparison(true);
                                                    try {
                                                        const historyResults = await marketService.getComparisonHistory(selectedStocks, range);
                                                        const normalized = normalizeChartData(historyResults, selectedStocks);
                                                        setChartData(normalized);
                                                    } catch (error) {
                                                        console.error('Failed to fetch history:', error);
                                                    } finally {
                                                        setLoadingComparison(false);
                                                    }
                                                }
                                            }}
                                            sx={{
                                                minWidth: 0,
                                                px: 1.5,
                                                color: chartPeriod === range ? '#00E5FF' : '#666',
                                                fontWeight: 700,
                                                bgcolor: chartPeriod === range ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            {range === '1mo' ? '1M' : range === '3mo' ? '3M' : range === '6mo' ? '6M' : range === '1y' ? '1Y' : '5Y'}
                                        </Button>
                                    ))}
                                </Box>

                                <ComparisonChart
                                    chartData={chartData}
                                    selectedStocks={selectedStocks}
                                    chartPeriod={chartPeriod}
                                    key={chartPeriod} // Force re-render on period change
                                />
                            </Box>

                            {/* Fundamentals Table */}
                            <Box sx={{ bgcolor: '#0A0A0A', borderRadius: 6, border: '1px solid #222', overflow: 'hidden', mb: 4 }}>
                                <Box sx={{ p: { xs: 2, md: 4 }, overflowX: 'auto' }}>
                                    <Box sx={{ minWidth: { xs: 500, md: 600 } }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`, gap: { xs: 1, md: 2 }, pb: 2, borderBottom: '1px solid #333', mb: 2 }}>
                                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Metric</Typography>
                                            {selectedStocks.map((s, i) => (
                                                <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                    <Box sx={{ width: { xs: 6, md: 8 }, height: { xs: 6, md: 8 }, borderRadius: '50%', bgcolor: ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5] }} />
                                                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>{s}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <ComparisonTable comparisonData={comparisonData} selectedStocks={selectedStocks} />
                                    </Box>
                                </Box>
                            </Box>

                            {/* AI Verdict */}
                            <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.1)', mb: 4 }}>
                                <AIVerdict comparisonData={comparisonData} selectedStocks={selectedStocks} />
                            </Paper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            {/* Toast */}
            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
            </Snackbar>

            <DisclaimerFooter />
        </Box>
    );
}


# page.tsx

'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CheckEmailPage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, #051a24 0%, #0B0B0B 70%)'
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
                        bgcolor: 'rgba(0, 229, 255, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 4,
                        color: '#00E5FF'
                    }}>
                        <Mail size={40} />
                    </Box>

                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}>
                        Check your mail
                    </Typography>

                    <Typography variant="body1" sx={{ color: '#aaa', mb: 6, fontSize: '1.1rem', lineHeight: 1.6 }}>
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
                                color: '#fff',
                                borderColor: 'rgba(255,255,255,0.2)',
                                px: 4,
                                py: 1.5,
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontSize: '1rem',
                                '&:hover': {
                                    borderColor: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.05)'
                                }
                            }}
                        >
                            Return to Login
                        </Button>
                    </Box>

                </motion.div>
            </Container>
        </Box>
    );
}


# page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, CircularProgress, Autocomplete, Paper } from '@mui/material';
import Sidebar from '@/components/layout/Sidebar';
import { marketService } from '@/services/marketService';
import { RotateCcw, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function BacktrackPage() {
    const [ticker, setTicker] = useState('');
    const [searchOptions, setSearchOptions] = useState<any[]>([]);
    const [date, setDate] = useState('');
    const [sellDate, setSellDate] = useState('');
    const [useCustomSellDate, setUseCustomSellDate] = useState(false);
    const [minDate, setMinDate] = useState(''); // New state for constraint

    const [shares, setShares] = useState<string>('1');
    const [amount, setAmount] = useState<string>('10000');
    const [inputMode, setInputMode] = useState<'shares' | 'amount'>('shares');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    // Fetch listing date when ticker changes (debounced or on selection)
    // We'll do it on selection for now in Autocomplete onChange
    const [priceAtDate, setPriceAtDate] = useState<number | null>(null);

    // Check URL params for pre-filled stock
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stockParam = params.get('stock');

        if (stockParam) {
            const symbol = stockParam.trim().toUpperCase();
            handleTickerSelect(symbol);
        }
    }, []);

    // Fetch listing date when ticker changes (debounced or on selection)
    // We'll do it on selection for now in Autocomplete onChange
    const handleTickerSelect = async (symbol: string) => {
        setTicker(symbol);
        if (symbol) {
            try {
                const d = await marketService.getListingDate(symbol);
                setMinDate(d);
                // If current selected date is before minDate, reset it?
                if (date && d && new Date(date) < new Date(d)) {
                    setDate('');
                }
            } catch (e) {
                console.error("Failed to fetch listing date", e);
            }
        } else {
            setMinDate('');
        }
    };

    // Fetch price when date and ticker are valid
    React.useEffect(() => {
        const fetchPrice = async () => {
            if (ticker && date) {
                try {
                    const p = await marketService.getPriceAtDate(ticker, date);
                    setPriceAtDate(p);
                    // Initial Sync logic upon selection?
                    // If we have shares, update amount. Or preserve user intent?
                    // Let's just update the non-active field or both?
                    // Safe default: Update Amount based on Shares (since default shares=1)
                    if (p > 0) {
                        if (inputMode === 'shares') {
                            setAmount((parseFloat(shares) * p).toFixed(2));
                        } else {
                            setShares((parseFloat(amount) / p).toFixed(4));
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch price", e);
                }
            } else {
                setPriceAtDate(null);
            }
        };
        fetchPrice();
    }, [ticker, date]);


    const handleCalculate = async () => {
        if (!ticker || !date) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            let data;
            const finalSellDate = useCustomSellDate ? sellDate : undefined;
            if (inputMode === 'shares') {
                data = await marketService.backtest(ticker, date, Number(shares), undefined, finalSellDate);
            } else {
                data = await marketService.backtest(ticker, date, undefined, Number(amount), finalSellDate);
            }
            setResult(data);
        } catch (e) {
            console.error(e);
            setError("Failed to fetch backtest data. check ticker or date.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: '#000', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, p: 4, pl: { xs: 4, md: '140px' }, maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <RotateCcw size={32} color="#00E5FF" />
                    Backtrack
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 6 }}>
                    Simulate past investments. "If I had bought X shares of Y on date Z..."
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6 }}>
                    {/* Input Section */}
                    <Box component={motion.div} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <Card sx={{ bgcolor: '#0A0A0A', border: '1px solid #222', borderRadius: 4, p: 2, overflow: 'visible' }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <Autocomplete
                                    freeSolo
                                    options={searchOptions}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.symbol}
                                    onInputChange={async (event, newInputValue) => {
                                        setTicker(newInputValue.toUpperCase());
                                        if (newInputValue.length > 1) {
                                            try {
                                                const results = await marketService.searchStocks(newInputValue);
                                                setSearchOptions(results || []);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        } else {
                                            setSearchOptions([]);
                                        }
                                    }}
                                    onChange={(event, value: any) => {
                                        if (value) {
                                            const sym = typeof value === 'string' ? value : value.symbol;
                                            handleTickerSelect(sym);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Stock Ticker"
                                            placeholder="e.g. RELIANCE"
                                            fullWidth
                                            variant="outlined"
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': { borderColor: '#333' },
                                                    '& input': { color: '#fff', fontSize: '1.2rem', fontWeight: 700 }
                                                },
                                                '& .MuiInputBase-root': { color: '#fff' }
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option: any) => {
                                        const { key, ...otherProps } = props;
                                        return (
                                            <li key={key} {...otherProps} style={{ backgroundColor: '#111', color: '#fff', borderBottom: '1px solid #222' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#888' }}>{option.name}</Typography>
                                                </Box>
                                            </li>
                                        );
                                    }}
                                    PaperComponent={({ children }) => (
                                        <Paper sx={{ bgcolor: '#111', border: '1px solid #333', color: '#fff' }}>
                                            {children}
                                        </Paper>
                                    )}
                                />

                                <Box sx={{ opacity: ticker ? 1 : 0.5, pointerEvents: ticker ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                    <CustomDatePicker
                                        value={date}
                                        onChange={setDate}
                                        label={minDate ? `Buy Date (Data since: ${minDate})` : "Buy Date"}
                                        minDate={minDate}
                                    />
                                </Box>

                                {/* Sell Date Toggle */}
                                <Box sx={{ opacity: date ? 1 : 0.5, pointerEvents: date ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: useCustomSellDate ? 2 : 0 }}>
                                        <Typography
                                            onClick={() => {
                                                setUseCustomSellDate(false);
                                                setSellDate('');
                                            }}
                                            sx={{
                                                cursor: 'pointer',
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                bgcolor: !useCustomSellDate ? '#00E5FF' : 'transparent',
                                                color: !useCustomSellDate ? '#000' : '#666',
                                                fontWeight: !useCustomSellDate ? 700 : 500,
                                                border: !useCustomSellDate ? 'none' : '1px solid #333',
                                                transition: 'all 0.2s',
                                                '&:hover': { bgcolor: !useCustomSellDate ? '#00E5FF' : 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            Holding till today
                                        </Typography>
                                        <Typography
                                            onClick={() => setUseCustomSellDate(true)}
                                            sx={{
                                                cursor: 'pointer',
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                bgcolor: useCustomSellDate ? '#00E5FF' : 'transparent',
                                                color: useCustomSellDate ? '#000' : '#666',
                                                fontWeight: useCustomSellDate ? 700 : 500,
                                                border: useCustomSellDate ? 'none' : '1px solid #333',
                                                transition: 'all 0.2s',
                                                '&:hover': { bgcolor: useCustomSellDate ? '#00E5FF' : 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            Custom sell date
                                        </Typography>
                                    </Box>

                                    {/* Conditional Sell Date Picker */}
                                    {useCustomSellDate && (
                                        <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                                            <CustomDatePicker
                                                value={sellDate}
                                                onChange={setSellDate}
                                                label="Sell Date"
                                                minDate={date}
                                            />
                                        </Box>
                                    )}
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                        <Typography
                                            onClick={() => setInputMode('shares')}
                                            sx={{
                                                cursor: 'pointer',
                                                color: inputMode === 'shares' ? '#fff' : '#666',
                                                fontWeight: inputMode === 'shares' ? 700 : 500,
                                                borderBottom: inputMode === 'shares' ? '2px solid #00E5FF' : 'none'
                                            }}
                                        >
                                            By Shares
                                        </Typography>
                                        <Typography
                                            onClick={() => setInputMode('amount')}
                                            sx={{
                                                cursor: 'pointer',
                                                color: inputMode === 'amount' ? '#fff' : '#666',
                                                fontWeight: inputMode === 'amount' ? 700 : 500,
                                                borderBottom: inputMode === 'amount' ? '2px solid #00E5FF' : 'none'
                                            }}
                                        >
                                            By Amount (₹)
                                        </Typography>
                                    </Box>

                                    {inputMode === 'shares' ? (
                                        <TextField
                                            label="Number of Shares"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={shares}
                                            onChange={(e) => {
                                                const s = e.target.value;
                                                setShares(s);
                                                if (priceAtDate && s) {
                                                    setAmount((parseFloat(s) * priceAtDate).toFixed(2));
                                                }
                                            }}
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            InputProps={{ style: { color: '#fff' } }}
                                            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } } }}
                                        />
                                    ) : (
                                        <TextField
                                            label="Investment Amount (₹)"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={amount}
                                            onChange={(e) => {
                                                const a = e.target.value;
                                                setAmount(a);
                                                if (priceAtDate && a) {
                                                    setShares((parseFloat(a) / priceAtDate).toFixed(4));
                                                }
                                            }}
                                            InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                            InputProps={{
                                                style: { color: '#fff' },
                                                startAdornment: <Typography sx={{ color: '#666', mr: 1 }}>₹</Typography>
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } } }}
                                        />
                                    )}
                                </Box>

                                <Button
                                    onClick={handleCalculate}
                                    disabled={loading || !date || !ticker}
                                    variant="contained"
                                    sx={{
                                        py: 2,
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        '&:hover': { bgcolor: '#00B2CC' },
                                        '&.Mui-disabled': { bgcolor: '#222', color: '#666' }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Calculate Returns'}
                                </Button>
                                {error && <Typography color="error">{error}</Typography>}
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Result Section */}
                    <Box component={motion.div} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        {result ? (
                            <Card sx={{ bgcolor: '#0A0A0A', border: '1px solid #222', borderRadius: 4, height: '100%', position: 'relative', overflow: 'visible' }}>
                                {/* Glow Effect */}
                                <Box sx={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, bgcolor: result.pnl >= 0 ? '#10B981' : '#EF4444', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

                                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, height: '100%', justifyContent: 'center' }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="overline" sx={{ color: '#666', letterSpacing: '0.2em', fontWeight: 700 }}>NET PROFEIT / LOSS</Typography>
                                        <Typography variant="h1" sx={{ color: result.pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: { xs: '3rem', md: '4rem' }, letterSpacing: '-0.02em', my: 2 }}>
                                            {result.pnl >= 0 ? '+' : ''}₹{Math.abs(result.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </Typography>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 0.5, borderRadius: 2, bgcolor: result.pnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: result.pnl >= 0 ? '#10B981' : '#EF4444' }}>
                                            {result.pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>{result.pnl_percent.toFixed(2)}%</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderTop: '1px solid #222', pt: 4 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#666' }}>INVESTED VALUE</Typography>
                                            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{result.invested_value.toLocaleString()}</Typography>
                                            <Typography variant="caption" sx={{ color: '#444' }}>{result.shares} shares @ ₹{result.initial_price.toFixed(2)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#666' }}>CURRENT VALUE</Typography>
                                            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{result.current_value.toLocaleString()}</Typography>
                                            <Typography variant="caption" sx={{ color: '#444' }}>@ ₹{result.current_price.toFixed(2)} today</Typography>
                                        </Box>
                                    </Box>

                                    {/* Graph */}
                                    {result.history && result.history.length > 0 && (
                                        <Box sx={{ height: 200, mt: 2, width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={result.history}>
                                                    <defs>
                                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={result.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={result.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#666"
                                                        style={{ fontSize: '0.7rem' }}
                                                        tickLine={false}
                                                        interval={result.history.length > 20 ? 'preserveStartEnd' : 0}
                                                        angle={result.history.length > 10 ? -45 : 0}
                                                        textAnchor={result.history.length > 10 ? 'end' : 'middle'}
                                                        height={result.history.length > 10 ? 60 : 30}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Value']}
                                                        labelStyle={{ color: '#888' }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={result.pnl >= 0 ? '#10B981' : '#EF4444'}
                                                        fillOpacity={1}
                                                        fill="url(#colorValue)"
                                                        strokeWidth={2}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #222', borderRadius: 4, color: '#444', p: 4 }}>
                                <Typography variant="h6">Results will appear here</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}


# layout.tsx

'use client';

import Sidebar from '@/components/layout/Sidebar';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import DisclaimerModal from '@/components/layout/DisclaimerModal';
import { Box, Typography } from '@mui/material';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0B0B0B' }}>
            <DisclaimerModal />
            <Sidebar />

            {/* Top Right Floating Brand */}
            <Box sx={{ position: 'fixed', top: 28, right: 30, zIndex: 50 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#00E5FF', letterSpacing: '0.1em', fontSize: '1rem' }}>
                    CLARITY
                </Typography>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 6 }, pl: { xs: 2, md: '144px' }, py: { xs: 10, md: 6 }, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1 }}>{children}</Box>
                <DisclaimerFooter />
            </Box>
        </Box>
    );
}


# page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, IconButton, TextField, InputAdornment, Button, Tooltip, CircularProgress, Autocomplete } from '@mui/material';
import { Search, Bell, Settings, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, MessageSquare, PieChart, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';


export default function DashboardPage() {
    const router = useRouter();
    const [greeting, setGreeting] = useState('Good Evening');
    const [marketStatus, setMarketStatus] = useState<any[]>([]);
    const [topMovers, setTopMovers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchOptions, setSearchOptions] = useState<any[]>([]); // Search Suggestions State

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // 0. Load User
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        // 1. Time-based Greeting
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        // 2. Fetch Market Data (Status + Movers)
        const fetchMarket = async () => {
            // Fetch Status
            try {
                const statusData = await marketService.getMarketStatus();
                setMarketStatus(statusData);
            } catch (e) {
                console.error("Failed to fetch market status", e);
            }

            // Fetch Movers
            try {
                const moversData = await marketService.getTopMovers();
                setTopMovers(moversData);
            } catch (e) {
                console.error("Failed to fetch top movers", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMarket();
    }, []);

    // Dynamic Market Status Logic
    const getMarketStatusMessage = () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Weekend Check
        if (day === 0 || day === 6) return { text: 'Closed', color: '#EF4444', sub: 'Weekend' };

        // Market Hours: 09:15 - 15:30
        const totalMinutes = hour * 60 + minute;
        const start = 9 * 60 + 15;
        const end = 15 * 60 + 30;

        if (totalMinutes >= start && totalMinutes <= end) {
            return { text: 'Active', color: '#10B981', sub: 'Live' };
        }

        return { text: 'Closed', color: '#EF4444', sub: 'After Hours' };
    };

    const statusObj = getMarketStatusMessage();

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 6 }, pb: 4 }}>
            {/* Header: Minimal Greeting + Search */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: { xs: 4, md: 8 }, gap: { xs: 3, md: 0 } }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: '#fff', fontSize: { xs: '2rem', md: '3rem' } }}>
                        {greeting}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Trader'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#666', fontWeight: 500 }}>
                        Market is <span style={{ color: statusObj.color, fontWeight: 700 }}>{statusObj.text}</span> ({statusObj.sub}).
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', width: { xs: '100%', md: 400 } }}>
                    <Autocomplete
                        freeSolo
                        id="dashboard-search-autocomplete"
                        options={searchOptions}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.symbol} - ${option.name}`}
                        filterOptions={(x) => x} // Disable built-in filter, we use backend search
                        sx={{ width: '100%' }}
                        onInputChange={async (event, newInputValue) => {
                            if (newInputValue.length > 1) {
                                try {
                                    const results = await marketService.searchStocks(newInputValue);
                                    setSearchOptions(results || []);
                                } catch (e) {
                                    console.error(e);
                                }
                            } else {
                                setSearchOptions([]);
                            }
                        }}
                        onChange={(event, value: any) => {
                            if (value) {
                                const symbol = typeof value === 'string' ? value : value.symbol;
                                router.push(`/market/${symbol}`);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder="Search stocks..."
                                fullWidth
                                InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                    startAdornment: <Search size={20} color="#666" style={{ marginRight: 10 }} />,
                                    sx: {
                                        fontSize: '1rem',
                                        color: '#fff',
                                        borderBottom: '1px solid #333',
                                        pb: 0.5,
                                        transition: 'all 0.2s',
                                        '&:hover': { borderBottom: '1px solid #666' },
                                        '&.Mui-focused': { borderBottom: '1px solid #00E5FF' }
                                    }
                                }}
                            />
                        )}
                        renderOption={(props, option: any) => {
                            const { key, ...otherProps } = props;
                            return (
                                <li key={key} {...otherProps} style={{ backgroundColor: '#111', color: '#fff', borderBottom: '1px solid #222' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                                        <Typography variant="caption" sx={{ color: '#888' }}>{option.name}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                    />
                    <IconButton sx={{ color: '#666', '&:hover': { color: '#fff' } }}><Bell size={20} /></IconButton>
                    <Box sx={{ width: 36, height: 36, minWidth: 36, borderRadius: '50%', bgcolor: '#00E5FF', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                        {(user?.full_name || user?.email || 'T').charAt(0).toUpperCase()}
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={{ xs: 3, md: 6 }}>
                {/* Left Col: Main Stats (Portfolio) */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>Market Overview</Typography>
                        {loading ? (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <CircularProgress size={20} sx={{ color: '#444' }} />
                                <Typography sx={{ color: '#666' }}>Loading market data...</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={4}>
                                {marketStatus.length > 0 ? marketStatus.map((index) => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={index.index}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>{index.index}</Typography>
                                            <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5, fontSize: '2.5rem' }}>{index.current_formatted}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {index.change >= 0 ? <ArrowUpRight size={20} color="#10B981" /> : <ArrowDownRight size={20} color="#EF4444" />}
                                                <Typography variant="body1" sx={{ color: index.change >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                                    {index.change >= 0 ? '+' : ''}{index.change_formatted} ({index.percent_change_formatted})
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )) : (
                                    <Typography sx={{ color: '#666' }}>Market data unavailable.</Typography>
                                )}
                            </Grid>
                        )}
                    </Box>

                    {/* Quick Actions Grid */}
                    <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>Quick Actions</Typography>
                    <Grid container spacing={3}>
                        <ActionCard
                            icon={Zap}
                            title="Compare Stocks"
                            desc="Compare performance & AI insights"
                            onClick={() => router.push('/analysis')}
                            delay={0.1}
                        />
                        <ActionCard
                            icon={MessageSquare}
                            title="Ask Advisor"
                            desc="Chat with Clarity AI about strategy"
                            onClick={() => router.push('/advisor')}
                            delay={0.2}
                        />
                        <ActionCard
                            icon={Lightbulb}
                            title="Discovery Hub"
                            desc="Research sectors & build portfolios"
                            onClick={() => router.push('/sectors')}
                            delay={0.3}
                        />
                    </Grid>
                </Grid>

                {/* Right Col: Top Movers */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 4,
                            bgcolor: '#0A0A0A',
                            border: '1px solid #222',
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative Background Glow */}
                        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, bgcolor: '#00E5FF', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%' }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <TrendingUp size={20} className="text-[#00E5FF]" />
                                Top Movers
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {topMovers.length > 0 ? topMovers.map((stock) => (
                                <MoverRow
                                    key={stock.symbol}
                                    symbol={stock.symbol}
                                    price={stock.price}
                                    change={stock.change}
                                    isUp={stock.isUp}
                                    onClick={() => router.push(`/market/${stock.symbol}`)}
                                />
                            )) : (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <CircularProgress size={20} color="inherit" sx={{ color: '#444' }} />
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>


        </Box>
    );
}

function ActionCard({ icon: Icon, title, desc, onClick, delay }: any) {
    return (
        <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                onClick={onClick}
                sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: '#111',
                    border: '1px solid #222',
                    cursor: 'pointer',
                    height: '100%',
                    minHeight: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    '&:hover': {
                        borderColor: '#00E5FF',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 10px 30px -10px rgba(0, 229, 255, 0.1)'
                    }
                }}
            >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Icon size={20} color="#fff" />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>{desc}</Typography>
            </Paper>
        </Grid>
    );
}

function MarketRow({ name, value, change, isUp }: any) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{name}</Typography>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#ddd' }}>{value}</Typography>
                <Typography variant="caption" sx={{ color: isUp ? '#10B981' : '#EF4444', fontWeight: 600 }}>{change}</Typography>
            </Box>
        </Box>
    );
}

function MoverRow({ symbol, price, change, isUp, onClick }: any) {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', transform: 'translateX(4px)' }
            }}
        >
            <Box sx={{ display: 'flex', items: 'center', gap: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>
                    {symbol[0]}
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{symbol}</Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>NSE</Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>₹{price}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {isUp ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
                    <Typography variant="caption" sx={{ color: isUp ? '#10B981' : '#EF4444', fontWeight: 700 }}>{change}</Typography>
                </Box>
            </Box>
        </Box>
    );
}


# page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Container, Grid, CircularProgress } from '@mui/material';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User } from 'lucide-react';
import api from '@/services/api';
import { ErrorBanner } from '@/components/common/ErrorBanner';

// ... imports ...

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const controls = useAnimation();

    const handleLogin = async (e: React.FormEvent) => {
        // ...
        try {
            // Call Backend API using configured instance
            const response = await api.post('/auth/login', {
                email,
                password
            });

            const { access_token, user } = response.data;

            // Save Token (Cookie for Middleware, LocalStorage for Client calls)
            document.cookie = `token=${access_token}; path=/; max-age=86400; SameSite=Lax`; // 1 day
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            router.push('/dashboard');
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");

            // Trigger Shake Animation
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
            });
            // Clear password on error for UX
            if (err.response?.status === 401) setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B', // Almost black, deeper than slate
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
                    {/* Left: Brand / Editorial */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem' },
                                    fontWeight: 700,
                                    lineHeight: { xs: 1, md: 0.9 },
                                    letterSpacing: '-0.04em',
                                    mb: { xs: 2, md: 4 },
                                    mt: { xs: 0, md: -5 }
                                }}
                            >
                                CLARITY
                                <Box component="span" sx={{ color: '#00E5FF' }}>.</Box>
                            </Typography>

                            <Typography variant="h5" sx={{
                                fontWeight: 400,
                                color: '#A0A0A0',
                                maxWidth: 400,
                                mb: { xs: 4, md: 6 },
                                fontSize: { xs: '1.2rem', md: '1.5rem' },
                                lineHeight: 1.4
                            }}>
                                Easy investing analysis for everyone.
                            </Typography>

                            <MarketMetrics />
                        </motion.div>
                    </Grid>

                    {/* Right: Minimal Form */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ ml: 'auto' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >

                            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {error && (
                                    <ErrorBanner error={error} onRetry={() => setError(null)} />
                                )}

                                <motion.div
                                    animate={controls}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
                                >
                                    <MinimalInput
                                        label="EMAIL"
                                        placeholder="name@example.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        icon={<User size={18} color="#666" />}
                                    />
                                    <MinimalInput
                                        label="PASSWORD"
                                        placeholder="••••••••"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        icon={<Lock size={18} color="#666" />}
                                    />
                                </motion.div>

                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        mt: 2,
                                        py: 2.5,
                                        borderRadius: '16px', // Apple-style rounded rect
                                        bgcolor: '#fff', // White primary
                                        color: '#000',
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                        textTransform: 'none', // Remove uppercase for friendlier UI
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        opacity: loading ? 0.7 : 1,
                                        boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
                                        '&:hover': {
                                            bgcolor: '#f0f0f0',
                                            transform: 'scale(1.02)',
                                            boxShadow: '0 8px 30px rgba(255,255,255,0.2)'
                                        },
                                        '&:active': { transform: 'scale(0.98)' }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                                </Button>

                                <Box sx={{ textAlign: 'center', mt: 1 }}>
                                    <Link href="/signup" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
                                        Don't have an account? <span style={{ color: '#fff' }}>Join Clarity</span>
                                    </Link>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Decorative Grid Lines or Footer */}
            <Box
                sx={{
                    position: 'absolute', // Fixed causing issues on small screens overlap
                    bottom: { xs: 20, md: 40 },
                    left: { xs: 20, md: 40 },
                    right: { xs: 20, md: 40 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#333',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                    letterSpacing: '0.1em',
                    width: 'auto'
                }}
            >
                <Typography variant="inherit">© 2025 Clarity Financial</Typography>
            </Box>
        </Box>
    );
}

// --- Components ---

function MarketMetrics() {
    const [status, setStatus] = useState<any[]>([]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // Use configured api instance
                const res = await api.get('/market/status');
                setStatus(res.data);
            } catch (e) {
                console.error("Market Status Error", e);
                // Fallback
                setStatus([
                    { index: "MARKET", current: "OPEN", status: "OPEN" },
                    { index: "SENSEX", current: "72,400", percent_change: 0 },
                    { index: "NIFTY 50", current: "21,800", percent_change: 0 }
                ]);
            }
        };
        fetchStatus();
    }, []);

    const nifty = status.find(s => s.index === "NIFTY 50");
    const sensex = status.find(s => s.index === "SENSEX");

    const isMarketOpen = nifty?.status === 'OPEN';
    const marketStatusColor = isMarketOpen ? '#10B981' : '#EF4444';
    const marketStatusText = isMarketOpen ? 'OPEN' : 'CLOSED';

    if (status.length === 0) return (
        <Box sx={{ display: 'flex', gap: 4 }}>
            <Metric label="MARKET" value="LOADING..." color="#666" />
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', gap: 4 }}>
            {/* 1. Market Status */}
            <Metric
                label="MARKET"
                value={marketStatusText}
                color={marketStatusColor}
            />

            {/* 2. Nifty */}
            <Metric
                label="NIFTY"
                value={nifty?.current && typeof nifty.current === 'number' ? nifty.current.toLocaleString() : (nifty?.error ? "N/A" : "...")}
                color={nifty?.percent_change && nifty.percent_change >= 0 ? '#10B981' : (nifty?.percent_change < 0 ? '#EF4444' : '#fff')}
            />

            {/* 3. Sensex */}
            <Metric
                label="SENSEX"
                value={typeof sensex?.current === 'number' ? sensex.current.toLocaleString() : "..."}
            />
        </Box>
    );
}

interface MinimalInputProps {
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon?: React.ReactNode;
}

function MinimalInput({ label, type, placeholder, value, onChange, icon }: MinimalInputProps) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: '#666',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        fontSize: '0.75rem'
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <TextField
                fullWidth
                variant="standard"
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                InputProps={{
                    disableUnderline: true,
                    endAdornment: icon ? <Box sx={{ opacity: 0.5 }}>{icon}</Box> : null,
                    sx: {
                        fontSize: '1.2rem',
                        color: '#fff',
                        fontWeight: 500,
                        pb: 1.5,
                        borderBottom: '1px solid #333',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        '&:hover': { borderBottom: '1px solid #666' },
                        '&.Mui-focused': { borderBottom: '1px solid #fff' }
                    }
                }}
                sx={{
                    '& input::placeholder': { color: '#444', opacity: 1 }
                }}
            />
        </Box>
    );
}

function Metric({ label, value, color }: { label: string, value: string, color?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: '#444', display: 'block', letterSpacing: '0.05em', mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h6" sx={{ color: color || '#fff', fontWeight: 600 }}>
                {value}
            </Typography>
        </Box>
    );
}


# layout.tsx

'use client';

import Sidebar from '@/components/layout/Sidebar';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import DisclaimerModal from '@/components/layout/DisclaimerModal';
import { Box, Typography } from '@mui/material';

export default function MarketLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0B0B0B' }}>
            <DisclaimerModal />
            <Sidebar />

            {/* Top Right Floating Brand - Consistent with Dashboard */}
            <Box sx={{ position: 'fixed', top: 28, right: 30, zIndex: 50 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#00E5FF', letterSpacing: '0.1em', fontSize: '1rem' }}>
                    CLARITY
                </Typography>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 6 }, pl: { xs: 2, md: '144px' }, py: { xs: 10, md: 6 }, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1 }}>{children}</Box>
                <DisclaimerFooter />
            </Box>
        </Box>
    );
}


# page.tsx

'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemButton, Paper, Container } from '@mui/material';
import { Search, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import StockSearchInput from '@/components/market/StockSearchInput';

export default function MarketHome() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pt: 10
            }}
        >
            <Container maxWidth="md">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', md: '5rem' },
                            fontWeight: 700,
                            textAlign: 'center',
                            mb: 2,
                            letterSpacing: '-0.03em',
                            lineHeight: 1
                        }}
                    >
                        MARKET<br />INTELLIGENCE
                        <Box component="span" sx={{ color: '#00E5FF' }}>.</Box>
                    </Typography>

                    <Typography variant="h5" sx={{ textAlign: 'center', color: '#666', mb: 8, fontWeight: 400 }}>
                        Search any asset to unlock AI-powered insights.
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <Box sx={{ width: '100%' }}>
                        <StockSearchInput
                            value={query}
                            onChange={setQuery}
                            onSelect={(item) => router.push(`/market/${item.symbol}`)}
                            placeholder="Type a symbol (e.g. RELIANCE)..."
                            variant="hero"
                            autoFocus
                        />
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}


# page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Grid, Chip, CircularProgress, Button, Tab, Tabs, Tooltip, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Activity, Newspaper, Brain, Info } from 'lucide-react';
import { useParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { marketService } from '@/services/marketService';

export default function StockPage() {
    const params = useParams();
    const symbol = (params.symbol as string).toUpperCase();

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [news, setNews] = useState<any[]>([]);

    // UI State
    const [timeRange, setTimeRange] = useState('1mo');
    const [configOpen, setConfigOpen] = useState(false);
    const [fastReload, setFastReload] = useState(false);
    const [updateInterval, setUpdateInterval] = useState(5); // Minutes
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [buyListModalOpen, setBuyListModalOpen] = useState(false);

    // Watchlist Form State
    const [buyTarget, setBuyTarget] = useState('');
    const [sellTarget, setSellTarget] = useState('');
    const [notes, setNotes] = useState('');

    const [watchlists, setWatchlists] = useState<any[]>([]); // Current watchlist items
    const [userPortfolios, setUserPortfolios] = useState<any[]>([]);

    useEffect(() => {
        // Fetch User Portfolios for the modal
        marketService.getPortfolios().then(res => setUserPortfolios(res)).catch(console.error);
        marketService.getWatchlist().then(res => setWatchlists(res)).catch(console.error);
    }, []);

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel fetching for speed
            const [details, history, summaryData] = await Promise.all([
                marketService.getStockDetails(symbol),
                marketService.getStockHistory(symbol, timeRange),
                marketService.getAggregatedStockAnalysis(symbol).catch(() => ({ summary: "AI Analysis unavailable." }))
            ]);

            setData(details);
            setChartData(history);
            setAiSummary(summaryData.summary);
            // Assuming details contains news, or we fetch it separately. 
            // For now, let's map details.news if available, or fall back to empty.
            if (details.news) {
                setNews(details.news);
            }

        } catch (err: any) {
            console.error("Failed to load stock data:", err);
            setError("Failed to load stock data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [symbol, timeRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '80vh', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{ display: 'flex', height: '80vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <Typography color="error" gutterBottom>{error || 'Stock not found'}</Typography>
                <Button variant="outlined" onClick={() => window.location.href = '/analysis'}>Go Back</Button>
            </Box>
        );
    }

    // Use Real Data
    // Fallback if API returns partial data
    const price = data.market_data?.price_formatted || `₹${data.market_data?.price?.toFixed(2) || '0.00'}`;
    const change = data.market_data?.change || 0;
    const changePercent = data.market_data?.changePercent || 0; // Assuming backend sends this, or we calc it? 
    // Wait, backend consensus doesn't send changePercent explicitly in top level market_data sometimes?
    // Let's check: market_service.py says: "price_formatted": format_inr(price_data.get("price", 0.0)).
    // It does NOT seem to send change/changePercent in market_data unless consensus engine does valid lookup.
    // We should be safe with optionals.

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', pb: 10 }}>
            {/* Minimal Header */}
            <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                    <Typography variant="h1" sx={{ fontWeight: 700, fontSize: { xs: '3rem', md: '5rem' }, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
                        {data.symbol}
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#666', fontWeight: 400 }}>
                        {data.name || data.symbol}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant="h2" sx={{ fontWeight: 600, fontSize: { xs: '2rem', md: '3rem' } }}>
                        {price}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: change >= 0 ? '#10B981' : '#EF4444', bgcolor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', px: 1.5, py: 0.5, borderRadius: 1 }}>
                        {change >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                        <Typography variant="h6" sx={{ fontWeight: 600, ml: 0.5 }}>
                            {change > 0 ? '+' : ''}{Number(change).toFixed(2)} ({Number(changePercent).toFixed(2)}%)
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={6}>
                {/* Left Column: Chart & Analysis */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {/* Chart Container */}
                    <Box sx={{ height: 450, bgcolor: '#111', borderRadius: 4, p: 3, border: '1px solid #222', mb: 6, position: 'relative' }}>
                        {/* Time Range Selectors */}
                        <Box sx={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', gap: 1 }}>
                            {['1d', '5d', '1mo', '3mo', '6mo', '1y', 'ytd', 'max'].map((range) => (
                                <Button
                                    key={range}
                                    size="small"
                                    onClick={() => setTimeRange(range)}
                                    sx={{
                                        minWidth: 0,
                                        px: 1.5,
                                        color: timeRange === range ? '#00E5FF' : '#666',
                                        fontWeight: 700,
                                        bgcolor: timeRange === range ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                        '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    {range.toUpperCase()}
                                </Button>
                            ))}
                            {/* Config Icon for 5M/Fast Reload */}
                            <Tooltip title="Configure update interval">
                                <IconButton
                                    size="small"
                                    onClick={() => setConfigOpen(true)}
                                    sx={{ color: '#444', ml: 1, '&:hover': { color: '#fff' } }}
                                >
                                    <TrendingUp size={16} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ width: '100%', height: '100%', pt: 4 }}>
                            {/* Chart uses chartData state which matches backend format (date, open, close...) */}
                            {chartData && chartData.length > 0 ? (
                                (() => {
                                    // Check if data spans multiple years
                                    const years = new Set(chartData.map(d => new Date(d.date).getFullYear()));
                                    const showYear = years.size > 1;

                                    return (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(val) => {
                                                        const d = new Date(val);
                                                        return timeRange === '1d' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                    }}
                                                    axisLine={false} tickLine={false} tick={{ fill: '#444' }} dy={10}
                                                />
                                                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#444' }} width={45} />
                                                <RechartsTooltip content={<CustomTooltip timeRange={timeRange} showYear={showYear} />} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="close"
                                                    stroke="#00E5FF"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorPrice)"
                                                    animationDuration={1000}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    );
                                })()
                            ) : (
                                <Box sx={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                    <Typography color="text.secondary">No chart data for this period</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* AI Verdict Section */}
                    <Box sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Brain size={28} color="#00E5FF" />
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>The Clarity Verdict</Typography>
                            <Chip label={data.scores?.recommendation?.action || "AI ANALYZING"} sx={{ bgcolor: '#10B981', color: '#000', fontWeight: 700, borderRadius: 1 }} />
                        </Box>
                        <Typography variant="body1" sx={{ color: '#ccc', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '90%' }}>
                            {data.scores?.recommendation?.reasoning || aiSummary || "Generating real-time analysis..."}
                        </Typography>
                    </Box>
                </Grid>

                {/* Right Column: Stats & Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" sx={{ color: '#666', letterSpacing: '0.1em', fontWeight: 600, mb: 3, display: 'block' }}>KEY STATISTICS</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6 }}>
                        <StatRow label="Market Cap" value={formatMarketCap(data.fundamentals?.market_cap)} />
                        <StatRow label="P/E Ratio" value={getPE(data.fundamentals)} />
                        <StatRow label="52W High" value={getHighLow(data.fundamentals).high} />
                        <StatRow label="52W Low" value={getHighLow(data.fundamentals).low} />
                    </Box>

                    <Typography variant="caption" sx={{ color: '#666', letterSpacing: '0.1em', fontWeight: 600, mb: 3, display: 'block' }}>ACTIONS</Typography>

                    {/* Add to Buy List */}
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={() => setBuyListModalOpen(true)}
                        sx={{
                            bgcolor: '#fff',
                            color: '#000',
                            py: 2,
                            fontWeight: 700,
                            fontSize: '1rem',
                            mb: 2,
                            '&:hover': { bgcolor: '#ddd' }
                        }}
                    >
                        Add to Buy List
                    </Button>

                    {/* Buy List Selection Modal */}
                    <Dialog
                        open={buyListModalOpen}
                        onClose={() => setBuyListModalOpen(false)}
                        PaperProps={{
                            sx: {
                                bgcolor: '#0B0B0B',
                                border: '1px solid #333',
                                borderRadius: 4,
                                minWidth: 500,
                                p: 2,
                                backgroundImage: 'none'
                            }
                        }}
                    >
                        <DialogTitle sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 2 }}>
                            ADD TO WATCHLIST
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                                <Typography sx={{ color: '#888', textAlign: 'center', mb: 1 }}>
                                    Set targets and notes for <b>{symbol}</b>
                                </Typography>

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        label="Target Buy Price"
                                        type="number"
                                        fullWidth
                                        variant="outlined"
                                        InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                        InputProps={{ style: { color: '#fff' } }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' }, '&:hover fieldset': { borderColor: '#555' } }
                                        }}
                                        onChange={(e) => setBuyTarget(e.target.value)}
                                    />
                                    <TextField
                                        label="Target Sell Price"
                                        type="number"
                                        fullWidth
                                        variant="outlined"
                                        InputLabelProps={{ shrink: true, style: { color: '#666' } }}
                                        InputProps={{ style: { color: '#fff' } }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' }, '&:hover fieldset': { borderColor: '#555' } }
                                        }}
                                        onChange={(e) => setSellTarget(e.target.value)}
                                    />
                                </Box>

                                <TextField
                                    label="Notes (Strategy, thesis...)"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    variant="outlined"
                                    InputLabelProps={{ style: { color: '#666' } }}
                                    InputProps={{ style: { color: '#fff' } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' }, '&:hover fieldset': { borderColor: '#555' } }
                                    }}
                                    onChange={(e) => setNotes(e.target.value)}
                                />

                                <Button
                                    onClick={async () => {
                                        try {
                                            await marketService.addToWatchlist(symbol, {
                                                target_buy_price: buyTarget ? parseFloat(buyTarget) : undefined,
                                                target_sell_price: sellTarget ? parseFloat(sellTarget) : undefined,
                                                notes: notes
                                            });
                                            setBuyListModalOpen(false);
                                            // Reset form
                                            setBuyTarget('');
                                            setSellTarget('');
                                            setNotes('');
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    sx={{
                                        justifyContent: 'center',
                                        textTransform: 'none',
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        '&:hover': { bgcolor: '#00B2CC' }
                                    }}
                                >
                                    Confirm Add
                                </Button>
                            </Box>
                        </DialogContent>
                    </Dialog>

                    {/* Add to Portfolio Button */}
                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<Zap size={18} />}
                        onClick={() => setPortfolioModalOpen(true)}
                        sx={{
                            color: '#00E5FF',
                            borderColor: 'rgba(0, 229, 255, 0.3)',
                            py: 2,
                            fontWeight: 600,
                            '&:hover': { borderColor: '#00E5FF', bgcolor: 'rgba(0, 229, 255, 0.05)' }
                        }}
                    >
                        Add to Portfolio
                    </Button>

                    {/* Portfolio Selection Modal */}
                    <Dialog
                        open={portfolioModalOpen}
                        onClose={() => setPortfolioModalOpen(false)}
                        PaperProps={{
                            sx: { bgcolor: '#0B0B0B', border: '1px solid #333', borderRadius: 4, minWidth: 500, p: 2 }
                        }}
                    >
                        <DialogTitle sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 2 }}>
                            SELECT PORTFOLIO
                        </DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {userPortfolios.length > 0 ? userPortfolios.map((portfolio: any) => (
                                    <Button
                                        key={portfolio.id}
                                        onClick={async () => {
                                            try {
                                                const currentPrice = data.market_data?.price || 0;
                                                await marketService.addToPortfolio(portfolio.id, {
                                                    ticker: symbol,
                                                    shares: 1,
                                                    avg_price: currentPrice
                                                });
                                                setPortfolioModalOpen(false);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        sx={{
                                            justifyContent: 'space-between',
                                            textTransform: 'none',
                                            bgcolor: '#111',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            py: 3,
                                            px: 3,
                                            borderRadius: 3,
                                            '&:hover': { bgcolor: '#222', borderColor: '#555' }
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{portfolio.name}</Typography>
                                        <Typography variant="caption" sx={{ color: '#00E5FF' }}>+ Add Stock</Typography>
                                    </Button>
                                )) : (
                                    <Typography sx={{ color: '#666', textAlign: 'center' }}>No portfolios found.</Typography>
                                )}

                                {/* Create New Portfolio Button */}
                                <Button
                                    onClick={async () => {
                                        const name = prompt("Enter new portfolio name:");
                                        if (name) {
                                            try {
                                                // Create portfolio
                                                // We need to import portfolioService or access creation logic.
                                                // Since we are in StockPage using marketService, we can add a createPortfolio method there or just use fetch directly for now to save imports?
                                                // Actually, let's use marketService (we need to add the method).
                                                // Or better, redirect to portfolio page? User wants "option to create".
                                                // Inline is better.
                                                // Adding createPortfolio to marketService is cleanest.
                                                // But wait, I can just use `window.location.href` to Portfolio page if too complex, 
                                                // BUT user said "create new portfolio button HERE".
                                                // I will add `createPortfolio` to `marketService` after this.
                                                await marketService.createPortfolio(name);
                                                // Refresh list
                                                const res = await marketService.getPortfolios();
                                                setUserPortfolios(res);
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to create portfolio");
                                            }
                                        }
                                    }}
                                    sx={{
                                        mt: 2,
                                        justifyContent: 'center',
                                        textTransform: 'none',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px dashed #444',
                                        backdropFilter: 'blur(10px)',
                                        color: '#888',
                                        py: 3,
                                        borderRadius: 3,
                                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#fff', borderColor: '#fff' }
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>+ Create New Portfolio</Typography>
                                </Button>
                            </Box>
                        </DialogContent>
                    </Dialog>
                </Grid>
            </Grid>

            {/* --- NEW SECTION: News & Clarity Summary --- */}
            <Box sx={{ mt: 8 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 4, letterSpacing: '-0.02em' }}>Latest News</Typography>

                {/* 1. Clarity AI News Summary */}
                <Box sx={{
                    bgcolor: 'rgba(0,0,0,0.5)',
                    border: '1px solid #333',
                    borderRadius: 4,
                    p: 4,
                    mb: 5,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        {/* Unique Clarity Icon (Custom SVG) */}
                        <Box sx={{
                            minWidth: 48, height: 48,
                            borderRadius: '12px',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="rgba(0, 229, 255, 0.2)" />
                                <path d="M2 17L12 22L22 17" />
                                <path d="M2 12L12 17L22 12" />
                            </svg>
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                Clarity News Insight
                                <Chip label="AI GENERATED" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontSize: '0.65rem', fontWeight: 800, height: 20 }} />
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.6 }}>
                                {aiSummary || data.summary || "Analyzing latest market news..."}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 2. News Grid */}
                <Grid container spacing={4}>
                    {news.map((item: any, index: number) => (
                        <Grid size={{ xs: 12, md: 4 }} key={index}>
                            <Box
                                onClick={() => item.link && window.open(item.link, '_blank')}
                                sx={{
                                    group: 'true',
                                    cursor: 'pointer',
                                    '&:hover .news-img': { transform: 'scale(1.05)' },
                                    '&:hover .news-title': { color: '#00E5FF' }
                                }}>
                                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                    {/* Header: Logo + Source + Time */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        {/* Logo */}
                                        <Box sx={{
                                            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', bgcolor: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${item.link || item.source}&sz=64`}
                                                alt={item.source}
                                                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                                onError={(e: any) => { e.target.style.display = 'none'; }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 700, display: 'block', lineHeight: 1 }}>{item.source || 'Market News'}</Typography>
                                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>{item.time || 'Today'}</Typography>
                                        </Box>
                                    </Box>

                                    {/* Title */}
                                    <Typography
                                        className="news-title"
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700, lineHeight: 1.3, mb: 1, color: '#eee',
                                            transition: 'color 0.2s',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                        }}
                                    >
                                        {item.title}
                                    </Typography>

                                    {/* Summary */}
                                    <Typography variant="body2" sx={{ color: '#888', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {item.summary || item.description}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Configuration Modal */}
            <Dialog
                open={configOpen}
                onClose={() => setConfigOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#0B0B0B',
                        border: '1px solid #333',
                        borderRadius: 4,
                        minWidth: 400,
                        backgroundImage: 'none'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', fontWeight: 700, borderBottom: '1px solid #222' }}>
                    Data Configuration
                </DialogTitle>
                <DialogContent sx={{ pt: 4 }}>
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>Update Frequency</Typography>

                        {/* Preset Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                            {[
                                { label: 'Realtime', value: 0.2 }, // ~12s
                                { label: '1m', value: 1 },
                                { label: '5m', value: 5 },
                                { label: '15m', value: 15 }
                            ].map((option) => (
                                <Button
                                    key={option.label}
                                    variant={updateInterval === option.value ? "contained" : "outlined"}
                                    onClick={() => {
                                        setUpdateInterval(option.value);
                                        setFastReload(option.value < 5);
                                    }}
                                    sx={{
                                        bgcolor: updateInterval === option.value ? '#00E5FF' : 'transparent',
                                        color: updateInterval === option.value ? '#000' : '#666',
                                        borderColor: updateInterval === option.value ? '#00E5FF' : '#333',
                                        '&:hover': {
                                            bgcolor: updateInterval === option.value ? '#00E5FF' : 'rgba(255,255,255,0.05)',
                                            borderColor: updateInterval === option.value ? '#00E5FF' : '#444'
                                        }
                                    }}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </Box>

                        {/* Custom Input */}
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                label="Custom Interval (Minutes)"
                                type="number"
                                value={updateInterval}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setUpdateInterval(val);
                                    setFastReload(val < 5);
                                }}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#333' },
                                        '&:hover fieldset': { borderColor: '#444' },
                                        '&.Mui-focused fieldset': { borderColor: '#00E5FF' }
                                    },
                                    '& .MuiInputLabel-root': { color: '#666' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#00E5FF' }
                                }}
                            />
                        </Box>


                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #222' }}>
                    <Button onClick={() => setConfigOpen(false)} sx={{ color: '#666' }}>Cancel</Button>
                    <Button
                        onClick={() => setConfigOpen(false)}
                        variant="contained"
                        sx={{ bgcolor: '#fff', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#ddd' } }}
                    >
                        Save Preferences
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Format Market Cap Helper
function formatMarketCap(val: any) {
    if (!val) return 'N/A';
    // Clean string: remove ₹, Cr, commas, newlines, spaces
    const cleanStr = String(val).replace(/[₹,Cr.\n\s]/g, '');
    const num = parseFloat(cleanStr);

    if (isNaN(num)) return 'N/A';

    // Check if original string contained "Cr" or "Tr" to decide output unit
    // But commonly just formatting nicely is enough.
    // If num is huge (e.g. 2000000), treat as Cr if standard.
    // Given the example "276061 Cr", the number IS in Crores already.

    return `₹${num.toLocaleString('en-IN')} Cr`;
}

// Helper to get P/E
function getPE(fundamentals: any) {
    if (!fundamentals) return 'N/A';
    return fundamentals.pe_ratio || fundamentals['stock_p/e'] || 'N/A';
}

// Helper to get High/Low
function getHighLow(fundamentals: any) {
    if (!fundamentals) return { high: 'N/A', low: 'N/A' };

    // Check normalized keys first
    if (fundamentals.high_52w && fundamentals.low_52w) {
        return { high: `₹${fundamentals.high_52w}`, low: `₹${fundamentals.low_52w}` };
    }

    // Parse "high_/_low": "₹ 2613 / 1965"
    if (fundamentals['high_/_low']) {
        const parts = String(fundamentals['high_/_low']).replace(/[₹,]/g, '').split('/');
        if (parts.length === 2) {
            return {
                high: `₹${parts[0].trim()}`,
                low: `₹${parts[1].trim()}`
            };
        }
    }

    return { high: 'N/A', low: 'N/A' };
}

function StatRow({ label, value }: { label: string, value: string | number }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #222' }}>
            <Typography variant="body1" sx={{ color: '#888' }}>{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>{value}</Typography>
        </Box>
    );
}

function CustomTooltip({ active, payload, label, timeRange, showYear }: any) {
    if (active && payload && payload.length) {
        let dateStr = '';
        const dateObj = new Date(label);

        // Tooltip Logic:
        // If timeRange > 1d, hide time (show nothing for time).
        // If two diff years (showYear=true), include year.

        const isOneDay = timeRange === '1d' || timeRange === '5m';

        if (isOneDay) {
            // Show Time
            dateStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Show Date Only
            const options: any = { month: 'short', day: 'numeric' };
            if (showYear) {
                options.year = 'numeric';
            }
            dateStr = dateObj.toLocaleDateString([], options);
        }

        return (
            <Box sx={{
                bgcolor: 'rgba(10, 10, 10, 0.8)',
                border: '1px solid #333',
                borderRadius: 2,
                p: 1.5,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                minWidth: 140
            }}>
                <Typography variant="body2" sx={{ color: '#888', mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>
                    {dateStr}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                        ₹{parseFloat(payload[0].value).toFixed(2)}
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, fontSize: '0.7rem' }}>
                    Market Price
                </Typography>
            </Box>
        );
    }
    return null;
}


# page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';
import { Box, Typography, Grid, Button, LinearProgress, Chip, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Menu, ListItemIcon, Divider, Card, CardContent, CardActionArea, Autocomplete, Paper, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, Plus, Wallet, PieChart as PieChartIcon, X, Search, ChevronDown, FolderPlus, Folder, Trash2, ArrowLeft, ArrowRight, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import { portfolioService } from '@/services/portfolioService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import PortfolioChart from '@/components/portfolio/PortfolioChart';
import AddTransactionModal from '@/components/portfolio/AddTransactionModal';


// --- Interfaces ---
interface Holding {
    ticker: string;
    shares: number;
    avg_price: number;
    current_price: number; // Simulated "Live" price
    current_value: number;
    invested_value: number;
    gain: number;
    gain_pct: number;
}

interface Portfolio {
    id: string;
    name: string;
    total_value: number;
    total_invested: number;
    total_gain: number;
    return_pct: number;
    holdings: Holding[];
}

// --- Initial Mock Data ---
const SECTOR_COLORS = ['#00E5FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export default function PortfolioPage() {
    // --- State ---
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [view, setView] = useState<'holdings' | 'allocation'>('holdings'); // Detail sub-view
    const [loading, setLoading] = useState(true);

    // Multi-Portfolio State
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    // Modals & Menus
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [portfolioMenuAnchor, setPortfolioMenuAnchor] = useState<null | HTMLElement>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);

    // --- Simulation Init ---
    // --- Actions ---
    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const data = await portfolioService.listPortfolios();
            // The list endpoint returns basic info. We might need to map it to our UI model.
            // But for the list view, we need total_value etc.
            // Currently backend list endpoint returns just ID/Name.
            // We probably need to fetch performance for ALL portfolios or just the active one?
            // For the "My Portfolios" card view, we show totals.
            // Let's fetch performance for each portfolio in parallel to populate the cards.

            const detailedPortfolios = await Promise.all(data.map(async (p) => {
                try {
                    const perf = await portfolioService.getPortfolioPerformance(p.id);
                    return {
                        id: p.id,
                        name: p.name,
                        ...perf
                    };
                } catch (e) {
                    return {
                        id: p.id,
                        name: p.name,
                        total_value: 0,
                        total_invested: 0,
                        total_gain: 0,
                        return_pct: 0,
                        holdings: []
                    };
                }
            }));

            setPortfolios(detailedPortfolios);
        } catch (error) {
            console.error("Failed to fetch portfolios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const activePortfolio = useMemo(() => portfolios.find(p => p.id === activeId), [portfolios, activeId]);

    const handlePortfolioClick = async (id: string) => {
        setActiveId(id);
        setViewMode('detail');
        // Refresh performance to get latest live prices
        try {
            const perf = await portfolioService.getPortfolioPerformance(id);
            setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...perf } : p));
        } catch (e) {
            console.error("Failed to refresh active portfolio", e);
        }
    };

    const handleBackToList = () => {
        setViewMode('list');
        setActiveId('');
        fetchPortfolios(); // Refresh summaries when going back
    };

    const handleCreatePortfolio = async (name: string) => {
        try {
            await portfolioService.createPortfolio(name);
            await fetchPortfolios();
            setIsCreateModalOpen(false);
        } catch (e) {
            console.error("Create failed", e);
        }
    };

    const handleDeletePortfolio = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPortfolioToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!portfolioToDelete) return;

        try {
            await portfolioService.deletePortfolio(portfolioToDelete);
            setPortfolios(prev => prev.filter(p => p.id !== portfolioToDelete));
            if (activeId === portfolioToDelete) {
                setActiveId('');
                setViewMode('list');
            }
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setDeleteConfirmOpen(false);
            setPortfolioToDelete(null);
        }
    };

    // ... existing code ...

    // --- At the bottom, fix subcomponents --- (Removed duplicates)

    const handleAddTransaction = async (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL') => {
        if (!activeId) return;

        try {
            // Backend "Add Holding" is basically designed for initial add, 
            // but we can use it. However, properly we should check if exists and update shares?
            // The backend `add_holding` just inserts a new row. 
            // If we want to support multiple lots, that's fine (FIFO).
            // But our UI currently aggregates by ticker.

            // For simplicity in this version, we will just INSERT a new holding row.
            // The Backend Performance endpoint aggregates them? 
            // Let's check backend... `get_portfolio_performance` loops through holdings.
            // If we have multiple rows for RELIANCE, it will calculate each separately.
            // The UI might show duplicate rows if we don't aggregate.
            // The backend returns `detailed_holdings` list.

            // Implementation: Just add it.
            // Note: SELL logic isn't fully supported by backend `add_holding` unless we send negative shares?

            if (type === 'SELL') {
                alert("Sell transactions not yet fully supported in this version. Please delete the holding or update shares manually.");
                return;
            }

            await portfolioService.addHolding(activeId, {
                ticker,
                shares,
                avg_price: price,
                exchange: "NSE",
                allocation_percent: 0
            });

            // Refresh data
            const perf = await portfolioService.getPortfolioPerformance(activeId);
            setPortfolios(prev => prev.map(p => p.id === activeId ? { ...p, ...perf } : p));
            setIsTxModalOpen(false);

        } catch (e) {
            console.error("Transaction failed", e);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#000' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    const allocationData = activePortfolio ? activePortfolio.holdings.map((h, i) => ({
        name: h.ticker,
        value: h.current_value,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length]
    })) : [];

    return (
        <>
            <Sidebar />
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                sx={{
                    maxWidth: 1600,
                    mx: 'auto',
                    pb: 10,
                    pt: 6,
                    bgcolor: '#000',
                    minHeight: '100vh',
                    pr: { xs: 2, md: 6 },
                    pl: { xs: 2, md: '140px' }
                }}
            >
                {/* --- LIST VIEW --- */}
                {viewMode === 'list' && (
                    <Box>
                        <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>My Portfolios</Typography>
                                <Typography variant="body1" sx={{ color: '#666' }}>Select a portfolio to manage holdings and analyze performance.</Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={20} />}
                                onClick={() => setIsCreateModalOpen(true)}
                                sx={{
                                    bgcolor: '#00E5FF',
                                    color: '#000',
                                    fontWeight: 700,
                                    py: 1.5,
                                    px: 3,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: '#00B2CC' }
                                }}
                            >
                                New Portfolio
                            </Button>
                        </Box>

                        <Grid container spacing={3}>
                            {portfolios.map((p, i) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={p.id}>
                                    <Card
                                        onClick={() => handlePortfolioClick(p.id)}
                                        sx={{
                                            bgcolor: '#0A0A0A',
                                            border: '1px solid #222',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                border: '1px solid #333',
                                                bgcolor: '#111'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF' }}>
                                                        <Folder size={24} />
                                                    </Box>
                                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>{p.name}</Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleDeletePortfolio(p.id, e)}
                                                    sx={{
                                                        color: '#333',
                                                        width: 32,
                                                        height: 32,
                                                        flexShrink: 0,
                                                        '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ mb: 3 }}>
                                                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL VALUE</Typography>
                                                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>₹{p.total_value.toLocaleString()}</Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Chip
                                                    icon={p.total_gain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                    label={`${p.total_gain >= 0 ? '+' : ''}${p.return_pct}%`}
                                                    sx={{
                                                        bgcolor: p.total_gain >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: p.total_gain >= 0 ? '#10B981' : '#EF4444',
                                                        fontWeight: 700,
                                                        borderRadius: 2
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ color: '#666' }}>
                                                    {p.total_gain >= 0 ? '+' : ''}₹{p.total_gain.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}

                            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: 240,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        border: '2px dashed #222',
                                        borderRadius: 4,
                                        color: '#333',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: '#00E5FF',
                                            color: '#00E5FF',
                                            bgcolor: 'rgba(0, 229, 255, 0.02)'
                                        }
                                    }}
                                >
                                    <FolderPlus size={32} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Create New Portfolio</Typography>
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'detail' && activePortfolio && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        {/* Header Section */}
                        <Box sx={{ mb: 6 }}>
                            <Button
                                onClick={handleBackToList}
                                startIcon={<ArrowLeft size={18} />}
                                sx={{ color: '#666', mb: 3, '&:hover': { color: '#fff' } }}
                            >
                                Back to Portfolios
                            </Button>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>{activePortfolio.name}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                        <Typography variant="h1" sx={{ fontSize: { xs: '3.5rem', md: '5rem' }, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.04em', color: '#fff' }}>
                                            ₹{activePortfolio.total_value.toLocaleString()}
                                        </Typography>

                                        <Chip
                                            icon={<TrendingUp size={20} />}
                                            label={`+₹${activePortfolio.total_gain.toLocaleString()} (${activePortfolio.return_pct}%)`}
                                            sx={{
                                                bgcolor: 'rgba(16, 185, 129, 0.15)',
                                                color: '#10B981',
                                                fontWeight: 700,
                                                height: 40,
                                                px: 1,
                                                borderRadius: 3,
                                                '& .lucide': { color: '#10B981' },
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={20} />}
                                    onClick={() => setIsTxModalOpen(true)}
                                    sx={{
                                        bgcolor: '#fff',
                                        color: '#000',
                                        fontWeight: 700,
                                        py: 2,
                                        px: 4,
                                        borderRadius: 4,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        '&:hover': { bgcolor: '#e0e0e0' }
                                    }}
                                >
                                    Add Transaction
                                </Button>
                            </Box>
                        </Box>

                        <Grid container spacing={6}>
                            {/* Main Content Area */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                {/* View Toggle */}
                                <Box sx={{ display: 'flex', gap: 3, mb: 4, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0 }}>
                                    <TabButton active={view === 'holdings'} onClick={() => setView('holdings')} label="Holdings" icon={Wallet} />
                                    <TabButton active={view === 'allocation'} onClick={() => setView('allocation')} label="Allocation" icon={PieChartIcon} />
                                </Box>

                                {view === 'holdings' ? (
                                    <motion.div
                                        key={activeId} // Force re-render on portfolio switch
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <HoldingsTable portfolio={activePortfolio} />
                                    </motion.div>
                                ) : (
                                    <PortfolioChart data={allocationData} />
                                )}
                            </Grid>

                            {/* Sidebar Stats */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box component={motion.div} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                    <Box sx={{ bgcolor: 'transparent', mb: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>PORTFOLIO HEALTH</Typography>
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <StatBar label="Equity Allocation" value={activePortfolio.total_value > 0 ? 100 : 0} color="#00E5FF" />
                                            <StatBar label="Cash Balance" value={0} color="#333" />
                                        </Box>
                                    </Box>
                                    {/* Additional metrics can go here */}
                                    <Box sx={{ borderTop: '1px solid #222', pt: 4 }}>
                                        <Typography variant="overline" sx={{ color: '#666', fontWeight: 700, letterSpacing: '0.1em' }}>KEY METRICS</Typography>
                                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                <Typography variant="caption" sx={{ color: '#888' }}>Total Invested</Typography>
                                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>₹{(activePortfolio.total_invested / 100000).toFixed(2)}L</Typography>
                                            </Box>
                                            <Box sx={{ p: 3, bgcolor: '#050505', borderRadius: 3, border: '1px solid #222' }}>
                                                <Typography variant="caption" sx={{ color: '#888' }}>Total Gain</Typography>
                                                <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700 }}>+₹{(activePortfolio.total_gain / 100000).toFixed(2)}L</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </motion.div>
                )}

                {/* Add Transaction Modal & Create Portfolio Modal */}
                <AddTransactionModal
                    open={isTxModalOpen}
                    onClose={() => setIsTxModalOpen(false)}
                    onSubmit={handleAddTransaction}
                />

                <CreatePortfolioModal
                    open={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreatePortfolio}
                />

                <ConfirmDialog
                    open={deleteConfirmOpen}
                    title="Delete Portfolio"
                    message="Are you sure you want to delete this portfolio? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    confirmColor="error"
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setDeleteConfirmOpen(false);
                        setPortfolioToDelete(null);
                    }}
                />
                <DisclaimerFooter />
            </Box>
        </>
    );
}

// --- Subcomponents ---


function CreatePortfolioModal({ open, onClose, onSubmit }: { open: boolean, onClose: () => void, onSubmit: (name: string) => void }) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (name) {
            onSubmit(name);
            setName('');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#050505',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    p: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                Create New Portfolio
                <IconButton onClick={onClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Portfolio Name"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Retirement Fund, Tech Stocks"
                    InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                    InputLabelProps={{ sx: { color: '#666' } }}
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!name}
                    sx={{
                        bgcolor: '#00E5FF', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#00B2CC' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    Create Portfolio
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.ElementType;
}

function TabButton({ active, onClick, label, icon: Icon }: TabButtonProps) {
    return (
        <Button
            onClick={onClick}
            startIcon={<Icon size={20} />}
            sx={{
                color: active ? '#00E5FF' : '#666',
                borderBottom: active ? '2px solid #00E5FF' : '2px solid transparent',
                borderRadius: 0,
                pb: 2,
                px: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                opacity: active ? 1 : 0.7,
                '&:hover': { color: '#fff', opacity: 1, bgcolor: 'transparent' }
            }}
        >
            {label}
        </Button>
    )
}

interface StatBarProps {
    label: string;
    value: number;
    color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#aaa', fontWeight: 600 }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{value}%</Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={value}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#111',
                    '& .MuiLinearProgress-bar': { bgcolor: color }
                }}
            />
        </Box>
    )
}


# page.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, CircularProgress, Button, TextField, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { Send, Lightbulb, ArrowRight, History } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { marketService } from '@/services/marketService';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/ui-store';
import QuestionnaireFlow, { QuestionnaireData } from '@/components/sectors/QuestionnaireFlow';
import StockQuickCard from '@/components/sectors/StockQuickCard';
import SelectionBar from '@/components/sectors/SelectionBar';
import PortfolioBuilder from '@/components/sectors/PortfolioBuilder';
import DiscoveryHistory from '@/components/sectors/DiscoveryHistory';
import DiscoveryChat from '@/components/sectors/DiscoveryChat';
import ConfirmDialog from '@/components/common/ConfirmDialog';


interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggest_switch?: {
        to: 'advisor' | 'discovery_hub';
        reason: string;
        original_query?: string;
    };
}

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

const STARTER_PROMPTS = [
    "Tell me about the aluminium sector in India",
    "Which renewable energy stocks are worth investing in?",
    "I want to invest ₹1L in pharma. Show me opportunities",
    "What's happening in the EV battery sector?",
];

export default function DiscoveryHubPage() {
    const router = useRouter();
    const { isSidebarOpen, closeSidebar } = useUIStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitial, setIsInitial] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);

    // Questionnaire & Stock Selection State
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [userPreferences, setUserPreferences] = useState<QuestionnaireData | null>(null);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [portfolio, setPortfolio] = useState<any>(null);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [portfolioAllocations, setPortfolioAllocations] = useState<any[]>([]);
    const [currentSectorQuery, setCurrentSectorQuery] = useState('');
    const [showPortfolioButton, setShowPortfolioButton] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const toggleHistory = () => {
        if (!isHistoryOpen) {
            closeSidebar(); // Close main sidebar when opening history
        }
        setIsHistoryOpen(!isHistoryOpen);
    };

    const closeHistory = () => setIsHistoryOpen(false);

    const loadSessions = async () => {
        try {
            const data = await marketService.getChatSessions('discovery_hub');
            setSessions(data);
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    // Close history panel when main sidebar opens
    useEffect(() => {
        if (isSidebarOpen && isHistoryOpen) {
            setIsHistoryOpen(false);
        }
    }, [isSidebarOpen, isHistoryOpen]);

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setIsInitial(true);
        setIsHistoryOpen(false);
        setShowQuestionnaire(false);
        setRecommendations([]);
        setSelectedStocks([]);
        setPortfolio(null);
        setShowPortfolio(false);
        setUserPreferences(null);
    };

    const handlePinSession = async (sessionId: string, currentPinStatus: boolean) => {
        try {
            await marketService.togglePinSession(sessionId, !currentPinStatus);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_pinned: !currentPinStatus } : s).sort((a, b) => {
                if (a.is_pinned === b.is_pinned) return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                return (a.is_pinned ? -1 : 1);
            }));
            loadSessions();
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

    const handleSessionClick = async (sessionId: string) => {
        try {
            setLoading(true);
            setCurrentSessionId(sessionId);
            setIsHistoryOpen(false);
            setMessages([]);

            const msgs = await marketService.getSessionMessages(sessionId);
            const formattedMsgs: Message[] = msgs.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
                suggest_switch: m.metadata?.suggest_switch
            }));
            setMessages(formattedMsgs);
            setIsInitial(false);
            setShowQuestionnaire(false);
            setRecommendations([]);
            setSelectedStocks([]);
            setShowPortfolio(false);
            setUserPreferences(null);
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (message?: string) => {
        const userMessage = message || input.trim();
        if (!userMessage || loading) return;

        setIsInitial(false);
        const tempId = Date.now().toString();
        const newUserMessage: Message = {
            id: tempId,
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setLoading(true);

        try {
            let sessionId = currentSessionId;
            if (!sessionId) {
                const newSession = await marketService.createSession(userMessage, [], 'discovery_hub');
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
                loadSessions();
            }

            const conversationHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await marketService.chatWithAI(userMessage, { type: 'discovery_hub' }, conversationHistory);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                suggest_switch: response.suggest_switch
            };

            setMessages(prev => [...prev, aiMessage]);

            if (sessionId) {
                await marketService.addMessageToSession(sessionId, newUserMessage.content, 'user');
                const metadata = response.suggest_switch ? { suggest_switch: response.suggest_switch } : undefined;
                await marketService.addMessageToSession(sessionId, aiMessage.content, 'assistant', metadata);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box sx={{
                flexGrow: 1,
                height: '100vh',
                bgcolor: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #000 70%)'
            }}>
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
                    pl: { xs: 2, md: '120px' }
                }}>
                    <IconButton
                        onClick={toggleHistory}
                        sx={{
                            color: '#fff',
                            bgcolor: isHistoryOpen ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: isHistoryOpen ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <History size={20} />
                    </IconButton>
                </Box>

                {/* History Panel */}
                <DiscoveryHistory
                    isOpen={isHistoryOpen}
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onClose={closeHistory}
                    onSessionClick={handleSessionClick}
                    onNewChat={handleNewChat}
                    onPinSession={handlePinSession}
                    onDeleteSession={handleDeleteSession}
                />

                {/* Content Area - Scrollable */}
                <Box sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Initial State - Centered */}
                    {isInitial && messages.length === 0 && !loading && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexGrow: 1,
                            p: { xs: 3, md: 6 }
                        }}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 4,
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 3,
                                        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
                                    }}>
                                        <Lightbulb size={40} color="#fff" />
                                    </Box>

                                    <Typography variant="h3" sx={{
                                        fontWeight: 700,
                                        background: 'linear-gradient(135deg, #fff 0%, #A78BFA 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        mb: 2,
                                        fontSize: { xs: '2rem', md: '2.5rem' }
                                    }}>
                                        Research any sector
                                    </Typography>

                                    <Typography variant="body1" sx={{
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        mb: 4,
                                        fontSize: '1.1rem',
                                        lineHeight: 1.6
                                    }}>
                                        AI-powered insights, latest news, and investment opportunities for any sector or commodity
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                        {STARTER_PROMPTS.map((prompt, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                                            >
                                                <Button
                                                    fullWidth
                                                    onClick={() => handleSend(prompt)}
                                                    sx={{
                                                        justifyContent: 'space-between',
                                                        textAlign: 'left',
                                                        p: 2,
                                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: 2,
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        textTransform: 'none',
                                                        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(139, 92, 246, 0.08)',
                                                            borderColor: 'rgba(139, 92, 246, 0.3)',
                                                            transform: 'translateY(-2px)',
                                                            '& .arrow': { transform: 'translateX(4px)', opacity: 1 }
                                                        }
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        lineHeight: 1.5
                                                    }}>
                                                        {prompt}
                                                    </Typography>
                                                    <ArrowRight
                                                        className="arrow"
                                                        size={16}
                                                        color="rgba(139, 92, 246, 0.6)"
                                                        style={{
                                                            transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                                            opacity: 0.5
                                                        }}
                                                    />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </Box>
                                </Box>
                            </motion.div>
                        </Box>
                    )}

                    {/* Chat Messages */}
                    {!isInitial && !showQuestionnaire && !showPortfolio && messages.length > 0 && (
                        <DiscoveryChat
                            messages={messages}
                            input={input}
                            loading={loading}
                            onInputChange={setInput}
                            onSend={handleSend}
                            onKeyPress={handleKeyPress}
                        />
                    )}

                    {/* Loading Indicator */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} sx={{ color: '#8B5CF6' }} />
                        </Box>
                    )}
                </Box>

                {/* Input Area - Always Visible */}
                {!showQuestionnaire && !showPortfolio && (
                    <Box sx={{
                        p: { xs: 3, md: 4 },
                        backdropFilter: 'blur(20px)',
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                            <Paper sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                '&:focus-within': {
                                    borderColor: 'rgba(139, 92, 246, 0.5)',
                                    bgcolor: 'rgba(255, 255, 255, 0.06)',
                                    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)'
                                }
                            }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={6}
                                    placeholder="Ask about any sector, commodity, or industry..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    variant="standard"
                                    InputProps={{
                                        disableUnderline: true,
                                        sx: {
                                            color: 'rgba(255, 255, 255, 0.92)',
                                            fontSize: '0.9375rem',
                                            fontWeight: 400,
                                            letterSpacing: '-0.01em',
                                            px: 1.5,
                                            py: 0.5,
                                            '&::placeholder': {
                                                color: 'rgba(255, 255, 255, 0.35)',
                                                opacity: 1
                                            }
                                        }
                                    }}
                                />
                                <IconButton
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || loading}
                                    sx={{
                                        ml: 1,
                                        width: 36,
                                        height: 36,
                                        background: input.trim() && !loading
                                            ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                                            : 'rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                        '&:hover': {
                                            background: input.trim() && !loading
                                                ? 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)'
                                                : 'rgba(255, 255, 255, 0.08)',
                                            transform: input.trim() && !loading ? 'scale(1.05)' : 'none'
                                        },
                                        '&:disabled': {
                                            background: 'rgba(255, 255, 255, 0.04)'
                                        }
                                    }}
                                >
                                    <Send size={16} color={input.trim() && !loading ? '#fff' : 'rgba(255, 255, 255, 0.3)'} />
                                </IconButton>
                            </Paper>
                            <Typography variant="caption" sx={{
                                color: 'rgba(255, 255, 255, 0.25)',
                                mt: 1.5,
                                display: 'block',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 400
                            }}>
                                Clarity AI can make mistakes. Verify important financial data.
                            </Typography>
                        </Box>
                    </Box>
                )}
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
        </Box>
    );
}


# page.tsx

'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';
import QuestionnaireFlow, { QuestionnaireData } from '@/components/sectors/QuestionnaireFlow';
import StockQuickCard from '@/components/sectors/StockQuickCard';
import SelectionBar from '@/components/sectors/SelectionBar';
import PortfolioBuilder from '@/components/sectors/PortfolioBuilder';

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

export default function SectorDetailPage({ params }: { params: { sector: string } }) {
    const router = useRouter();
    const sector = decodeURIComponent(params.sector);
    const [showQuestionnaire, setShowQuestionnaire] = useState(true);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [userPreferences, setUserPreferences] = useState<QuestionnaireData | null>(null);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [portfolioAllocations, setPortfolioAllocations] = useState<any[]>([]);

    const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
        setShowQuestionnaire(false);
        setLoading(true);
        setUserPreferences(data);

        try {
            const horizonMap = {
                'short': 'short-term (less than 1 year)',
                'medium': 'medium-term (1-3 years)',
                'long': 'long-term (3+ years)'
            };

            const riskMap = {
                'conservative': 'conservative (low risk, stable returns)',
                'balanced': 'balanced (moderate risk, growth with stability)',
                'aggressive': 'aggressive (high risk, maximum growth potential)'
            };

            const preferencesText = data.sectorPreferences.length > 0
                ? ` Focus on: ${data.sectorPreferences.join(', ')}.`
                : '';

            const query = `
                Recommend top 7 stocks from ${sector} sector for:
                - Budget: ₹${data.budget.toLocaleString()}
                - Horizon: ${horizonMap[data.horizon!]}
                - Risk: ${riskMap[data.riskProfile!]}
                ${preferencesText}
                
                For each stock provide: symbol, company name, current price, score (0-100), action (BUY/HOLD/SELL), and reasoning.
            `;

            const aiResponseData = await marketService.chatWithAI(query, { type: 'discovery_hub' });

            // Parse AI response into structured data
            const parsedStocks = parseAIResponse(aiResponseData.response);
            setRecommendations(parsedStocks);

        } catch (error) {
            console.error('Failed to get recommendations:', error);
            // Fallback mock data
            setRecommendations(getMockRecommendations(sector));
        } finally {
            setLoading(false);
        }
    };

    const parseAIResponse = (response: string): StockRecommendation[] => {
        // Simple parsing - in production, use structured AI output
        const mockStocks: StockRecommendation[] = [
            { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3281, change: 1.2, score: 85, action: 'BUY', reasoning: 'Strong fundamentals, consistent growth, low debt. Leader in digital transformation services.' },
            { symbol: 'INFY', name: 'Infosys Limited', price: 1456, change: 0.8, score: 78, action: 'BUY', reasoning: 'Good valuation, stable revenue streams, strong management team.' },
            { symbol: 'WIPRO', name: 'Wipro Limited', price: 445, change: -0.3, score: 72, action: 'HOLD', reasoning: 'Moderate growth potential, fair valuation. Turnaround story in progress.' },
            { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1234, change: 1.5, score: 76, action: 'BUY', reasoning: 'Undervalued compared to peers, strong order book, good dividend yield.' },
            { symbol: 'TECHM', name: 'Tech Mahindra', price: 1089, change: 0.2, score: 68, action: 'HOLD', reasoning: 'Wait for confirmation of turnaround. 5G opportunities ahead.' },
            { symbol: 'LTIM', name: 'LTIMindtree', price: 5234, change: 2.1, score: 74, action: 'BUY', reasoning: 'Post-merger synergies kicking in. Strong growth trajectory.' },
            { symbol: 'PERSISTENT', name: 'Persistent Systems', price: 4567, change: 1.8, score: 71, action: 'BUY', reasoning: 'Niche player with strong client relationships. Good growth potential.' }
        ];

        return mockStocks;
    };

    const getMockRecommendations = (sectorName: string): StockRecommendation[] => {
        // Fallback mock data
        return parseAIResponse('');
    };

    const handleToggleSelect = (symbol: string) => {
        if (selectedStocks.includes(symbol)) {
            setSelectedStocks(selectedStocks.filter(s => s !== symbol));
        } else if (selectedStocks.length < 5) {
            setSelectedStocks([...selectedStocks, symbol]);
        }
    };

    const handleToggleExpand = (symbol: string) => {
        setExpandedStock(expandedStock === symbol ? null : symbol);
    };

    const handleBuildPortfolio = () => {
        if (!userPreferences || selectedStocks.length < 2) return;

        // Calculate optimal allocations
        const selectedRecs = recommendations.filter(r => selectedStocks.includes(r.symbol));
        const totalScore = selectedRecs.reduce((sum, r) => sum + r.score, 0);

        const allocations = selectedRecs.map(stock => {
            const baseAllocation = (stock.score / totalScore);
            const amount = Math.floor(userPreferences.budget * baseAllocation);
            const shares = Math.floor(amount / stock.price);
            const actualAmount = shares * stock.price;

            return {
                symbol: stock.symbol,
                allocation_percent: Math.round(baseAllocation * 100),
                amount: actualAmount,
                shares,
                price_per_share: stock.price
            };
        });

        setPortfolioAllocations(allocations);
        setShowPortfolio(true);

        // Scroll to portfolio
        setTimeout(() => {
            document.getElementById('portfolio-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleCompare = () => {
        router.push(`/analysis?stocks=${selectedStocks.join(',')}&source=sector`);
    };

    const handleBacktrack = () => {
        // Navigate to backtrack with first selected stock
        if (selectedStocks.length > 0) {
            router.push(`/backtrack?stock=${selectedStocks[0]}`);
        }
    };

    const handleRestart = () => {
        setShowQuestionnaire(true);
        setRecommendations([]);
        setSelectedStocks([]);
        setShowPortfolio(false);
        setUserPreferences(null);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' }, pb: 12 }}>
                {/* Header */}
                <Box sx={{ mb: 6 }}>
                    <Button
                        startIcon={<ArrowLeft size={20} />}
                        onClick={() => router.push('/sectors')}
                        sx={{
                            color: '#666',
                            mb: 3,
                            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                    >
                        Back to Sectors
                    </Button>

                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
                        {sector} Sector Analysis
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#666', mb: 4 }}>
                        AI-powered stock recommendations tailored to your investment goals
                    </Typography>
                </Box>

                {/* Questionnaire */}
                {showQuestionnaire && (
                    <QuestionnaireFlow
                        sector={sector}
                        onComplete={handleQuestionnaireComplete}
                    />
                )}

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 20 }}>
                        <CircularProgress sx={{ color: '#00E5FF', mb: 3 }} size={48} />
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontWeight: 600 }}>
                                Analyzing {sector} Sector...
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3 }}>
                                {['Fetching market data...', 'Running AI analysis...', 'Calculating scores...', 'Optimizing recommendations...'].map((text, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.5 }}
                                    >
                                        <Typography variant="caption" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                            <Sparkles size={14} color="#00E5FF" />
                                            {text}
                                        </Typography>
                                    </motion.div>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Recommendations */}
                {!showQuestionnaire && !loading && recommendations.length > 0 && !showPortfolio && (
                    <Box>
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                Top {recommendations.length} Recommendations
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                                Select 2-5 stocks to build your portfolio or compare
                            </Typography>
                        </Box>

                        <Grid container spacing={3}>
                            {recommendations.map((stock, index) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={stock.symbol}>
                                    <StockQuickCard
                                        stock={stock}
                                        index={index}
                                        isSelected={selectedStocks.includes(stock.symbol)}
                                        isExpanded={expandedStock === stock.symbol}
                                        onToggleSelect={() => handleToggleSelect(stock.symbol)}
                                        onToggleExpand={() => handleToggleExpand(stock.symbol)}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={handleRestart}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#00E5FF',
                                        color: '#00E5FF',
                                        bgcolor: 'rgba(0, 229, 255, 0.05)'
                                    }
                                }}
                            >
                                Start Over
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Portfolio Builder */}
                {showPortfolio && portfolioAllocations.length > 0 && userPreferences && (
                    <Box id="portfolio-section">
                        <PortfolioBuilder
                            allocations={portfolioAllocations}
                            totalBudget={userPreferences.budget}
                            riskLevel={userPreferences.riskProfile?.toUpperCase() || 'BALANCED'}
                            estimatedReturn={12.5}
                        />

                        <Box sx={{ mt: 6, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={() => setShowPortfolio(false)}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#00E5FF',
                                        color: '#00E5FF',
                                        bgcolor: 'rgba(0, 229, 255, 0.05)'
                                    }
                                }}
                            >
                                Modify Selection
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCompare}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#00E5FF',
                                        color: '#00E5FF',
                                        bgcolor: 'rgba(0, 229, 255, 0.05)'
                                    }
                                }}
                            >
                                Compare Stocks
                            </Button>
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    if (!userPreferences) return;

                                    try {
                                        // Create portfolio name
                                        const portfolioName = `${sector} Portfolio - ${new Date().toLocaleDateString()}`;

                                        // Prepare holdings data
                                        const holdings = portfolioAllocations.map(alloc => ({
                                            ticker: alloc.symbol,
                                            shares: alloc.shares,
                                            avg_price: alloc.price_per_share
                                        }));

                                        // Save to backend
                                        const portfolio = await marketService.createPortfolioWithHoldings(
                                            portfolioName,
                                            holdings
                                        );

                                        // Success notification
                                        alert(`Portfolio "${portfolioName}" created successfully!`);

                                        // Optionally navigate to portfolio page
                                        // router.push('/portfolios');
                                    } catch (error) {
                                        console.error('Failed to create portfolio:', error);
                                        alert('Failed to create portfolio. Please try again.');
                                    }
                                }}
                                sx={{
                                    bgcolor: '#00E5FF',
                                    color: '#000',
                                    fontWeight: 700,
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: '#00D4E6'
                                    }
                                }}
                            >
                                Create Portfolio
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Selection Bar */}
                {!showQuestionnaire && !loading && !showPortfolio && (
                    <SelectionBar
                        selectedStocks={selectedStocks}
                        onRemove={(symbol) => setSelectedStocks(selectedStocks.filter(s => s !== symbol))}
                        onContinue={handleBuildPortfolio}
                        onCompare={handleCompare}
                        onBacktrack={handleBacktrack}
                    />
                )}
            </Box>
        </Box>
    );
}


# page.tsx

'use client';

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Container, Grid, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { ErrorBanner } from '@/components/common/ErrorBanner';

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/register', {
                email,
                password
            });
            // Redirect to "Check Email" page
            router.push('/auth/check-email');
        } catch (err: any) {
            console.error("Signup failed", err);
            setError(err.response?.data?.detail || "Registration failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0B0B',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
                    {/* Left: Brand */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem' },
                                    fontWeight: 700,
                                    lineHeight: { xs: 1, md: 0.9 },
                                    letterSpacing: '-0.04em',
                                    mb: { xs: 2, md: 4 },
                                    mt: { xs: 0, md: -5 }
                                }}
                            >
                                JOIN
                                <Box component="span" sx={{ color: '#00E5FF' }}>.</Box>
                            </Typography>

                            <Typography variant="h5" sx={{
                                fontWeight: 400,
                                color: '#A0A0A0',
                                maxWidth: 400,
                                mb: { xs: 4, md: 6 },
                                fontSize: { xs: '1.2rem', md: '1.5rem' },
                                lineHeight: 1.4
                            }}>
                                Start your journey to financial clarity today.
                            </Typography>
                        </motion.div>
                    </Grid>

                    {/* Right: Form */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ ml: 'auto' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {error && (
                                    <ErrorBanner error={error} onRetry={() => setError(null)} />
                                )}

                                <MinimalInput
                                    label="FULL NAME"
                                    placeholder="John Doe"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <MinimalInput
                                    label="EMAIL"
                                    placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <MinimalInput
                                    label="PASSWORD"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <Button
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        mt: 4,
                                        py: 2.5,
                                        borderRadius: '4px',
                                        bgcolor: '#00E5FF',
                                        color: '#000',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        opacity: loading ? 0.7 : 1,
                                        '&:hover': {
                                            bgcolor: '#fff',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>

                                <Box sx={{ textAlign: 'center' }}>
                                    <Link href="/login" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                        ALREADY HAVE AN ACCOUNT? <span style={{ color: '#fff', borderBottom: '1px solid #fff' }}>LOGIN</span>
                                    </Link>
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            <Box
                sx={{
                    position: 'absolute',
                    bottom: { xs: 20, md: 40 },
                    left: { xs: 20, md: 40 },
                    right: { xs: 20, md: 40 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#333',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                    letterSpacing: '0.1em'
                }}
            >
                <Typography variant="inherit">© 2025 Clarity Financial</Typography>
            </Box>
        </Box>
    );
}

interface MinimalInputProps {
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function MinimalInput({ label, type, placeholder, value, onChange }: MinimalInputProps) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{
                    color: '#666',
                    mb: 1,
                    display: 'block',
                    fontWeight: 600,
                    letterSpacing: '0.1em'
                }}
            >
                {label}
            </Typography>
            <TextField
                fullWidth
                variant="standard"
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                InputProps={{
                    disableUnderline: true,
                    sx: {
                        fontSize: '1.5rem',
                        color: '#fff',
                        fontWeight: 500,
                        pb: 1,
                        borderBottom: '1px solid #333',
                        transition: 'border-color 0.3s',
                        '&:hover': { borderBottom: '1px solid #666' },
                        '&.Mui-focused': { borderBottom: '1px solid #00E5FF' }
                    }
                }}
                sx={{
                    '& input::placeholder': { color: '#333', opacity: 1 }
                }}
            />
        </Box>
    );
}


# page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, IconButton, Button, CircularProgress } from '@mui/material';
import { marketService } from '@/services/marketService';
import { Trash2, TrendingUp, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { motion } from 'framer-motion';
import DisclaimerFooter from '@/components/layout/DisclaimerFooter';

export default function WatchlistPage() {
    const router = useRouter();
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, any>>({});
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const data = await marketService.getWatchlist();
            setWatchlist(data);

            // Fetch live prices for watched items
            // We can do this in parallel or use a bulk endpoint if available.
            // For now, loop (limited scale).
            const priceMap: Record<string, any> = {};
            await Promise.all(data.map(async (item: any) => {
                try {
                    const details = await marketService.getStockDetails(item.ticker);
                    priceMap[item.ticker] = details.market_data;
                } catch (e) {
                    console.error(`Failed to load price for ${item.ticker}`, e);
                }
            }));
            setPrices(priceMap);

        } catch (error) {
            console.error("Failed to fetch watchlist", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const handleRemove = async (ticker: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTickerToDelete(ticker);
        setDeleteConfirmOpen(true);
    };

    const confirmRemove = async () => {
        if (!tickerToDelete) return;

        try {
            await marketService.removeFromWatchlist(tickerToDelete);
            setWatchlist(prev => prev.filter(i => i.ticker !== tickerToDelete));
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteConfirmOpen(false);
            setTickerToDelete(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#000' }}>
                <CircularProgress size={24} sx={{ color: '#00E5FF' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', bgcolor: '#000', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, p: 4, pl: { xs: 4, md: '140px' }, maxWidth: 1600, mx: 'auto' }}>
                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Eye size={32} color="#00E5FF" />
                    My Buy List
                </Typography>

                {watchlist.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center', border: '1px dashed #333', borderRadius: 4 }}>
                        <Typography sx={{ color: '#666', mb: 2 }}>Your watchlist is empty.</Typography>
                        <Button variant="outlined" onClick={() => router.push('/market')} sx={{ color: '#00E5FF', borderColor: '#00E5FF' }}>
                            Browse Market
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {watchlist.map((item) => {
                            const marketData = prices[item.ticker] || {};
                            const change = marketData.change || 0;
                            const price = marketData.price_formatted || 'Loading...';

                            return (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.ticker}>
                                    <Card
                                        component={motion.div}
                                        whileHover={{ y: -4, borderColor: '#444' }}
                                        onClick={() => router.push(`/market/${item.ticker}`)}
                                        sx={{
                                            bgcolor: '#0A0A0A',
                                            border: '1px solid #222',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            position: 'relative',
                                            overflow: 'visible'
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                                <Box>
                                                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{item.ticker}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#666' }}>NSE</Typography>
                                                </Box>
                                                <IconButton
                                                    onClick={(e) => handleRemove(item.ticker, e)}
                                                    sx={{ color: '#333', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                                                >
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
                                                    {price}
                                                </Typography>

                                                {marketData.price && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', color: change >= 0 ? '#10B981' : '#EF4444', bgcolor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', px: 1, py: 0.5, borderRadius: 2 }}>
                                                        {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 0.5 }}>
                                                            {Math.abs(change).toFixed(2)}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Target Prices & Notes */}
                                            {(item.target_buy_price || item.target_sell_price || item.notes) && (
                                                <Box sx={{ pt: 2, borderTop: '1px solid #222' }}>
                                                    {item.target_buy_price && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                                                                Buy Target:
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>
                                                                ₹{item.target_buy_price.toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {item.target_sell_price && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 600 }}>
                                                                Sell Target:
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#EF4444' }}>
                                                                ₹{item.target_sell_price.toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {item.notes && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: '#666',
                                                                fontStyle: 'italic',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                mt: 1
                                                            }}
                                                        >
                                                            "{item.notes}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Remove from Watchlist"
                message={`Are you sure you want to remove ${tickerToDelete} from your watchlist?`}
                confirmText="Remove"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={confirmRemove}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setTickerToDelete(null);
                }}
            />
        </Box>
    );
}


# AIVerdict.tsx

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Scale } from 'lucide-react';

interface AIVerdictProps {
    comparisonData: any;
    selectedStocks: string[];
}

export function AIVerdict({ comparisonData, selectedStocks }: AIVerdictProps) {
    if (!comparisonData || !comparisonData.winners) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>
                <Typography>Analyzing stocks...</Typography>
            </Box>
        );
    }

    const { winners, comparison, summary } = comparisonData;

    // Get winner details
    const overallWinner = winners.best_overall;
    const mostStable = winners.most_stable;
    const bestValue = winners.best_value;
    const lowestRisk = winners.lowest_risk;

    // Get overall winner's data
    const winnerData = comparison[overallWinner];

    return (
        <Box>
            {/* Main Verdict Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(0, 229, 255, 0.1)',
                    color: '#00E5FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Scale size={24} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                        Analysis Summary
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00E5FF', letterSpacing: '0.05em', fontWeight: 600 }}>
                        AI-POWERED RECOMMENDATION
                    </Typography>
                </Box>
            </Box>

            {/* Summary Text */}
            <Typography variant="body1" sx={{ color: '#ccc', lineHeight: 1.7, mb: 3 }}>
                {summary || 'Analyzing comparison data...'}
            </Typography>

            {/* Overall Winner - Minimal Design with Teal Accent */}
            <Box sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                bgcolor: 'rgba(0, 229, 255, 0.03)',
                border: '1px solid rgba(0, 229, 255, 0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#00E5FF', mb: 0.5, display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>
                            TOP PICK
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                            {overallWinner}
                        </Typography>
                    </Box>
                    <Chip
                        label={winnerData?.action || 'HOLD'}
                        sx={{
                            bgcolor: winnerData?.action === 'BUY' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: winnerData?.action === 'BUY' ? '#00E5FF' : '#fff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            border: `1px solid ${winnerData?.action === 'BUY' ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Score</Typography>
                        <Typography variant="body2" sx={{ color: '#00E5FF', fontWeight: 700 }}>
                            {winnerData?.composite_score || 'N/A'}/100
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Valuation</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {winnerData?.valuation || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Risk</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {winnerData?.risk_level || 'N/A'}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Category Winners - Minimal Grid with Teal Accents */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {/* Most Stable */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        MOST STABLE
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {mostStable}
                    </Typography>
                </Box>

                {/* Best Value */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        BEST VALUE
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {bestValue}
                    </Typography>
                </Box>

                {/* Lowest Risk */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                        LOWEST RISK
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                        {lowestRisk}
                    </Typography>
                </Box>
            </Box>

            {/* Investment Strategy - Clean List with Teal Accent */}
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="subtitle2" sx={{ color: '#00E5FF', fontWeight: 600, mb: 2, letterSpacing: '0.02em' }}>
                    Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {selectedStocks.map((stock) => {
                        const stockData = comparison[stock];
                        const action = stockData?.action;
                        const score = stockData?.composite_score;

                        return (
                            <Box key={stock} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', '&:last-child': { borderBottom: 'none' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, minWidth: 80 }}>
                                        {stock}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        color: action === 'BUY' ? '#00E5FF' : '#888',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        bgcolor: action === 'BUY' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        fontWeight: 600,
                                        fontSize: '0.7rem'
                                    }}>
                                        {action || 'HOLD'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                    Score: <span style={{ color: '#fff', fontWeight: 600 }}>{score || 'N/A'}</span>/100
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}


# CompareButton.tsx

import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Scale } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompareButtonProps {
    stockCount: number;
    isLoading: boolean;
    onClick: () => void;
}

export function CompareButton({ stockCount, isLoading, onClick }: CompareButtonProps) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button
                variant="contained"
                size="large"
                disabled={isLoading}
                onClick={onClick}
                startIcon={isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Scale size={20} />}
                sx={{
                    bgcolor: '#00E5FF',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    px: 5,
                    py: 2,
                    borderRadius: '99px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(0, 229, 255, 0.3)',
                    '&:hover': { bgcolor: '#00D4EE', transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(0, 229, 255, 0.4)' },
                    '&:disabled': { bgcolor: '#333', color: '#666' },
                    transition: 'all 0.3s'
                }}
            >
                {isLoading ? 'Analyzing...' : `Compare ${stockCount} Stocks`}
            </Button>
        </motion.div>
    );
}


# ComparisonChart.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ComparisonChartProps {
    chartData: any[];
    selectedStocks: string[];
    chartPeriod: string;
}

export function ComparisonChart({ chartData, selectedStocks, chartPeriod }: ComparisonChartProps) {
    const colors = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                    Relative Performance
                </Typography>
            </Box>

            {/* Chart */}
            <ResponsiveContainer width="100%" height="90%">
                <LineChart
                    data={chartData.length > 0 ? chartData : [{ date: 'Loading...', stock1: 100 }]}
                    margin={{ top: 20, right: 20, left: -20, bottom: 40 }}
                >
                    <defs>
                        {selectedStocks.map((s, i) => (
                            <linearGradient key={s} id={`gradient${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[i % 5]} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={colors[i % 5]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>

                    <XAxis
                        dataKey="date"
                        stroke="none"
                        tick={{ fill: '#666', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: '#222', strokeWidth: 1 }}
                        dy={10}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            if (chartPeriod === '1mo') {
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } else if (chartPeriod === '3mo' || chartPeriod === '6mo') {
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } else {
                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            }
                        }}
                        interval="preserveStartEnd"
                        minTickGap={60}
                    />

                    <YAxis
                        stroke="none"
                        tick={{ fill: '#666', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: '#222', strokeWidth: 1 }}
                        dx={-5}
                        tickFormatter={(value) => `${value}`}
                        domain={['auto', 'auto']}
                    />

                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length && label) {
                                const date = new Date(label);
                                const formattedDate = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });

                                const sortedPayload = [...payload].sort((a, b) => (b.value as number) - (a.value as number));

                                return (
                                    <Box sx={{
                                        bgcolor: 'rgba(0, 0, 0, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 3,
                                        p: 2,
                                        minWidth: 180,
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#888', mb: 1.5, display: 'block', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                            {formattedDate}
                                        </Typography>
                                        {sortedPayload.map((entry: any, index: number) => {
                                            const stockSymbol = selectedStocks[parseInt(entry.dataKey.replace('stock', '')) - 1];
                                            const stockIndex = parseInt(entry.dataKey.replace('stock', ''));
                                            const actualPrice = (payload as any)[0]?.payload?.[`price${stockIndex}`];

                                            return (
                                                <Box key={index} sx={{ mb: index < sortedPayload.length - 1 ? 1 : 0 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: entry.stroke }} />
                                                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>
                                                                {stockSymbol}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{
                                                            color: '#fff',
                                                            fontWeight: 700,
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            {actualPrice ? `₹${actualPrice.toFixed(2)}` : 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                );
                            }
                            return null;
                        }}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                    />

                    {selectedStocks.map((s, i) => (
                        <Line
                            key={s}
                            type="monotone"
                            dataKey={`stock${i + 1}`}
                            stroke={colors[i % 5]}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#000', fill: colors[i % 5] }}
                            animationDuration={1000}
                            animationEasing="ease-in-out"
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </>
    );
}


# ComparisonTable.tsx

import React, { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type MetricDefinition = {
    key: string;
    label: string;
    format: (v: any) => string;
    winnerKey: string | null;
    tooltip?: string;
    sortable?: boolean;
};

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc' | null;
};

// Helper component for displaying comparison data
export function ComparisonTable({ comparisonData, selectedStocks }: { comparisonData: any, selectedStocks: string[] }) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    if (!comparisonData || !comparisonData.comparison || Object.keys(comparisonData.comparison).length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                <Typography>No comparison data available</Typography>
            </Box>
        );
    }

    const metrics: MetricDefinition[] = [
        {
            key: 'composite_score',
            label: 'Overall Score',
            format: (v: number) => v.toFixed(1),
            winnerKey: 'best_overall',
            tooltip: 'Composite score combining all factors. Higher is better. Score > 70 is excellent, 50-70 is good, < 50 needs caution.',
            sortable: true
        },
        {
            key: 'market_cap',
            label: 'Market Cap',
            format: (v: any) => typeof v === 'string' ? v : `₹${v}`,
            winnerKey: null,
            tooltip: 'Total market value of the company. Large cap (>₹20,000 Cr) is more stable, small cap (<₹5,000 Cr) has higher growth potential.',
            sortable: false
        },
        {
            key: 'pe_ratio',
            label: 'P/E Ratio',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) : v,
            winnerKey: null,
            tooltip: 'Price-to-Earnings ratio. Lower generally means better value. Industry average is 15-25. High P/E may indicate overvaluation or high growth expectations.',
            sortable: true
        },
        {
            key: 'roe',
            label: 'ROE (%)',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) + '%' : v,
            winnerKey: null,
            tooltip: 'Return on Equity - how efficiently the company uses shareholder money. Higher is better. > 15% is good, > 20% is excellent.',
            sortable: true
        },
        {
            key: 'debt_to_equity',
            label: 'Debt/Equity',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) : v,
            winnerKey: null,
            tooltip: 'Debt-to-Equity ratio measures financial leverage. Lower is generally safer. < 1 is good, < 0.5 is very safe, > 2 may be risky.',
            sortable: true
        },
        {
            key: 'dividend_yield',
            label: 'Div Yield (%)',
            format: (v: any) => typeof v === 'number' ? v.toFixed(2) + '%' : v,
            winnerKey: null,
            tooltip: 'Annual dividend as % of stock price. Higher means more income. 2-4% is typical, > 5% is high (but check sustainability).',
            sortable: true
        },
        {
            key: 'stability_label',
            label: 'Stability',
            format: (v: string) => v,
            winnerKey: 'most_stable',
            tooltip: 'Price stability score. More stable stocks have lower volatility and are safer for conservative investors.',
            sortable: false
        },
        {
            key: 'risk_level',
            label: 'Risk Level',
            format: (v: string) => v,
            winnerKey: 'lowest_risk',
            tooltip: 'Overall risk assessment. LOW risk is safer but may have lower returns. HIGH risk has potential for higher returns but more volatility.',
            sortable: false
        },
        {
            key: 'valuation',
            label: 'Valuation',
            format: (v: string) => v,
            winnerKey: 'best_value',
            tooltip: 'Current valuation level. UNDERVALUED may be a buying opportunity, OVERVALUED suggests caution, FAIR is appropriately priced.',
            sortable: false
        },
        {
            key: 'action',
            label: 'Recommendation',
            format: (v: string) => v,
            winnerKey: null,
            tooltip: 'AI-powered recommendation based on all factors. BUY = strong opportunity, HOLD = maintain position, SELL = consider exiting.',
            sortable: false
        },
    ];

    const colors = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    // Sort stocks based on current sort config
    const getSortedStocks = () => {
        if (!sortConfig.direction || !sortConfig.key) return selectedStocks;

        return [...selectedStocks].sort((a, b) => {
            const aValue = comparisonData.comparison[a]?.[sortConfig.key];
            const bValue = comparisonData.comparison[b]?.[sortConfig.key];

            // Handle N/A or missing values
            if (aValue === 'N/A' || aValue === undefined) return 1;
            if (bValue === 'N/A' || bValue === undefined) return -1;

            // Numeric comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
    };

    const handleSort = (metricKey: string) => {
        if (!metrics.find(m => m.key === metricKey)?.sortable) return;

        setSortConfig(prev => {
            if (prev.key !== metricKey) {
                return { key: metricKey, direction: 'desc' };
            }
            if (prev.direction === 'desc') {
                return { key: metricKey, direction: 'asc' };
            }
            return { key: '', direction: null };
        });
    };

    const sortedStocks = getSortedStocks();

    return (
        <>
            {metrics.map((metric, idx) => {
                const isActionRow = metric.key === 'action';
                const isSorted = sortConfig.key === metric.key;

                return (
                    <Box
                        key={metric.key}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)`,
                            gap: { xs: 1, md: 2 },
                            py: { xs: 2, md: 2.5 },
                            borderBottom: idx === metrics.length - 1 ? 'none' : '1px solid #1a1a1a',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: metric.sortable ? 'pointer' : 'default',
                                '&:hover': metric.sortable ? { color: '#00E5FF' } : {}
                            }}
                            onClick={() => handleSort(metric.key)}
                        >
                            <Typography variant="body2" sx={{ color: isSorted ? '#00E5FF' : '#888', fontWeight: 600, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {metric.label}
                            </Typography>
                            {metric.sortable && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: isSorted ? '#00E5FF' : '#666' }}>
                                    {!isSorted && <ArrowUpDown size={14} />}
                                    {isSorted && sortConfig.direction === 'desc' && <ArrowDown size={14} />}
                                    {isSorted && sortConfig.direction === 'asc' && <ArrowUp size={14} />}
                                </Box>
                            )}
                            {metric.tooltip && (
                                <Tooltip
                                    title={metric.tooltip}
                                    arrow
                                    placement="top"
                                    sx={{
                                        '& .MuiTooltip-tooltip': {
                                            bgcolor: 'rgba(10, 10, 10, 0.95)',
                                            border: '1px solid #333',
                                            borderRadius: 2,
                                            p: 1.5,
                                            maxWidth: 300,
                                            fontSize: '0.875rem',
                                            lineHeight: 1.5
                                        },
                                        '& .MuiTooltip-arrow': {
                                            color: 'rgba(10, 10, 10, 0.95)',
                                            '&::before': {
                                                border: '1px solid #333'
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                                        <Info size={14} color="#666" />
                                    </Box>
                                </Tooltip>
                            )}
                        </Box>
                        {sortedStocks.map((symbol) => {
                            const data = comparisonData.comparison[symbol];
                            const value = data?.[metric.key];
                            const isWinner = metric.winnerKey && comparisonData.winners?.[metric.winnerKey] === symbol;
                            const stockIdx = selectedStocks.indexOf(symbol);
                            const winColor = colors[stockIdx % 5];

                            // Special coloring for action
                            const textColor = isActionRow
                                ? (value === 'BUY' ? '#10B981' : value === 'SELL' ? '#EF4444' : '#F59E0B')
                                : (isWinner ? winColor : '#fff');

                            return (
                                <Typography
                                    key={symbol}
                                    variant="body2"
                                    sx={{
                                        color: textColor,
                                        fontWeight: isWinner || isActionRow ? 700 : 500,
                                        textAlign: 'center',
                                        opacity: isWinner || isActionRow ? 1 : 0.7,
                                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                                    }}
                                >
                                    {value ? metric.format(value) : 'N/A'}
                                </Typography>
                            );
                        })}
                    </Box>
                );
            })}
        </>
    );
}


# StockCard.tsx

import React from 'react';
import { Paper, Box, Typography, IconButton, Skeleton } from '@mui/material';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StockCardProps {
    symbol: string;
    companyName?: string;
    stockData?: {
        price: string;
        change: string;
        up: boolean;
    };
    isComparing: boolean;
    onRemove: () => void;
}

export function StockCard({ symbol, companyName, stockData, isComparing, onRemove }: StockCardProps) {
    return (
        <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 24px)', md: 'calc(33.33% - 24px)', lg: 'calc(20% - 24px)' }, minWidth: 200 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        bgcolor: '#0A0A0A',
                        border: '1px solid #222',
                        borderRadius: 4,
                        height: 240,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': { transform: 'scale(1.02)', bgcolor: '#151515', borderColor: '#333' }
                    }}
                >
                    {!isComparing && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            sx={{ position: 'absolute', top: 16, right: 16, color: '#444', bgcolor: '#1A1A1A', '&:hover': { color: '#fff', bgcolor: '#EF4444' } }}
                            size="small"
                        >
                            <X size={14} />
                        </IconButton>
                    )}

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', p: 3 }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                                background: '#ffffff',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.02em',
                                fontSize: symbol.length > 8 ? '1.5rem' : symbol.length > 6 ? '1.75rem' : '2rem',
                                textAlign: 'center',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                lineHeight: 1.2
                            }}
                        >
                            {symbol}
                        </Typography>

                        {stockData ? (
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ fontWeight: 600, color: '#fff', fontSize: isComparing ? '1.5rem' : '2rem', letterSpacing: '-0.03em', mb: 1 }}>{stockData.price}</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: '99px', bgcolor: stockData.up ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                    {stockData.up ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
                                    <Typography variant="caption" sx={{ color: stockData.up ? '#10B981' : '#EF4444', fontWeight: 700 }}>{stockData.change}</Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', textAlign: 'center' }}>
                                <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: '#1a1a1a', mx: 'auto', mb: 1 }} />
                                <Skeleton variant="rectangular" width={80} height={24} sx={{ bgcolor: '#1a1a1a', mx: 'auto', borderRadius: '99px' }} />
                            </Box>
                        )}
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
}


# StockSearchBar.tsx

import React from 'react';
import { Paper, TextField, InputAdornment, CircularProgress, List, ListItem, ListItemButton, Box, Typography } from '@mui/material';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StockSearchBarProps {
    search: string;
    searchResults: any[];
    searchLoading: boolean;
    disabled: boolean;
    onSearchChange: (value: string) => void;
    onSelectStock: (symbol: string, name: string) => void;
}

export function StockSearchBar({ search, searchResults, searchLoading, disabled, onSearchChange, onSelectStock }: StockSearchBarProps) {
    return (
        <Box sx={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 10 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 0.5,
                    pl: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '24px',
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    '&:focus-within': { borderColor: '#00E5FF', boxShadow: '0 0 0 2px rgba(0, 229, 255, 0.1)' }
                }}
            >
                <TextField
                    fullWidth
                    variant="standard"
                    placeholder={disabled ? "Slots full" : "Search stocks (e.g. TCS)..."}
                    disabled={disabled}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        disableUnderline: true,
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={20} color={search ? "#fff" : "#666"} />
                            </InputAdornment>
                        ),
                        endAdornment: searchLoading ? <CircularProgress size={20} sx={{ color: '#666' }} /> : null,
                        sx: { color: '#fff', fontSize: '1rem', fontWeight: 500, px: 2, py: 1.5 }
                    }}
                />
            </Paper>

            {/* Search Results Dropdown */}
            <AnimatePresence>
                {searchResults.length > 0 && (
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: 1,
                            borderRadius: 3,
                            overflow: 'hidden',
                            bgcolor: '#0A0A0A',
                            border: '1px solid #222',
                            zIndex: 20,
                            maxHeight: 300,
                            overflowY: 'auto'
                        }}
                    >
                        <List>
                            {searchResults.map((item: any) => (
                                <ListItem key={item.symbol} disablePadding>
                                    <ListItemButton
                                        onClick={() => onSelectStock(item.symbol, item.name)}
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            borderBottom: '1px solid #1a1a1a',
                                            '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.05)' }
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, color: '#fff' }}>{item.symbol}</Typography>
                                            <Typography variant="body2" sx={{ color: '#666' }}>{item.name}</Typography>
                                        </Box>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </AnimatePresence>
        </Box>
    );
}


# ConfirmDialog.tsx

'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'error',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const colorMap = {
        primary: '#00E5FF',
        error: '#EF4444',
        warning: '#F59E0B'
    };

    const bgColorMap = {
        primary: 'rgba(0, 229, 255, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        warning: 'rgba(245, 158, 11, 0.1)'
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            PaperProps={{
                sx: {
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    maxWidth: 500,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: '#fff',
                fontWeight: 700,
                pb: 2
            }}>
                <Box sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: bgColorMap[confirmColor],
                    color: colorMap[confirmColor],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <AlertTriangle size={24} />
                </Box>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
                <Button
                    onClick={onCancel}
                    sx={{
                        flex: 1,
                        color: '#666',
                        borderColor: '#333',
                        border: '1px solid',
                        borderRadius: 2,
                        py: 1.2,
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                            color: '#fff',
                            borderColor: '#555',
                            bgcolor: 'rgba(255,255,255,0.05)'
                        }
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    sx={{
                        flex: 1,
                        bgcolor: colorMap[confirmColor],
                        color: confirmColor === 'primary' ? '#000' : '#fff',
                        fontWeight: 700,
                        py: 1.2,
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': {
                            bgcolor: confirmColor === 'error' ? '#DC2626' :
                                confirmColor === 'warning' ? '#D97706' : '#00B2CC'
                        }
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


# ErrorBanner.tsx

import React from 'react';
import { Alert, Button } from '@mui/material';

interface ErrorBannerProps {
    error: string;
    onRetry: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
    return (
        <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    Retry
                </Button>
            }
        >
            {error}
        </Alert>
    );
}


# SwitchAIButton.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Briefcase, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SwitchAIButtonProps {
    target: 'advisor' | 'discovery_hub';
    originalQuery: string;
    reason?: string;
}

export default function SwitchAIButton({ target, originalQuery, reason }: SwitchAIButtonProps) {
    const router = useRouter();

    const handleSwitch = () => {
        // Navigate to target page with query param to pre-fill input
        const path = target === 'advisor' ? '/advisor' : '/sectors';
        const params = new URLSearchParams();
        params.set('initial_query', originalQuery);
        if (reason) params.set('ref_reason', reason);

        router.push(`${path}?${params.toString()}`);
    };

    const config = target === 'advisor'
        ? {
            label: 'Switch to AI Advisor',
            icon: Briefcase,
            color: 'bg-purple-600 hover:bg-purple-500',
            description: 'Best for stock analysis & portfolio'
        }
        : {
            label: 'Switch to Discovery Hub',
            icon: Search,
            color: 'bg-cyan-600 hover:bg-cyan-500',
            description: 'Best for sector & industry research'
        };

    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4"
        >
            <button
                onClick={handleSwitch}
                className={`group flex items-center justify-between gap-4 w-full p-3 rounded-xl ${config.color} text-white transition-all shadow-lg hover:shadow-xl`}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Icon size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-semibold text-sm">{config.label}</div>
                        <div className="text-xs text-white/80">{config.description}</div>
                    </div>
                </div>
                <ArrowRight size={18} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
        </motion.div>
    );
}


# DisclaimerFooter.tsx

'use client';

import { Box, Typography } from '@mui/material';

export default function DisclaimerFooter() {
    return (
        <Box sx={{ mt: 8, mb: 4, px: 2, textAlign: 'center', opacity: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                DISCLAIMER: THIS APPLICATION IS FOR EDUCATIONAL PURPOSES ONLY.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#888', mt: 0.5, fontSize: '0.75rem' }}>
                Do not consider this as financial advice. All investments involve risk.
            </Typography>
        </Box>
    );
}


# DisclaimerModal.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check if user has already acknowledged the disclaimer IN THIS SESSION
        const hasAcknowledged = sessionStorage.getItem('clarity_disclaimer_acknowledged');
        if (!hasAcknowledged) {
            setOpen(true);
        }
    }, []);

    const handleAcknowledge = () => {
        sessionStorage.setItem('clarity_disclaimer_acknowledged', 'true');
        setOpen(false);
    };

    return (
        <Dialog
            open={open}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: '#0B0B0B',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            }}
        >
            <DialogContent sx={{ maxWidth: 600, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ mb: 4, p: 2, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%' }}>
                    <AlertTriangle size={64} color="#00E5FF" />
                </Box>

                <Typography variant="h2" sx={{ fontWeight: 800, color: '#fff', mb: 2, letterSpacing: '-0.02em' }}>
                    EDUCATIONAL USE ONLY
                </Typography>

                <Typography variant="h5" sx={{ color: '#888', mb: 6, fontWeight: 400, lineHeight: 1.6 }}>
                    Clarity is a simulation and analysis tool designed strictly for educational purposes.
                </Typography>

                <Box sx={{ textAlign: 'left', bgcolor: '#111', p: 4, borderRadius: 4, border: '1px solid #222', mb: 6, width: '100%' }}>
                    <Typography variant="body1" sx={{ color: '#ccc', mb: 2, fontWeight: 500 }}>
                        By proceeding, you acknowledge that:
                    </Typography>
                    <ul style={{ color: '#888', paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li>This platform does <strong>not</strong> provide financial advice.</li>
                        <li>No real money is involved in simulated trades.</li>
                        <li>Data provided may not be accurate or real-time.</li>
                        <li>You are solely responsible for your own investment decisions.</li>
                    </ul>
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleAcknowledge}
                    sx={{
                        bgcolor: '#00E5FF',
                        color: '#000',
                        fontWeight: 800,
                        py: 2,
                        px: 8,
                        fontSize: '1.1rem',
                        '&:hover': { bgcolor: '#fff' }
                    }}
                >
                    I UNDERSTAND & AGREE
                </Button>
            </DialogContent>
        </Dialog>
    );
}


# Sidebar.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, Tooltip, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { LayoutDashboard, TrendingUp, PieChart, MessageSquare, LogOut, Menu, X, ChevronRight, ChevronLeft, Eye, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/lib/ui-store';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Market', icon: TrendingUp, path: '/market' },
    { label: 'Watchlist', icon: Eye, path: '/watchlist' },
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


# StockSearchInput.tsx

import { useState, useRef, useEffect } from 'react';
import { Box, TextField, InputAdornment, Paper, List, ListItem, ListItemButton, Typography } from '@mui/material';
import { Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketService } from '@/services/marketService';

interface StockSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (stock: any) => void;
    variant?: 'hero' | 'standard';
    placeholder?: string;
    autoFocus?: boolean;
}

export default function StockSearchInput({
    value,
    onChange,
    onSelect,
    variant = 'standard',
    placeholder = 'Search stocks...',
    autoFocus = false
}: StockSearchInputProps) {
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOptions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = async (query: string) => {
        onChange(query);
        if (query.length > 1) {
            setLoading(true);
            try {
                const results = await marketService.searchStocks(query);
                setOptions(results || []);
            } catch (err) {
                console.error(err);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        } else {
            setOptions([]);
        }
    };

    const isHero = variant === 'hero';

    return (
        <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%' }}>
            <TextField
                fullWidth
                variant={isHero ? "standard" : "outlined"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus={autoFocus}
                InputProps={{
                    disableUnderline: isHero,
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search
                                size={isHero ? 28 : 20}
                                color={isHero ? (value ? "#fff" : "#666") : "#666"}
                            />
                        </InputAdornment>
                    ),
                    sx: isHero ? {
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        fontWeight: 500,
                        color: '#fff',
                        py: 2,
                        borderBottom: '2px solid #333',
                        transition: 'all 0.3s',
                        '&.Mui-focused': {
                            borderBottom: '2px solid #00E5FF'
                        }
                    } : {
                        color: '#fff',
                        bgcolor: '#111',
                        borderRadius: 2,
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#444' },
                        '&.Mui-focused fieldset': { borderColor: '#00E5FF' }
                    }
                }}
            />

            <AnimatePresence>
                {options.length > 0 && (
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: isHero ? 10 : -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isHero ? 10 : -5 }}
                        elevation={8}
                        sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: isHero ? 2 : 1,
                            maxHeight: 300,
                            overflow: 'auto',
                            borderRadius: 3,
                            bgcolor: '#111',
                            border: '1px solid #222',
                            zIndex: 1000
                        }}
                    >
                        <List disablePadding>
                            {options.map((item: any) => (
                                <ListItem key={item.symbol} disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            onChange(item.symbol);
                                            onSelect(item);
                                            setOptions([]);
                                        }}
                                        sx={{
                                            py: isHero ? 2.5 : 1.5,
                                            px: isHero ? 3 : 2,
                                            borderBottom: '1px solid #222',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.05)' }
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: isHero ? '1.1rem' : '0.95rem', color: '#fff' }}>
                                                {item.symbol}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#666', fontSize: isHero ? '0.875rem' : '0.75rem' }}>
                                                {item.name}
                                            </Typography>
                                        </Box>
                                        {isHero && <ArrowRight size={20} color="#333" />}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </AnimatePresence>
        </Box>
    );
}


# AddTransactionModal.tsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import StockSearchInput from '@/components/market/StockSearchInput';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { marketService } from '@/services/marketService';

interface AddTransactionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (ticker: string, shares: number, price: number, type: 'BUY' | 'SELL') => void;
}

export default function AddTransactionModal({ open, onClose, onSubmit }: AddTransactionModalProps) {
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [priceError, setPriceError] = useState('');

    // Auto-fetch price when ticker changes
    useEffect(() => {
        const fetchPrice = async () => {
            if (!ticker || ticker.length < 2) {
                setPrice('');
                setPriceError('');
                return;
            }

            setFetchingPrice(true);
            setPriceError('');

            try {
                const data = await marketService.getStockDetails(ticker.toUpperCase());
                const currentPrice = data.market_data?.price || data.price || data.current_price || 0;

                if (currentPrice > 0) {
                    setPrice(currentPrice.toString());
                    setPriceError('');
                } else {
                    setPrice('');
                    setPriceError('Price unavailable');
                }
            } catch (error) {
                console.error('Failed to fetch price:', error);
                setPrice('');
                setPriceError('Stock not found');
            } finally {
                setFetchingPrice(false);
            }
        };

        const timer = setTimeout(fetchPrice, 500);
        return () => clearTimeout(timer);
    }, [ticker]);

    const handleSubmit = () => {
        if (ticker && shares && price && Number(shares) > 0 && Number(price) > 0) {
            onSubmit(ticker.toUpperCase(), Number(shares), Number(price), type);
            // Reset
            setTicker('');
            setShares('');
            setPrice('');
            setType('BUY');
            setPriceError('');
        }
    };

    const handleClose = () => {
        setTicker('');
        setShares('');
        setPrice('');
        setType('BUY');
        setPriceError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#050505',
                    border: '1px solid #222',
                    borderRadius: 4,
                    minWidth: 400,
                    p: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 700 }}>
                Add Transaction
                <IconButton onClick={handleClose} size="small" sx={{ color: '#666' }}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {/* Buy/Sell buttons */}
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: '#111', p: 0.5, borderRadius: 2 }}>
                        {['BUY', 'SELL'].map((t) => (
                            <Tooltip
                                key={t}
                                title={t === 'SELL' ? 'Short selling coming soon' : ''}
                                arrow
                                placement="top"
                            >
                                <span style={{ flex: 1 }}>
                                    <Button
                                        fullWidth
                                        onClick={() => setType(t as any)}
                                        disabled={t === 'SELL'}
                                        sx={{
                                            bgcolor: type === t ? (t === 'BUY' ? '#10B981' : '#EF4444') : 'transparent',
                                            color: type === t ? '#000' : t === 'SELL' ? '#444' : '#666',
                                            fontWeight: 700,
                                            borderRadius: 1.5,
                                            cursor: t === 'SELL' ? 'not-allowed' : 'pointer',
                                            opacity: t === 'SELL' ? 0.4 : 1,
                                            '&:hover': {
                                                bgcolor: t === 'SELL' ? 'transparent' : (type === t ? (t === 'BUY' ? '#059669' : '#DC2626') : 'rgba(255,255,255,0.05)')
                                            },
                                            '&.Mui-disabled': {
                                                color: '#444',
                                                bgcolor: 'transparent'
                                            }
                                        }}
                                    >
                                        {t}
                                    </Button>
                                </span>
                            </Tooltip>
                        ))}
                    </Box>

                    {/* Stock Search via Reusable Component */}
                    <StockSearchInput
                        value={ticker}
                        onChange={(val: string) => setTicker(val.toUpperCase())}
                        onSelect={(item: any) => {
                            setTicker(item.symbol);
                        }}
                        placeholder="Search stocks (e.g. RELIANCE, TCS)"
                        variant="standard"
                    />

                    {priceError && (
                        <ErrorBanner error={priceError} onRetry={() => setTicker(ticker)} />
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Quantity"
                            type="number"
                            fullWidth
                            value={shares}
                            onChange={(e) => setShares(e.target.value)}
                            placeholder="Number of shares"
                            InputProps={{ sx: { color: '#fff', bgcolor: '#111', borderRadius: 2, '& fieldset': { borderColor: '#333' } } }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                        />
                        <TextField
                            label="Current Price"
                            type="text"
                            fullWidth
                            value={fetchingPrice ? 'Fetching...' : price ? `₹${Number(price).toLocaleString()}` : ''}
                            disabled
                            InputProps={{
                                sx: {
                                    color: '#00E5FF',
                                    bgcolor: '#0A0A0A',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#333' },
                                    fontWeight: 700
                                }
                            }}
                            InputLabelProps={{ sx: { color: '#666' } }}
                            helperText="Auto-fetched from market"
                            FormHelperTextProps={{ sx: { color: '#666', fontSize: '0.7rem' } }}
                        />
                    </Box>

                    {price && shares && (
                        <Box sx={{ p: 2, bgcolor: 'rgba(0, 229, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                            <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
                                Total Investment
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#00E5FF', fontWeight: 700 }}>
                                ₹{(Number(price) * Number(shares)).toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!ticker || !shares || !price || Number(shares) <= 0 || Number(price) <= 0 || fetchingPrice || !!priceError}
                    sx={{
                        bgcolor: '#fff', color: '#000', fontWeight: 700, py: 1.5, borderRadius: 3,
                        '&:hover': { bgcolor: '#e0e0e0' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    {fetchingPrice ? 'Fetching Price...' : 'Confirm Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


# HoldingsTable.tsx

import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { motion } from 'framer-motion';

interface HoldingsTableProps {
    portfolio: any; // Type 'Portfolio' should ideally be imported
}

export default function HoldingsTable({ portfolio }: HoldingsTableProps) {
    if (!portfolio || !portfolio.holdings) return null;

    return (
        <TableContainer sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ '& th': { borderBottom: '1px solid #222', color: '#666', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', py: 2 } }}>
                        <TableCell>ASSET</TableCell>
                        <TableCell align="right">SHARES</TableCell>
                        <TableCell align="right">AVG PRICE</TableCell>
                        <TableCell align="right">LTP</TableCell>
                        <TableCell align="right">INVESTED</TableCell>
                        <TableCell align="right">CURRENT</TableCell>
                        <TableCell align="right">RETURN</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {portfolio.holdings.map((stock: any, i: number) => (
                        <TableRow
                            key={`${stock.ticker}-${i}`}
                            component={motion.tr}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            sx={{
                                '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 3, color: '#ddd', fontSize: '1.05rem' },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', fontWeight: 700, color: '#666' }}>
                                        {stock.ticker[0]}
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{stock.ticker}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#888' }}>{stock.shares}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.avg_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>₹{stock.current_price.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.invested_value.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{stock.current_value.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Typography variant="body1" sx={{ color: stock.gain >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                        {stock.gain >= 0 ? '+' : ''}₹{stock.gain.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: stock.gain >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 600 }}>
                                        {stock.gain_pct.toFixed(2)}%
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                    {portfolio.holdings.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#666' }}>
                                No holdings in {portfolio.name}. Click "Add Transaction" to start.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}


# PortfolioChart.tsx

import React from 'react';
import { Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';

const SECTOR_COLORS = ['#00E5FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

interface PortfolioChartProps {
    data: any[];
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
    return (
        <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color || SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }}
                        itemStyle={{ color: '#fff' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}


# BudgetInput.tsx

'use client';

import React from 'react';
import { Box, Button, TextField, InputAdornment, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface BudgetInputProps {
    value: number;
    onChange: (value: number) => void;
    onNext: () => void;
}

const QUICK_SELECT_AMOUNTS = [25000, 50000, 100000, 250000];

export default function BudgetInput({ value, onChange, onNext }: BudgetInputProps) {
    const [customInput, setCustomInput] = React.useState(value > 0 ? value.toString() : '');

    const handleQuickSelect = (amount: number) => {
        onChange(amount);
        setCustomInput(amount.toString());
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setCustomInput(val);
        const numVal = parseInt(val) || 0;
        onChange(numVal);
    };

    const handleNext = () => {
        if (value >= 10000) {
            onNext();
        }
    };

    const isValid = value >= 10000 && value <= 10000000;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box>
                {/* Quick Select Chips */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    {QUICK_SELECT_AMOUNTS.map((amount) => (
                        <Button
                            key={amount}
                            onClick={() => handleQuickSelect(amount)}
                            variant={value === amount ? 'contained' : 'outlined'}
                            sx={{
                                px: 3,
                                py: 1.5,
                                borderRadius: 3,
                                bgcolor: value === amount ? '#00E5FF' : 'transparent',
                                color: value === amount ? '#000' : '#666',
                                border: value === amount ? 'none' : '1px solid #333',
                                fontWeight: value === amount ? 700 : 500,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: value === amount ? '#00E5FF' : 'rgba(255,255,255,0.05)',
                                    color: value === amount ? '#000' : '#fff',
                                    borderColor: value === amount ? 'transparent' : '#555'
                                }
                            }}
                        >
                            {amount >= 100000 ? `₹${amount / 100000}L` : `₹${amount / 1000}K`}
                        </Button>
                    ))}
                </Box>

                {/* Custom Input */}
                <TextField
                    fullWidth
                    value={customInput}
                    onChange={handleCustomChange}
                    placeholder="Enter amount (₹)"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Typography sx={{ color: '#666', ml: 0.5, fontWeight: 700 }}>₹</Typography>
                            </InputAdornment>
                        ),
                        sx: {
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            color: '#fff',
                            bgcolor: '#0A0A0A',
                            borderRadius: 3,
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#333'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#555'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#00E5FF'
                            }
                        }
                    }}
                />

                {/* Validation Message */}
                <Box sx={{ mt: 2, minHeight: 24 }}>
                    {value > 0 && value < 10000 && (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>
                            Minimum investment: ₹10,000
                        </Typography>
                    )}
                    {value > 1000000 && (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>
                            Maximum investment: ₹10,00,000
                        </Typography>
                    )}
                    {isValid && (
                        <Typography variant="caption" sx={{ color: '#10B981' }}>
                            ✓ Perfect! ₹{value.toLocaleString()} is a great starting point.
                        </Typography>
                    )}
                </Box>

                {/* Next Button */}
                <Button
                    fullWidth
                    onClick={handleNext}
                    disabled={!isValid}
                    sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: 3,
                        bgcolor: isValid ? '#00E5FF' : '#222',
                        color: isValid ? '#000' : '#666',
                        fontWeight: 700,
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: isValid ? '#00D4E6' : '#222',
                            transform: isValid ? 'translateY(-2px)' : 'none'
                        },
                        '&:disabled': {
                            bgcolor: '#222',
                            color: '#666'
                        }
                    }}
                >
                    Continue
                </Button>
            </Box>
        </motion.div>
    );
}


# DiscoveryChat.tsx

'use client';

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SwitchAIButton from '@/components/common/SwitchAIButton';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggest_switch?: {
        to: 'advisor' | 'discovery_hub';
        reason: string;
        original_query?: string;
    };
}

interface DiscoveryChatProps {
    messages: Message[];
    input: string;
    loading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
}

export default function DiscoveryChat({
    messages
}: DiscoveryChatProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <Box sx={{
            p: { xs: 3, md: 4 },
            pt: 8,
            maxWidth: 800,
            mx: 'auto',
            width: '100%'
        }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                duration: 0.4,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                        >
                            <Box sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                            }}>
                                <Avatar
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: message.role === 'assistant'
                                            ? 'transparent'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        background: message.role === 'assistant'
                                            ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        fontSize: '1.2rem',
                                        flexShrink: 0
                                    }}
                                >
                                    {message.role === 'assistant' ? (
                                        <Sparkles size={20} color="#fff" />
                                    ) : (
                                        '👤'
                                    )}
                                </Avatar>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        maxWidth: '75%',
                                        bgcolor: message.role === 'user'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(139, 92, 246, 0.08)',
                                        border: message.role === 'user'
                                            ? '1px solid rgba(255, 255, 255, 0.1)'
                                            : '1px solid rgba(139, 92, 246, 0.2)',
                                        borderRadius: 3,
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            color: '#fff',
                                            fontSize: '0.9375rem',
                                            lineHeight: 1.7,
                                            '& h1, & h2, & h3': {
                                                color: '#A78BFA',
                                                fontWeight: 600,
                                                mt: 2,
                                                mb: 1,
                                                '&:first-of-type': { mt: 0 }
                                            },
                                            '& h2': { fontSize: '1.125rem' },
                                            '& h3': { fontSize: '1rem' },
                                            '& p': {
                                                mb: 1.5,
                                                '&:last-child': { mb: 0 }
                                            },
                                            '& ul, & ol': {
                                                pl: 3,
                                                mb: 1.5,
                                                '& li': {
                                                    mb: 0.5,
                                                    '& ul, & ol': {
                                                        mt: 0.5,
                                                        mb: 0
                                                    }
                                                }
                                            },
                                            '& strong': {
                                                color: '#A78BFA',
                                                fontWeight: 600
                                            },
                                            '& code': {
                                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                px: 0.5,
                                                py: 0.25,
                                                borderRadius: 0.5,
                                                fontSize: '0.875rem'
                                            }
                                        }}
                                    >
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </Box>

                                    {/* Switch AI Button */}
                                    {message.suggest_switch && (
                                        <Box sx={{ mt: 2 }}>
                                            <SwitchAIButton
                                                target={message.suggest_switch.to}
                                                originalQuery={message.suggest_switch.original_query || ''}
                                                reason={message.suggest_switch.reason}
                                            />
                                        </Box>
                                    )}

                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mt: 1,
                                            color: 'rgba(255, 255, 255, 0.4)',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Paper>
                            </Box>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </Box>
        </Box>
    );
}


# DiscoveryHistory.tsx

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


# HorizonSelector.tsx

'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Zap } from 'lucide-react';

interface HorizonSelectorProps {
    value: 'short' | 'medium' | 'long' | null;
    onChange: (value: 'short' | 'medium' | 'long') => void;
    onNext: () => void;
}

const HORIZONS = [
    {
        value: 'short' as const,
        label: 'Short Term',
        subtitle: '< 1 year',
        icon: Zap,
        color: '#F59E0B',
        description: 'Quick gains, higher volatility'
    },
    {
        value: 'medium' as const,
        label: 'Medium Term',
        subtitle: '1-3 years',
        icon: TrendingUp,
        color: '#00E5FF',
        description: 'Balanced growth & stability'
    },
    {
        value: 'long' as const,
        label: 'Long Term',
        subtitle: '3+ years',
        icon: Clock,
        color: '#10B981',
        description: 'Wealth building, compounding'
    }
];

export default function HorizonSelector({ value, onChange, onNext }: HorizonSelectorProps) {
    const handleSelect = (horizon: 'short' | 'medium' | 'long') => {
        onChange(horizon);
        // Auto-advance after selection
        setTimeout(() => onNext(), 500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {HORIZONS.map((horizon, index) => {
                    const Icon = horizon.icon;
                    const isSelected = value === horizon.value;

                    return (
                        <motion.div
                            key={horizon.value}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ flex: 1 }}
                        >
                            <Button
                                onClick={() => handleSelect(horizon.value)}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: 180,
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: isSelected ? `${horizon.color}20` : '#0A0A0A',
                                    border: isSelected ? `2px solid ${horizon.color}` : '1px solid #222',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: horizon.color,
                                        bgcolor: `${horizon.color}10`,
                                        '& .icon-box': {
                                            bgcolor: horizon.color,
                                            transform: 'scale(1.1)'
                                        }
                                    }
                                }}
                            >
                                {/* Background Glow */}
                                {isSelected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -50,
                                            right: -50,
                                            width: 150,
                                            height: 150,
                                            borderRadius: '50%',
                                            filter: 'blur(60px)',
                                            opacity: 0.3,
                                            bgcolor: horizon.color
                                        }}
                                    />
                                )}

                                {/* Icon */}
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 3,
                                        bgcolor: isSelected ? horizon.color : 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    <Icon size={28} color={isSelected ? '#000' : horizon.color} />
                                </Box>

                                {/* Content */}
                                <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: isSelected ? horizon.color : '#fff',
                                            mb: 0.5
                                        }}
                                    >
                                        {horizon.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#666',
                                            display: 'block',
                                            mb: 1
                                        }}
                                    >
                                        {horizon.subtitle}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#888',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {horizon.description}
                                    </Typography>
                                </Box>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: horizon.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2
                                        }}
                                    >
                                        <Typography sx={{ color: '#000', fontSize: '0.75rem', fontWeight: 700 }}>
                                            ✓
                                        </Typography>
                                    </motion.div>
                                )}
                            </Button>
                        </motion.div>
                    );
                })}
            </Box>
        </motion.div>
    );
}


# PortfolioBuilder.tsx

'use client';

import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Shield, DollarSign } from 'lucide-react';

interface PortfolioAllocation {
    symbol: string;
    allocation_percent: number;
    amount: number;
    shares: number;
    price_per_share: number;
}

interface PortfolioBuilderProps {
    allocations: PortfolioAllocation[];
    totalBudget: number;
    riskLevel: string;
    estimatedReturn: number;
}

const COLORS = ['#00E5FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function PortfolioBuilder({ allocations, totalBudget, riskLevel, estimatedReturn }: PortfolioBuilderProps) {
    const pieData = allocations.map((alloc, i) => ({
        name: alloc.symbol,
        value: alloc.allocation_percent,
        color: COLORS[i % COLORS.length]
    }));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Your Optimized Portfolio
                </Typography>
                <Typography variant="body1" sx={{ color: '#666' }}>
                    AI-calculated allocation based on your preferences
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Pie Chart */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 4, borderRadius: 4, bgcolor: '#0A0A0A', border: '1px solid #222', height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                            Allocation Breakdown
                        </Typography>

                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <Paper sx={{ p: 2, bgcolor: '#0A0A0A', border: '1px solid #333' }}>
                                                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                                                        {payload[0].name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#666' }}>
                                                        {payload[0].value}%
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <Box sx={{ mt: 3 }}>
                            {pieData.map((entry, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: entry.color }} />
                                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                                        {entry.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#666', ml: 'auto' }}>
                                        {entry.value}%
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Allocation Details */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Summary Cards */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#0A0A0A', border: '1px solid #222' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <DollarSign size={20} color="#00E5FF" />
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            Total Investment
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#00E5FF' }}>
                                        ₹{totalBudget.toLocaleString()}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#0A0A0A', border: '1px solid #222' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Shield size={20} color="#10B981" />
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            Risk Level
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#10B981' }}>
                                        {riskLevel}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#0A0A0A', border: '1px solid #222' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <TrendingUp size={20} color="#F59E0B" />
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            Est. Return (1Y)
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#F59E0B' }}>
                                        {estimatedReturn}%
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Stock Breakdown */}
                        {allocations.map((alloc, i) => (
                            <Paper
                                key={alloc.symbol}
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: '#0A0A0A',
                                    border: '1px solid #222',
                                    borderLeft: `4px solid ${COLORS[i % COLORS.length]}`
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {alloc.symbol}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            {alloc.allocation_percent}% of portfolio
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                                        ₹{alloc.amount.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 4 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                                            Shares
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {alloc.shares}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                                            Price/Share
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            ₹{alloc.price_per_share.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </Grid>
            </Grid>
        </motion.div>
    );
}


# QuestionnaireFlow.tsx

'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import BudgetInput from './BudgetInput';
import HorizonSelector from './HorizonSelector';
import RiskProfileCards from './RiskProfileCards';
import SectorPreferences from './SectorPreferences';

export interface QuestionnaireData {
    budget: number;
    horizon: 'short' | 'medium' | 'long' | null;
    riskProfile: 'conservative' | 'balanced' | 'aggressive' | null;
    sectorPreferences: string[];
}

interface QuestionnaireFlowProps {
    sector: string;
    onComplete: (data: QuestionnaireData) => void;
}

const QUESTIONS = [
    {
        id: 'budget',
        question: "What's your investment budget?",
        aiMessage: "Let's start by understanding your investment capacity. What budget are you comfortable with?"
    },
    {
        id: 'horizon',
        question: 'How long do you plan to hold these investments?',
        aiMessage: "Great choice! Now, what's your investment timeframe?"
    },
    {
        id: 'risk',
        question: "What's your risk tolerance?",
        aiMessage: "Perfect! Now, how comfortable are you with market volatility?"
    },
    {
        id: 'preferences',
        question: 'Any specific focus areas?',
        aiMessage: "Almost done! Want to narrow down to specific sub-sectors?"
    }
];

export default function QuestionnaireFlow({ sector, onComplete }: QuestionnaireFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<QuestionnaireData>({
        budget: 0,
        horizon: null,
        riskProfile: null,
        sectorPreferences: []
    });

    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
    const currentQuestion = QUESTIONS[currentStep];

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Complete questionnaire
            onComplete(data);
        }
    };

    const handleSkip = () => {
        // Skip preferences and complete
        onComplete(data);
    };

    return (
        <Box>
            {/* Progress Bar */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                        Question {currentStep + 1} of {QUESTIONS.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600 }}>
                        {Math.round(progress)}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#222',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: '#00E5FF',
                            borderRadius: 3,
                            transition: 'transform 0.4s ease'
                        }
                    }}
                />
            </Box>

            {/* AI Message */}
            <motion.div
                key={`ai-${currentStep}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                            borderRadius: 2,
                            bgcolor: '#00E5FF20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Sparkles size={20} color="#00E5FF" />
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Clarity AI
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#fff', lineHeight: 1.6 }}>
                            {currentQuestion.aiMessage}
                        </Typography>
                    </Box>
                </Box>
            </motion.div>

            {/* Question Card */}
            <Paper
                sx={{
                    p: 4,
                    borderRadius: 4,
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background Glow */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        filter: 'blur(80px)',
                        opacity: 0.1,
                        bgcolor: '#00E5FF'
                    }}
                />

                {/* Question Title */}
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        mb: 4,
                        color: '#fff',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {currentQuestion.question}
                </Typography>

                {/* Question Content */}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <BudgetInput
                                key="budget"
                                value={data.budget}
                                onChange={(value) => setData({ ...data, budget: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 1 && (
                            <HorizonSelector
                                key="horizon"
                                value={data.horizon}
                                onChange={(value) => setData({ ...data, horizon: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 2 && (
                            <RiskProfileCards
                                key="risk"
                                value={data.riskProfile}
                                onChange={(value) => setData({ ...data, riskProfile: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 3 && (
                            <SectorPreferences
                                key="preferences"
                                sector={sector}
                                value={data.sectorPreferences}
                                onChange={(value) => setData({ ...data, sectorPreferences: value })}
                                onNext={handleNext}
                                onSkip={handleSkip}
                            />
                        )}
                    </AnimatePresence>
                </Box>
            </Paper>
        </Box>
    );
}


# RiskProfileCards.tsx

'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Shield, BarChart3, Rocket } from 'lucide-react';

interface RiskProfileCardsProps {
    value: 'conservative' | 'balanced' | 'aggressive' | null;
    onChange: (value: 'conservative' | 'balanced' | 'aggressive') => void;
    onNext: () => void;
}

const RISK_PROFILES = [
    {
        value: 'conservative' as const,
        label: 'Conservative',
        icon: Shield,
        color: '#10B981',
        traits: ['Low volatility', 'Stable returns', 'Capital preservation'],
        description: 'Minimize risk, steady growth'
    },
    {
        value: 'balanced' as const,
        label: 'Balanced',
        icon: BarChart3,
        color: '#00E5FF',
        traits: ['Moderate risk', 'Balanced gains', 'Diversified approach'],
        description: 'Growth with controlled risk'
    },
    {
        value: 'aggressive' as const,
        label: 'Aggressive',
        icon: Rocket,
        color: '#F59E0B',
        traits: ['High growth', 'Accept swings', 'Maximum returns'],
        description: 'High risk, high reward'
    }
];

export default function RiskProfileCards({ value, onChange, onNext }: RiskProfileCardsProps) {
    const handleSelect = (profile: 'conservative' | 'balanced' | 'aggressive') => {
        onChange(profile);
        // Auto-advance after selection
        setTimeout(() => onNext(), 500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {RISK_PROFILES.map((profile, index) => {
                    const Icon = profile.icon;
                    const isSelected = value === profile.value;

                    return (
                        <motion.div
                            key={profile.value}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ flex: 1 }}
                        >
                            <Button
                                onClick={() => handleSelect(profile.value)}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: 220,
                                    p: 4,
                                    borderRadius: 4,
                                    bgcolor: isSelected ? `${profile.color}20` : '#0A0A0A',
                                    border: isSelected ? `2px solid ${profile.color}` : '1px solid #222',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    justifyContent: 'flex-start',
                                    gap: 2,
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    textAlign: 'left',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: profile.color,
                                        bgcolor: `${profile.color}10`,
                                        '& .icon-box': {
                                            bgcolor: profile.color,
                                            transform: 'rotate(10deg) scale(1.1)'
                                        }
                                    }
                                }}
                            >
                                {/* Background Glow */}
                                {isSelected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -50,
                                            right: -50,
                                            width: 150,
                                            height: 150,
                                            borderRadius: '50%',
                                            filter: 'blur(60px)',
                                            opacity: 0.3,
                                            bgcolor: profile.color
                                        }}
                                    />
                                )}

                                {/* Icon */}
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 3,
                                        bgcolor: isSelected ? profile.color : 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        zIndex: 1,
                                        mb: 1
                                    }}
                                >
                                    <Icon size={26} color={isSelected ? '#000' : profile.color} />
                                </Box>

                                {/* Content */}
                                <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: isSelected ? profile.color : '#fff',
                                            mb: 0.5
                                        }}
                                    >
                                        {profile.label}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#888',
                                            fontSize: '0.85rem',
                                            mb: 2
                                        }}
                                    >
                                        {profile.description}
                                    </Typography>

                                    {/* Traits */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {profile.traits.map((trait, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 4,
                                                        height: 4,
                                                        borderRadius: '50%',
                                                        bgcolor: isSelected ? profile.color : '#666'
                                                    }}
                                                />
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: isSelected ? '#fff' : '#666',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    {trait}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            backgroundColor: profile.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2
                                        }}
                                    >
                                        <Typography sx={{ color: '#000', fontSize: '0.875rem', fontWeight: 700 }}>
                                            ✓
                                        </Typography>
                                    </motion.div>
                                )}
                            </Button>
                        </motion.div>
                    );
                })}
            </Box>
        </motion.div>
    );
}


# SectorPreferences.tsx

'use client';

import React from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { Code, Cloud, Shield as ShieldIcon, Cpu, Database, Smartphone } from 'lucide-react';

interface SectorPreferencesProps {
    sector: string;
    value: string[];
    onChange: (value: string[]) => void;
    onNext: () => void;
    onSkip: () => void;
}

// Sector-specific sub-categories
const SECTOR_CATEGORIES: Record<string, Array<{ label: string; icon: any }>> = {
    'NIFTY IT': [
        { label: 'IT Services', icon: Code },
        { label: 'Software Products', icon: Cpu },
        { label: 'Cloud Infrastructure', icon: Cloud },
        { label: 'Cybersecurity', icon: ShieldIcon },
        { label: 'Data Analytics', icon: Database }
    ],
    'NIFTY BANK': [
        { label: 'Private Banks', icon: Code },
        { label: 'PSU Banks', icon: Cpu },
        { label: 'NBFCs', icon: Cloud },
        { label: 'Digital Banking', icon: ShieldIcon }
    ],
    'NIFTY PHARMA': [
        { label: 'Generic Drugs', icon: Code },
        { label: 'Specialty Pharma', icon: Cpu },
        { label: 'Biotech', icon: Cloud },
        { label: 'API Manufacturers', icon: ShieldIcon }
    ],
    'DEFAULT': [
        { label: 'Large Cap', icon: Code },
        { label: 'Mid Cap', icon: Cpu },
        { label: 'Small Cap', icon: Cloud },
        { label: 'Blue Chip', icon: ShieldIcon }
    ]
};

export default function SectorPreferences({ sector, value, onChange, onNext, onSkip }: SectorPreferencesProps) {
    const categories = SECTOR_CATEGORIES[sector] || SECTOR_CATEGORIES['DEFAULT'];

    const handleToggle = (category: string) => {
        if (value.includes(category)) {
            onChange(value.filter(v => v !== category));
        } else {
            onChange([...value, category]);
        }
    };

    const handleContinue = () => {
        if (value.length > 0) {
            onNext();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Box>
                <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>
                    Select one or more areas of interest (optional)
                </Typography>

                {/* Category Chips */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                    {categories.map((category, index) => {
                        const Icon = category.icon;
                        const isSelected = value.includes(category.label);

                        return (
                            <motion.div
                                key={category.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Chip
                                    icon={<Icon size={16} />}
                                    label={category.label}
                                    onClick={() => handleToggle(category.label)}
                                    sx={{
                                        px: 2,
                                        py: 2.5,
                                        height: 'auto',
                                        borderRadius: 3,
                                        bgcolor: isSelected ? '#00E5FF20' : '#0A0A0A',
                                        color: isSelected ? '#00E5FF' : '#666',
                                        border: isSelected ? '2px solid #00E5FF' : '1px solid #333',
                                        fontWeight: isSelected ? 700 : 500,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        '& .MuiChip-icon': {
                                            color: isSelected ? '#00E5FF' : '#666'
                                        },
                                        '&:hover': {
                                            bgcolor: isSelected ? '#00E5FF30' : 'rgba(255,255,255,0.05)',
                                            borderColor: isSelected ? '#00E5FF' : '#555',
                                            color: isSelected ? '#00E5FF' : '#fff',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    })}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        fullWidth
                        onClick={onSkip}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            bgcolor: 'transparent',
                            color: '#666',
                            border: '1px solid #333',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderColor: '#555',
                                color: '#fff'
                            }
                        }}
                    >
                        Skip
                    </Button>
                    <Button
                        fullWidth
                        onClick={handleContinue}
                        disabled={value.length === 0}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            bgcolor: value.length > 0 ? '#00E5FF' : '#222',
                            color: value.length > 0 ? '#000' : '#666',
                            fontWeight: 700,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: value.length > 0 ? '#00D4E6' : '#222',
                                transform: value.length > 0 ? 'translateY(-2px)' : 'none'
                            },
                            '&:disabled': {
                                bgcolor: '#222',
                                color: '#666'
                            }
                        }}
                    >
                        Continue ({value.length} selected)
                    </Button>
                </Box>
            </Box>
        </motion.div>
    );
}


# SelectionBar.tsx

'use client';

import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SelectionBarProps {
    selectedStocks: string[];
    onRemove: (symbol: string) => void;
    onContinue: () => void;
    onCompare: () => void;
    onBacktrack: () => void;
}

export default function SelectionBar({ selectedStocks, onRemove, onContinue, onCompare, onBacktrack }: SelectionBarProps) {
    if (selectedStocks.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000
                }}
            >
                <Paper
                    sx={{
                        p: 3,
                        bgcolor: '#0A0A0A',
                        borderTop: '2px solid #00E5FF',
                        borderRadius: 0,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <Box sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                    }}>
                        {/* Selected Stocks */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#666', fontWeight: 600 }}>
                                Selected ({selectedStocks.length}/5):
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {selectedStocks.map((symbol) => (
                                    <Box
                                        key={symbol}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            px: 2,
                                            py: 1,
                                            borderRadius: 2,
                                            bgcolor: '#00E5FF20',
                                            border: '1px solid #00E5FF'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: '#00E5FF', fontWeight: 600 }}>
                                            {symbol}
                                        </Typography>
                                        <Box
                                            onClick={() => onRemove(symbol)}
                                            sx={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#00E5FF',
                                                '&:hover': { color: '#fff' }
                                            }}
                                        >
                                            <X size={14} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={onBacktrack}
                                disabled={selectedStocks.length === 0}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#8B5CF6',
                                        color: '#8B5CF6',
                                        bgcolor: 'rgba(139, 92, 246, 0.05)'
                                    },
                                    '&:disabled': {
                                        borderColor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Backtrack
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={onCompare}
                                disabled={selectedStocks.length < 2}
                                sx={{
                                    borderColor: '#333',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#00E5FF',
                                        color: '#00E5FF',
                                        bgcolor: 'rgba(0, 229, 255, 0.05)'
                                    },
                                    '&:disabled': {
                                        borderColor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Compare Stocks
                            </Button>
                            <Button
                                variant="contained"
                                onClick={onContinue}
                                disabled={selectedStocks.length < 2}
                                sx={{
                                    bgcolor: '#00E5FF',
                                    color: '#000',
                                    fontWeight: 700,
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: '#00D4E6'
                                    },
                                    '&:disabled': {
                                        bgcolor: '#222',
                                        color: '#444'
                                    }
                                }}
                            >
                                Build Portfolio ({selectedStocks.length})
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </motion.div>
        </AnimatePresence>
    );
}


# StockQuickCard.tsx

'use client';

import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

interface StockQuickCardProps {
    stock: StockRecommendation;
    index: number;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleSelect: () => void;
}

export default function StockQuickCard({
    stock,
    index,
    isSelected,
    isExpanded,
    onToggleExpand,
    onToggleSelect
}: StockQuickCardProps) {
    const isPositive = (stock.change || 0) >= 0;
    const actionColor = stock.action === 'BUY' ? '#10B981' : stock.action === 'SELL' ? '#EF4444' : '#F59E0B';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Paper
                sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: '#0A0A0A',
                    border: isSelected ? `2px solid #00E5FF` : '1px solid #222',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: isSelected ? '#00E5FF' : '#444',
                        bgcolor: '#111'
                    }
                }}
            >
                {/* Background Glow for Selected */}
                {isSelected && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -50,
                            right: -50,
                            width: 150,
                            height: 150,
                            borderRadius: '50%',
                            filter: 'blur(60px)',
                            opacity: 0.2,
                            bgcolor: '#00E5FF'
                        }}
                    />
                )}

                {/* Header */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {stock.symbol}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                            {stock.name}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                            label={stock.action}
                            sx={{
                                bgcolor: `${actionColor}20`,
                                color: actionColor,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                height: 24,
                                borderRadius: 2
                            }}
                        />
                        {isSelected && (
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: '#00E5FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Typography sx={{ color: '#000', fontSize: '0.75rem', fontWeight: 700 }}>
                                    ✓
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Price & Score */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            ₹{stock.price.toLocaleString()}
                        </Typography>
                        {stock.change !== undefined && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                {isPositive ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                <Typography variant="caption" sx={{ color: isPositive ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                    {isPositive ? '+' : ''}{stock.change}%
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                            Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#00E5FF' }}>
                            {stock.score}
                        </Typography>
                    </Box>
                </Box>

                {/* Reasoning Preview */}
                <Box
                    onClick={onToggleSelect}
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        mb: isExpanded ? 0 : 2
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#888',
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: isExpanded ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}
                    >
                        {stock.reasoning}
                    </Typography>
                </Box>

                {/* Expand Button */}
                <Box
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                    }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        pt: 2,
                        borderTop: '1px solid #222',
                        color: '#666',
                        transition: 'color 0.2s',
                        position: 'relative',
                        zIndex: 1,
                        '&:hover': {
                            color: '#00E5FF'
                        }
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {isExpanded ? 'Show Less' : 'View Details'}
                    </Typography>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Box>
            </Paper>
        </motion.div>
    );
}


# ClarityLogo.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ClarityLogo({ size = 40, className = "" }: { size?: number, className?: string }) {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Glow Pulse */}
                <motion.circle
                    cx="50" cy="50" r="45"
                    fill="url(#msg-gradient)"
                    opacity="0.2"
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Main Star Shape */}
                <motion.path
                    d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z"
                    fill="url(#main-gradient)"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, type: "spring" }}
                />

                {/* Inner Detail */}
                <circle cx="50" cy="50" r="10" fill="#fff" fillOpacity="0.9" />

                <defs>
                    <linearGradient id="main-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00E5FF" />
                        <stop offset="1" stopColor="#2979FF" />
                    </linearGradient>
                    <radialGradient id="msg-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(50)">
                        <stop stopColor="#00E5FF" />
                        <stop offset="1" stopColor="#00E5FF" stopOpacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        </div>
    );
}


# ContextMenu.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/ui-store';

export default function ContextMenu() {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const isMenuVisibleRef = useRef(false);
    const lastRightClickTimeRef = useRef(0);

    const openQuickChat = useUIStore((state) => state.openQuickChat);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const selection = window.getSelection()?.toString().trim();
            const now = Date.now();
            const timeSinceLastClick = now - lastRightClickTimeRef.current;

            console.log('Right click detected', {
                isMenuVisible: isMenuVisibleRef.current,
                timeSinceLastClick,
                hasSelection: !!selection
            });

            // If menu is already visible and user right-clicks again within 2 seconds, allow native menu
            if (isMenuVisibleRef.current && timeSinceLastClick < 2000) {
                console.log('Second click detected - allowing native menu');
                setVisible(false);
                isMenuVisibleRef.current = false;
                lastRightClickTimeRef.current = 0;
                // Don't call e.preventDefault() - this allows native menu
                return;
            }

            // Show custom menu if text is selected
            if (selection && selection.length > 2) {
                console.log('Showing custom menu');
                e.preventDefault();
                setSelectedText(selection);
                setPosition({ x: e.clientX, y: e.clientY });
                setVisible(true);
                isMenuVisibleRef.current = true;
                lastRightClickTimeRef.current = now;
            } else {
                // No text selected - allow native menu
                console.log('No selection - allowing native menu');
                setVisible(false);
                isMenuVisibleRef.current = false;
                lastRightClickTimeRef.current = 0;
            }
        };

        const handleClick = (e: MouseEvent) => {
            // Close menu on any click
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setVisible(false);
                isMenuVisibleRef.current = false;
            }
        };

        const handleScroll = () => {
            // Close menu on scroll
            if (visible) {
                setVisible(false);
                isMenuVisibleRef.current = false;
            }
        }

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        document.addEventListener('scroll', handleScroll);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('scroll', handleScroll);
        };
    }, [visible]);

    const handleAskAI = () => {
        if (!selectedText) return;

        // Mobile: Redirect directly to Advisor (since Quick Advisor is hidden)
        if (window.innerWidth < 768) {
            const query = encodeURIComponent(`Explain "${selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}" and its impact on the market.`);
            router.push(`/advisor?query=${query}`);
        } else {
            // Desktop: Open Quick Chat
            openQuickChat(`Explain "${selectedText}" and its impact.`);
        }
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{
                        position: 'fixed',
                        top: position.y + 10,
                        left: position.x,
                        zIndex: 9999,
                    }}
                >
                    <div
                        onClick={handleAskAI}
                        className="cursor-pointer flex items-center gap-2.5 bg-[#111] border border-white/10 px-3 py-2 rounded-lg shadow-xl hover:bg-[#1A1A1A] hover:border-white/20 transition-all select-none"
                    >
                        <Sparkles size={14} className="text-[#00E5FF]" />
                        <span className="text-white text-sm font-medium">Ask Clarity AI</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


# CustomDatePicker.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Paper, Grid } from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
}

export default function CustomDatePicker({ value, onChange, label = "Select Date", minDate }: CustomDatePickerProps & { minDate?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Date State
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [view, setView] = useState<'days' | 'months' | 'years'>('days');

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const handleDateClick = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleMonthClick = (monthIndex: number) => {
        setCurrentMonth(monthIndex);
        setView('years'); // User requested: Month -> Year
    };

    const handleYearClick = (year: number) => {
        setCurrentYear(year);
        setView('days');
    };

    const isDateDisabled = (year: number, month?: number, day?: number) => {
        const today = new Date();
        // Check future dates
        if (year > today.getFullYear()) return true;
        if (year === today.getFullYear()) {
            if (month !== undefined && month > today.getMonth()) return true;
            if (month === today.getMonth() && day !== undefined && day > today.getDate()) return true;
        }

        // Check minDate
        if (!minDate) return false;
        const min = new Date(minDate);
        if (year < min.getFullYear()) return true;
        if (year === min.getFullYear()) {
            if (month === undefined) return false;
            if (month < min.getMonth()) return true;
            if (month === min.getMonth()) {
                if (day === undefined) return false;
                if (day < min.getDate()) return true;
            }
        }
        return false;
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; // Shortened for cleaner look in grid

    const renderHeader = () => {
        const today = new Date();
        const maxYear = today.getFullYear();
        // Determine disabled state for Next Arrow in Month View (Year navigation)
        const isNextYearDisabled = currentYear >= maxYear;


        return (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, height: 40, position: 'relative' }}>
                {/* Left Arrow (Hidden in Year selector to force list selection? Or allow range change? User said lists all years. Let's hide arrows in Year view) */}
                {view !== 'years' && (
                    <IconButton
                        onClick={view === 'days' ? prevMonth : () => setCurrentYear(currentYear - 1)}
                        disabled={Boolean(
                            view === 'days'
                                ? (isDateDisabled(currentYear, currentMonth === 0 ? 11 : currentMonth - 1) && minDate && currentYear <= new Date(minDate).getFullYear())
                                : (minDate && currentYear <= new Date(minDate).getFullYear())
                        )}
                        size="small"
                        sx={{ color: '#888', zIndex: 1, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ChevronLeft size={20} />
                    </IconButton>
                )}

                {/* Title */}
                <Box sx={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography
                        onClick={() => {
                            if (view === 'days') setView('months');
                            else if (view === 'months') setView('years');
                        }}
                        sx={{
                            color: '#fff',
                            fontWeight: 700,
                            cursor: view === 'years' ? 'default' : 'pointer',
                            display: 'inline-block',
                            pointerEvents: view === 'years' ? 'none' : 'auto',
                            '&:hover': { color: view === 'years' ? '#fff' : '#00E5FF' }
                        }}
                    >
                        {view === 'days' && `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`}
                        {view === 'months' && `${currentYear}`}
                        {view === 'years' && 'Select Year'}
                    </Typography>
                </Box>

                {/* Right Arrow */}
                {view !== 'years' && (
                    <IconButton
                        onClick={view === 'days' ? nextMonth : () => setCurrentYear(currentYear + 1)}
                        size="small"
                        disabled={
                            view === 'days'
                                ? (isDateDisabled(currentYear, currentMonth === 11 ? 0 : currentMonth + 1) && currentYear >= maxYear)
                                : isNextYearDisabled
                        }
                        sx={{ color: '#888', ml: 'auto', zIndex: 1, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ChevronRight size={20} />
                    </IconButton>
                )}
            </Box>
        );
    };

    const renderDays = () => {
        const days = daysInMonth(currentMonth, currentYear);
        const firstDay = firstDayOfMonth(currentMonth, currentYear);
        const blanks = Array(firstDay).fill(null);
        const dayArray = Array.from({ length: days }, (_, i) => i + 1);

        return (
            <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1, textAlign: 'center' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <Typography key={i} variant="caption" sx={{ color: '#666', fontWeight: 700 }}>{d}</Typography>
                    ))}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                    {blanks.map((_, i) => <Box key={`blank-${i}`} />)}
                    {dayArray.map((day) => {
                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = value === dateStr;
                        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                        const disabled = isDateDisabled(currentYear, currentMonth, day);

                        return (
                            <Box
                                key={day}
                                onClick={() => !disabled && handleDateClick(day)}
                                sx={{
                                    height: 36,
                                    width: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: disabled ? 'default' : 'pointer',
                                    borderRadius: '50%',
                                    bgcolor: isSelected ? '#00E5FF' : 'transparent',
                                    color: disabled ? '#333' : (isSelected ? '#000' : (isToday ? '#00E5FF' : '#bbb')),
                                    fontWeight: isSelected || isToday ? 700 : 500,
                                    fontSize: '0.9rem',
                                    border: isToday && !isSelected ? '1px solid rgba(0, 229, 255, 0.3)' : 'none',
                                    mx: 'auto', // Centering in grid cell
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: disabled ? undefined : (isSelected ? '#00E5FF' : 'rgba(255,255,255,0.1)'),
                                        color: disabled ? undefined : (isSelected ? '#000' : '#fff'),
                                        transform: disabled ? 'none' : 'scale(1.1)'
                                    }
                                }}
                            >
                                {day}
                            </Box>
                        );
                    })}
                </Box>
            </>
        );
    };

    const renderMonths = () => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {MONTH_NAMES.map((m, i) => {
                const disabled = isDateDisabled(currentYear, i, undefined); // Rough check, allow if any day in month is valid?
                // Actually if year < minYear it's disabled. If year == minYear, months < minMonth disabled.
                return (
                    <Box
                        key={m}
                        onClick={() => !disabled && handleMonthClick(i)}
                        sx={{
                            p: 1.5,
                            textAlign: 'center',
                            borderRadius: 2,
                            cursor: disabled ? 'default' : 'pointer',
                            color: disabled ? '#333' : (i === currentMonth ? '#00E5FF' : '#fff'),
                            fontWeight: i === currentMonth ? 700 : 500,
                            '&:hover': { bgcolor: disabled ? undefined : 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        {m.substring(0, 3)}
                    </Box>
                )
            })}
        </Box>
    );

    const renderYears = () => {
        const years = [];
        const startYear = today.getFullYear() - 50;
        const endYear = today.getFullYear();
        // Or if minDate is set, start from there?
        // Let's safe range.
        const minYear = minDate ? new Date(minDate).getFullYear() : 1990;

        for (let y = endYear; y >= minYear; y--) {
            years.push(y);
        }

        return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxHeight: 240, overflowY: 'auto' }}>
                {years.map(y => (
                    <Box
                        key={y}
                        onClick={() => handleYearClick(y)}
                        sx={{
                            p: 1,
                            textAlign: 'center',
                            borderRadius: 2,
                            cursor: 'pointer',
                            color: y === currentYear ? '#00E5FF' : '#fff',
                            fontWeight: y === currentYear ? 700 : 500,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        {y}
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
            {/* Input Trigger */}
            <Box
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    position: 'relative',
                    border: '1px solid',
                    borderColor: isOpen ? '#00E5FF' : '#333',
                    borderRadius: '4px',
                    p: isOpen ? '15.5px 13px' : '16.5px 14px',
                    borderWidth: isOpen ? 2 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { borderColor: isOpen ? '#00E5FF' : '#fff' }
                }}
            >
                <Box>
                    <Typography variant="caption" sx={{ position: 'absolute', top: -10, left: 10, bgcolor: '#0A0A0A', px: 0.5, color: isOpen ? '#00E5FF' : '#666', fontSize: '0.75rem' }}>
                        {label}
                    </Typography>
                    <Typography sx={{ color: value ? '#fff' : '#666', fontWeight: 500 }}>
                        {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DD/MM/YYYY'}
                    </Typography>
                </Box>
                <Calendar size={20} color={isOpen ? '#00E5FF' : '#666'} />
            </Box>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            minWidth: 320,
                            mt: 1,
                            zIndex: 50,
                            bgcolor: '#111',
                            border: '1px solid #333',
                            borderRadius: 3,
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                            p: 2
                        }}
                    >
                        {renderHeader()}
                        {view === 'days' && renderDays()}
                        {view === 'months' && renderMonths()}
                        {view === 'years' && renderYears()}
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}


# FloatingAdvisor.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ClarityLogo from './ClarityLogo';
import { useUIStore } from '@/lib/ui-store';
import { Send, Bot, MessageSquare, X } from 'lucide-react';
import { marketService } from '@/services/marketService';
import ReactMarkdown from 'react-markdown';

export default function FloatingAdvisor() {
    const router = useRouter();
    const pathname = usePathname();
    const { isQuickChatOpen, openQuickChat, closeQuickChat, initialQuery, addMessage, quickChatMessages, interactionCount, incrementInteraction, resetQuickChat, quickSessionId, setQuickSessionId } = useUIStore();

    const [isGreetingVisible, setIsGreetingVisible] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // Auto-hide greeting after 7 seconds
    useEffect(() => {
        setIsGreetingVisible(true);
        const timer = setTimeout(() => setIsGreetingVisible(false), 7000);
        return () => clearTimeout(timer);
    }, []);

    // Handle Initial Query from Context Menu
    useEffect(() => {
        if (initialQuery && isQuickChatOpen) {
            handleSend(initialQuery);
        }
    }, [initialQuery, isQuickChatOpen]);

    // Hide greeting on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) setIsGreetingVisible(false);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);



    const [chatHeight, setChatHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Calculate new height: simply based on mouse movement relative to bottom
            // Since it's fixed at bottom-10 (approx 40px), we can estimate.
            // Better: Mouse Y position. The lower the mouse, the smaller the window.
            // Height = Window Height - Mouse Y - Bottom Offset (approx 100px for input + margin)
            const newHeight = window.innerHeight - e.clientY - 120;
            if (newHeight > 100 && newHeight < 800) {
                setChatHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Feature: Hide on mobile
    // Feature: Hide on /advisor and /sectors pages
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isAdvisorPage = pathname?.startsWith('/advisor');
    const isSectorsPage = pathname?.startsWith('/sectors');
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    // Allow on auth pages even if deemed "mobile" if desired, but user said "keep quickadvisor on login or signup".
    // We'll keep mobile restriction for now unless asked otherwise.
    // Feature: Hide on /advisor and /sectors pages
    if (isAdvisorPage || isSectorsPage) return null;

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        // Optimistic UI update
        addMessage({ id: Date.now().toString(), role: 'user', content: text });
        setInput('');
        setIsThinking(true);
        incrementInteraction();

        try {
            // HISTORY SAVING LOGIC (Only if NOT on Auth Page)
            let currentSessionId = quickSessionId;

            if (!isAuthPage) {
                // 1. Create session if needed
                if (!currentSessionId) {
                    try {
                        const newSession = await marketService.createSession("Quick Chat", []);
                        currentSessionId = newSession.id;
                        setQuickSessionId(newSession.id);
                    } catch (e) {
                        console.error("Failed to create session", e);
                    }
                }

                // 2. Save User Message
                if (currentSessionId) {
                    await marketService.addMessageToSession(currentSessionId, 'user', text);
                }
            }

            // Call Backend AI with Context
            const context = isAuthPage ? { type: 'auth_help' } : { type: 'floating' };
            const responseData = await marketService.chatWithAI(text, context);
            const responseText = responseData.response;

            addMessage({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                suggest_switch: responseData.suggest_switch
            });

            // 3. Save Assistant Message (Only if NOT on Auth Page)
            if (!isAuthPage && currentSessionId) {
                await marketService.addMessageToSession(currentSessionId, 'assistant', responseText);
            }

            // Redirect logic (Only if NOT on auth page)
            if (interactionCount >= 1 && !isAuthPage) {
                setTimeout(() => {
                    router.push('/advisor'); // User might want to stay in quick chat if history is working?
                    // User complained "quick advisor chat isnt adding into history", so maybe they want it to persist.
                    // The redirect was an earlier requirement "redirect to advisor after 2 interactions".
                    // I will KEEP the redirect for now but maybe increase threshold or remove it if UX is bad.
                    // Effectively, if history is saved, redirecting to /advisor shows the history, which is good.

                    closeQuickChat(); // Just close the UI
                }, 2000); // Slightly longer delay to read
            }
        } catch (error) {
            console.error("Quick Chat Data Error", error);
            addMessage({ id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting to the server. Please check your connection." });
        } finally {
            setIsThinking(false);
        }
    };
    return (
        <>
            {/* Quick Input Bar (Centered Bottom) */}
            <AnimatePresence>
                {isQuickChatOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 100, x: '-50%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-10 left-1/2 md:left-[calc(50%+364px)] -translate-x-1/2 z-50 w-[90%] max-w-[700px] hidden md:flex flex-col gap-3"
                    >
                        {/* Messages Area (appears above input) */}
                        {quickChatMessages.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ maxHeight: chatHeight }}
                                className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-y-auto flex flex-col gap-3 relative"
                            >
                                {/* Resize Handle */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-4 flex justify-center items-center cursor-row-resize opacity-50 hover:opacity-100 z-10"
                                    onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                                >
                                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                                </div>

                                <div className="mt-2"> {/* Spacer for handle */}
                                    {quickChatMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-[#00E5FF] text-black font-medium' : 'bg-white/5 text-gray-200'}`}>
                                                <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:pl-4 [&>ul]:list-disc [&>ul]:mb-2 [&>strong]:text-[#00E5FF] [&>strong]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-3 [&>h2]:mb-1">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex items-center gap-2 text-gray-400 text-sm p-2">
                                            <ClarityLogo size={16} />
                                            <span className="animate-pulse">Thinking...</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* The Input Bar */}
                        <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 pl-4 flex items-center gap-4 shadow-2xl relative">
                            <ClarityLogo size={28} />

                            <input
                                autoFocus
                                className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500 font-medium"
                                placeholder="What can I help you with today?"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />

                            <div className="flex items-center gap-2 bg-[#1A1A1A] p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={closeQuickChat}
                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                    className={`p-2 rounded-lg transition-all ${input.trim() ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]' : 'bg-white/5 text-gray-500'}`}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Greeting Bubble (Helper) */}
            <AnimatePresence>
                {!isQuickChatOpen && isGreetingVisible && (
                    <div className="fixed bottom-6 right-24 z-[9999]">
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            className="bg-[#1A1A1A] border border-white/10 text-white px-4 py-2 rounded-xl shadow-2xl text-sm font-medium relative"
                        >
                            Hi, Clarity Advisor here! 👋
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#1A1A1A] border-r border-t border-white/10 transform rotate-45" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Floating Toggle Button (Always Visible when closed) */}
            <AnimatePresence>
                {
                    !isQuickChatOpen && (
                        <motion.button
                            initial={{ scale: 0, rotate: 180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -180 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openQuickChat()}
                            className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] border border-white/10 p-3 rounded-full shadow-2xl hover:border-[#00E5FF] transition-colors group"
                        >
                            <div className="absolute inset-0 rounded-full bg-[#00E5FF] opacity-0 group-hover:opacity-10 transition-opacity" />
                            <ClarityLogo size={32} />
                        </motion.button>
                    )
                }
            </AnimatePresence >
        </>
    );
}



# ui-store.ts

import { create } from 'zustand';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface UIStore {
    isQuickChatOpen: boolean;
    quickChatMessages: Message[];
    initialQuery: string | null;
    interactionCount: number;
    quickSessionId: string | null; // ID of the backend session for Quick Chat

    isSidebarOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;

    openQuickChat: (query?: string) => void;
    closeQuickChat: () => void;
    addMessage: (msg: Message) => void;
    incrementInteraction: () => void;
    setQuickSessionId: (id: string | null) => void;
    resetQuickChat: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isQuickChatOpen: false,
    quickChatMessages: [],
    initialQuery: null,
    interactionCount: 0,
    quickSessionId: null,
    isSidebarOpen: true, // Default open

    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    openQuickChat: (query) => set({
        isQuickChatOpen: true,
        initialQuery: query || null
    }),
    closeQuickChat: () => set({ isQuickChatOpen: false }),
    addMessage: (msg) => set((state) => ({ quickChatMessages: [...state.quickChatMessages, msg] })),
    incrementInteraction: () => set((state) => ({ interactionCount: state.interactionCount + 1 })),
    setQuickSessionId: (id) => set({ quickSessionId: id }),
    resetQuickChat: () => set({
        isQuickChatOpen: false,
        quickChatMessages: [],
        interactionCount: 0,
        initialQuery: null,
        quickSessionId: null
    })
}));


# api.ts

import axios from 'axios';

// Create Axios instance with base URL
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        // Add auth token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors (e.g., 401 Unauthorized)
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;


# marketService.ts

import api from './api';

export interface StockDetails {
    symbol: string;
    name?: string;
    price: number;
    change: number;
    changePercent: number;
    logo?: string;
    fundamentals?: any;
}

export const marketService = {
    // Get aggregated stock details
    getStockDetails: async (symbol: string) => {
        const response = await api.get(`/stocks/${symbol}`);
        return response.data;
    },

    // Get historical data for chart
    getStockHistory: async (symbol: string, period: string = '1mo') => {
        const response = await api.get(`/stocks/${symbol}/history?period=${period}`);
        return response.data;
    },

    // Search for stocks
    searchStocks: async (query: string) => {
        const response = await api.get(`/stocks/search?q=${query}`);
        return response.data;
    },

    // Get Market Status (Nifty/Sensex)
    getMarketStatus: async () => {
        // Changed to /market/status to avoid conflict
        const response = await api.get('/market/status');
        return response.data;
    },

    // Get Top Top Gainers/Losers
    getTopMovers: async () => {
        const response = await api.get('/market/movers');
        return response.data;
    },

    // Get AI Analysis (The Brain)
    getAIAnalysis: async (symbol: string) => {
        const response = await api.post('/ai/chat', {
            query: `Analyze ${symbol}`,
            context: { type: 'stock_analysis', symbol: symbol }
        });
        return response.data;
    },

    // Get Optimized AI Summary (Faster)
    getAggregatedStockAnalysis: async (symbol: string) => {
        const response = await api.get(`/ai/stock/${symbol}/summary`);
        return response.data;
    },

    // Explain Financial Term
    explainFinancialTerm: async (term: string) => {
        const response = await api.post('/ai/explain', { term });
        return response.data;
    },

    // Generic Chat with AI Advisor
    chatWithAI: async (query: string, context?: any, conversationHistory?: Array<{ role: string; content: string }>) => {
        const response = await api.post('/ai/chat', {
            query,
            conversation_history: conversationHistory,
            context
        });
        // Backend now returns { response: "...", suggest_switch: {...} }
        return response.data;
    },

    // Compare multiple stocks
    compareStocks: async (symbols: string[]) => {
        const response = await api.post('/market/compare', { symbols });
        return response.data;
    },

    // Get comparison history for chart
    getComparisonHistory: async (symbols: string[], period: string = '1y') => {
        // Fetch history for all stocks in parallel
        const historyPromises = symbols.map(symbol =>
            api.get(`/stocks/${symbol}/history?period=${period}`)
                .then(res => ({ symbol, data: res.data }))
                .catch(err => ({ symbol, data: [] }))
        );
        const results = await Promise.all(historyPromises);
        return results;
    },

    // --- Chat History API ---
    getChatSessions: async (type?: 'advisor' | 'discovery_hub') => {
        const response = await api.get('/history/sessions', {
            params: { type }
        });
        return response.data;
    },

    getSessionMessages: async (sessionId: string) => {
        const response = await api.get(`/history/sessions/${sessionId}/messages`);
        return response.data;
    },

    createSession: async (title: string, initialMessages: any[] = [], type: 'advisor' | 'discovery_hub' = 'advisor') => {
        const response = await api.post('/history/sessions', {
            title,
            initial_messages: initialMessages,
            type
        });
        return response.data;
    },

    addMessageToSession: async (sessionId: string, role: string, content: string, metadata?: any) => {
        const response = await api.post(`/history/sessions/${sessionId}/messages`, { role, content, metadata });
        return response.data;
    },

    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/history/sessions/${sessionId}`);
        return response.data;
    },

    togglePinSession: async (sessionId: string, isPinned: boolean) => {
        const response = await api.patch(`/history/sessions/${sessionId}/pin`, { is_pinned: isPinned });
        return response.data;
    },

    generateSessionTitle: async (sessionId: string) => {
        const response = await api.post(`/history/sessions/${sessionId}/title`);
        return response.data;
    },

    // --- Watchlist API ---
    getWatchlist: async () => {
        const response = await api.get('/watchlists/');
        return response.data;
    },

    addToWatchlist: async (ticker: string, details?: { exchange?: string, target_buy_price?: number, target_sell_price?: number, notes?: string }) => {
        const payload = {
            ticker,
            exchange: details?.exchange || 'NSE',
            target_buy_price: details?.target_buy_price,
            target_sell_price: details?.target_sell_price,
            notes: details?.notes
        };
        const response = await api.post('/watchlists/', payload);
        return response.data;
    },

    removeFromWatchlist: async (ticker: string) => {
        const response = await api.delete(`/watchlists/${ticker}`);
        return response.data;
    },

    // --- Portfolio Helper ---
    addToPortfolio: async (portfolioId: string, holding: { ticker: string, shares: number, avg_price: number, exchange?: string }) => {
        // Matches the endpoint expected by portfolio service
        const response = await api.post(`/portfolios/${portfolioId}/holdings`, {
            ticker: holding.ticker,
            shares: holding.shares,
            avg_price: holding.avg_price,
            exchange: holding.exchange || 'NSE'
        });
        return response.data;
    },

    // --- Portfolio Management ---
    getPortfolios: async () => {
        const response = await api.get('/portfolios/');
        return response.data;
    },

    createPortfolio: async (name: string, currency: string = 'INR') => {
        const response = await api.post('/portfolios/', { name, currency });
        return response.data;
    },

    createPortfolioWithHoldings: async (name: string, holdings: Array<{ ticker: string; shares: number; avg_price: number }>) => {
        // First create the portfolio
        const portfolioResponse = await api.post('/portfolios/', { name, currency: 'INR' });
        const portfolio = portfolioResponse.data;

        // Then add all holdings
        const holdingPromises = holdings.map(holding =>
            api.post(`/portfolios/${portfolio.id}/holdings`, {
                ticker: holding.ticker,
                shares: holding.shares,
                avg_price: holding.avg_price,
                exchange: 'NSE'
            })
        );

        await Promise.all(holdingPromises);
        return portfolio;
    },

    backtest: async (ticker: string, date: string, shares?: number, investment_amount?: number, sell_date?: string) => {
        const response = await api.post('/market/backtest', { ticker, date, shares, investment_amount, sell_date });
        return response.data;
    },

    getListingDate: async (ticker: string) => {
        const response = await api.get(`/stocks/listing-date/${ticker}`);
        return response.data.listing_date;
    },

    getPriceAtDate: async (ticker: string, date: string) => {
        const response = await api.get(`/stocks/price/${ticker}/${date}`);
        return response.data.price;
    },

    // Get Sector Performance
    getSectorPerformance: async () => {
        const response = await api.get('/market/sectors');
        return response.data;
    }
};


# portfolioService.ts

import api from './api';

export interface Portfolio {
    id: string;
    name: string;
    currency: string;
    user_id?: string;
}

export interface HoldingCreate {
    ticker: string;
    exchange: string;
    shares: number;
    avg_price: number;
    allocation_percent: number;
}

export interface PortfolioPerformance {
    portfolio_id: string;
    total_value: number;
    total_value_formatted: string;
    total_invested: number;
    total_invested_formatted: string;
    total_gain: number;
    total_gain_formatted: string;
    return_pct: number;
    return_pct_formatted: string;
    holdings: any[];
}

export const portfolioService = {
    // List all portfolios
    listPortfolios: async (): Promise<Portfolio[]> => {
        const response = await api.get('/portfolios/');
        return response.data;
    },

    // Create a new portfolio
    createPortfolio: async (name: string, currency: string = 'INR'): Promise<Portfolio> => {
        const response = await api.post('/portfolios/', { name, currency });
        return response.data;
    },

    // Add a holding to a portfolio
    addHolding: async (portfolioId: string, holding: HoldingCreate) => {
        const response = await api.post(`/portfolios/${portfolioId}/holdings`, holding);
        return response.data;
    },

    // Get real-time performance
    getPortfolioPerformance: async (portfolioId: string): Promise<PortfolioPerformance> => {
        const response = await api.get(`/portfolios/${portfolioId}/performance`);
        return response.data;
    },

    // Delete Portfolio
    deletePortfolio: async (portfolioId: string) => {
        const response = await api.delete(`/portfolios/${portfolioId}`);
        return response.data;
    },

    // --- Holdings ---

    deleteHolding: async (holdingId: string) => {
        const response = await api.delete(`/portfolios/holdings/${holdingId}`); // Note: Path adjusted to match likely router structure or need to check router
        // Wait, in backend I defined it as @router.delete("/holdings/{holding_id}")
        // The router prefix is likely /api/v1/portfolios if it's included in api.py
        // Let me double check api.py or the router registration. 
        // Assuming router is mounted at /portfolios.
        // The backend code was: @router.delete("/holdings/{holding_id}")
        // So the path is /portfolios/holdings/{holding_id}
        const res = await api.delete(`/portfolios/holdings/${holdingId}`);
        return res.data;
    },

    updateHolding: async (holdingId: string, updates: { shares?: number; avg_price?: number }) => {
        const response = await api.put(`/portfolios/holdings/${holdingId}`, updates);
        return response.data;
    },

    // --- Watchlist ---

    getWatchlist: async () => {
        const response = await api.get('/portfolios/watchlists/'); // Mounted under portfolios router?
        // Checking backend code: @router.get("/watchlists/")
        // If portfolio router is at /portfolios, then yes /portfolios/watchlists/
        return response.data;
    },

    addToWatchlist: async (ticker: string, exchange: string = 'NSE') => {
        const response = await api.post('/portfolios/watchlists/', { ticker, exchange });
        return response.data;
    },

    removeFromWatchlist: async (ticker: string) => {
        const response = await api.delete(`/portfolios/watchlists/${ticker}`);
        return response.data;
    }
};


# EmotionCache.tsx

'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';

export default function NextAppDirEmotionCacheProvider(props: any) {
    const { options, children } = props;

    const [{ cache, flush }] = React.useState(() => {
        const cache = createCache(options);
        cache.compat = true;
        const prevInsert = cache.insert;
        let inserted: string[] = [];
        cache.insert = (...args) => {
            const serialized = args[1];
            if (cache.inserted[serialized.name] === undefined) {
                inserted.push(serialized.name);
            }
            return prevInsert(...args);
        };
        const flush = () => {
            const prevInserted = inserted;
            inserted = [];
            return prevInserted;
        };
        return { cache, flush };
    });

    useServerInsertedHTML(() => {
        const names = flush();
        if (names.length === 0) {
            return null;
        }
        let styles = '';
        for (const name of names) {
            styles += cache.inserted[name];
        }
        return (
            <style
                key={cache.key}
                data-emotion={`${cache.key} ${names.join(' ')}`}
                dangerouslySetInnerHTML={{
                    __html: styles,
                }}
            />
        );
    });

    return <CacheProvider value={cache}>{children}</CacheProvider>;
}


# ThemeRegistry.tsx

'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';
import theme from './theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    return (
        <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </NextAppDirEmotionCacheProvider>
    );
}


# theme.ts

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


# chartDataUtils.ts

export const normalizeChartData = (historyResults: any[], stocks: string[]) => {
    if (!historyResults || historyResults.length === 0) return [];

    // Find the common date range
    const allDates = new Set<string>();
    historyResults.forEach(result => {
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach((point: any) => {
                if (point.date) allDates.add(point.date);
            });
        }
    });

    const sortedDates = Array.from(allDates).sort();

    // Create a map of symbol -> date -> price
    const priceMap: Record<string, Record<string, number>> = {};
    historyResults.forEach(result => {
        if (result.data && Array.isArray(result.data)) {
            priceMap[result.symbol] = {};
            result.data.forEach((point: any) => {
                if (point.date && point.close) {
                    priceMap[result.symbol][point.date] = point.close;
                }
            });
        }
    });

    // Get starting prices for normalization
    const startPrices: Record<string, number> = {};
    stocks.forEach(symbol => {
        const firstDate = sortedDates.find(date => priceMap[symbol]?.[date]);
        if (firstDate) {
            startPrices[symbol] = priceMap[symbol][firstDate];
        }
    });

    // Normalize to percentage change from start (100 = start)
    return sortedDates.map(date => {
        const dataPoint: any = { date };
        stocks.forEach((symbol, idx) => {
            const price = priceMap[symbol]?.[date];
            const startPrice = startPrices[symbol];
            if (price && startPrice) {
                // Normalized percentage for chart display
                dataPoint[`stock${idx + 1}`] = Math.round((price / startPrice) * 100 * 100) / 100;
                // Actual price for tooltip
                dataPoint[`price${idx + 1}`] = price;
            }
        });
        return dataPoint;
    }).filter(point => Object.keys(point).length > 1); // Filter out dates with no data
};



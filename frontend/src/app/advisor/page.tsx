'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, CircularProgress, Paper, Avatar } from '@mui/material';
import { Send, Paperclip, Bot, User, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import ClarityLogo from '@/components/ui/ClarityLogo';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

// --- Interfaces ---
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isThinking?: boolean;
}

// --- Mock AI Logic (Temporary until Backend Connection) ---
const simulateAIResponse = async (query: string): Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const lowerQ = query.toLowerCase();
            if (lowerQ.includes('explain')) {
                resolve(`**${query.replace('Explain', '').replace('explain', '').trim()}** is a critical concept in finance.\n\nHere's a breakdown:\n1. **Definition**: It represents the core value driver of the asset.\n2. **Impact**: Higher values typically correspond to bullish market sentiment.\n3. **Example**: If Reliance reports higher EBITDA, it means operational efficiency is improving.\n\n*Would you like to analyze related stocks?*`);
            } else if (lowerQ.includes('reliance')) {
                resolve(`**Reliance Industries (RELIANCE)** is showing strong momentum.\n\n- **Price**: ₹2,985.40 (+1.2%)\n- **Sector**: Energy & Digital Services\n- **Verdict**: **BUY** detailed on strong retail growth.\n\n> "Reliance is effectively a proxy for the Indian growth story." - *Clarity AI*`);
            } else {
                resolve(`I've analyzed your query: "${query}".\n\nBased on current market data, the outlook remains **positive**. Institutional flows are steady, and the Nifty 50 is consolidating near all-time highs.\n\nKey sectors to watch:\n- **Banking** (Undervalued)\n- **IT** (Recovery phase)`);
            }
        }, 1500);
    });
};

const SUGGESTED_PROMPTS = [
    { icon: TrendingUp, text: "Analyze Reliance Industries" },
    { icon: Zap, text: "What moved the Nifty 50 today?" },
    { icon: Sparkles, text: "Explain 'Beta' in investing" },
];

import { useUIStore } from '@/lib/ui-store';

export default function AdvisorPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('query');
    const { quickChatMessages, resetQuickChat } = useUIStore();

    // Start with empty messages to show Welcome Screen unless there's a query OR existing chat history
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasAutoQueried = useRef(false);

    // Hydrate from Quick Chat Store
    useEffect(() => {
        if (quickChatMessages.length > 0) {
            const history: Message[] = quickChatMessages.map(m => ({
                ...m,
                timestamp: new Date() // Approximate timestamp
            }));
            setMessages(history);
            resetQuickChat(); // Clear store effectively transferring state
        }
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Handle initial query from Context Menu
    useEffect(() => {
        if (initialQuery && !hasAutoQueried.current) {
            hasAutoQueried.current = true;
            handleSend(initialQuery);
        }
    }, [initialQuery]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

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
            // Simulate API Call
            const responseText = await simulateAIResponse(text);

            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            console.error("AI Error", error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <Sidebar />
            <Box sx={{
                pl: { xs: 0, md: '100px' }, // Adjusted for sidebar
                height: '100vh',
                bgcolor: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, #051a24 0%, #000 70%)' // Subtle gradient
            }}>
                {/* Header */}
                <Box sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center', // Centered Header
                    gap: 2,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10
                }}>
                    {/* Centered Logo for minimal vibe */}
                </Box>

                {/* Messages Area */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, pt: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <AnimatePresence mode='popLayout'>
                        {messages.length === 0 && (
                            <motion.div
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
        </>
    );
}

function MsgGap(role: string) {
    return role === 'assistant' ? '16px' : '0px';
}

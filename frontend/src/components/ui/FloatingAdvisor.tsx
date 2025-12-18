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


'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ClarityLogo from './ClarityLogo';
import { useUIStore } from '@/lib/ui-store';
import { Send, Bot, MessageSquare, X } from 'lucide-react';

export default function FloatingAdvisor() {
    const router = useRouter();
    const pathname = usePathname();
    const { isQuickChatOpen, openQuickChat, closeQuickChat, initialQuery, addMessage, quickChatMessages, interactionCount, incrementInteraction, resetQuickChat } = useUIStore();

    // Feature: Hide on mobile
    // Feature: Hide on /advisor page
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isAdvisorPage = pathname?.startsWith('/advisor');

    if (isMobile || isAdvisorPage) return null;

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

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        // Check if limit reached
        if (interactionCount >= 1) { // 2nd interaction (0-indexed effectively, or 1 previous + current)
            // Allow this one to send, then redirect? Or redirect immediately?
            // User said "after the second prompt... shift chat to main page"
            // Let's process this one, show a "Moving to main chat..." and redirect.
        }

        addMessage({ id: Date.now().toString(), role: 'user', content: text });
        setInput('');
        setIsThinking(true);
        incrementInteraction();

        // Simulate AI Response
        setTimeout(() => {
            const response = "This is a quick insight from Clarity AI. For deeper analysis, let's move to the full Advisor.";
            addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: response });
            setIsThinking(false);

            // Redirect after 2nd interaction (index 1)
            // We do NOT reset here, so the Advisor Page can pick up the history
            if (interactionCount >= 1) {
                setTimeout(() => {
                    router.push('/advisor');
                    closeQuickChat(); // Just close the UI
                }, 1500);
            }
        }, 1000);
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
                        className="fixed bottom-10 left-1/2 md:left-[calc(50%+40px)] -translate-x-1/2 z-50 w-[90%] max-w-[700px] hidden md:flex flex-col gap-3"
                    >
                        {/* Messages Area (appears above input) */}
                        {quickChatMessages.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-y-auto max-h-[300px] flex flex-col gap-3"
                            >
                                {quickChatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-[#00E5FF] text-black font-medium' : 'bg-white/5 text-gray-200'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="flex items-center gap-2 text-gray-400 text-sm p-2">
                                        <ClarityLogo size={16} />
                                        <span className="animate-pulse">Thinking...</span>
                                    </div>
                                )}
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
                    <div className="fixed bottom-6 right-24 z-40 hidden md:block">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-[#111]/90 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium relative"
                        >
                            Hi, Clarity Advisor here! 👋
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white transform rotate-45" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button (Always Visible when closed) */}
            <AnimatePresence>
                {!isQuickChatOpen && (
                    <motion.button
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openQuickChat()}
                        className="fixed bottom-6 right-6 z-50 bg-black border border-white/20 p-3 rounded-full shadow-2xl hover:border-[#00E5FF] transition-colors group hidden md:block"
                    >
                        <div className="absolute inset-0 rounded-full bg-[#00E5FF] opacity-20 group-hover:animate-ping" />
                        <ClarityLogo size={32} />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}


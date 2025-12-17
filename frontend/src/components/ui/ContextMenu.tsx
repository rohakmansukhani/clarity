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

    const openQuickChat = useUIStore((state) => state.openQuickChat);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const selection = window.getSelection()?.toString().trim();

            // Only show custom menu if text is selected
            if (selection && selection.length > 2) {
                e.preventDefault();
                setSelectedText(selection);
                setPosition({ x: e.clientX, y: e.clientY });
                setVisible(true);
            } else {
                // Allow default browser menu if no text selected (or very short)
                setVisible(false);
            }
        };

        const handleClick = (e: MouseEvent) => {
            // Close menu on any click
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setVisible(false);
            }
        };

        const handleScroll = () => {
            // Close menu on scroll
            if (visible) setVisible(false);
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

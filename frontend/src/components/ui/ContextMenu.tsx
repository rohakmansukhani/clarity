'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/ui-store';

export default function ContextMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const isMenuVisibleRef = useRef(false);
    const lastRightClickTimeRef = useRef(0);

    const openQuickChat = useUIStore((state) => state.openQuickChat);
    const setAdvisorQuery = useUIStore((state) => state.setAdvisorQuery);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const selection = window.getSelection()?.toString().trim();
            const now = Date.now();
            const timeSinceLastClick = now - lastRightClickTimeRef.current;

            // If menu is already visible and user right-clicks again within 2 seconds, allow native menu
            if (isMenuVisibleRef.current && timeSinceLastClick < 2000) {
                setVisible(false);
                isMenuVisibleRef.current = false;
                lastRightClickTimeRef.current = 0;
                return;
            }

            // Show custom menu if text is selected
            if (selection && selection.length > 2) {
                e.preventDefault();
                setSelectedText(selection);
                setPosition({ x: e.clientX, y: e.clientY });
                setVisible(true);
                isMenuVisibleRef.current = true;
                lastRightClickTimeRef.current = now;
            } else {
                setVisible(false);
                isMenuVisibleRef.current = false;
                lastRightClickTimeRef.current = 0;
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setVisible(false);
                isMenuVisibleRef.current = false;
            }
        };

        const handleScroll = () => {
            if (visible) {
                setVisible(false);
                isMenuVisibleRef.current = false;
            }
        };

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

        const query = `Explain "${selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}" and its impact on the market.`;

        // If already on the Advisor page, inject directly into the open chat
        // instead of navigating (which would crash by re-mounting the page)
        if (pathname === '/advisor') {
            setAdvisorQuery(query);
        } else if (window.innerWidth < 768) {
            // Mobile: navigate to Advisor
            router.push(`/advisor?query=${encodeURIComponent(query)}`);
        } else {
            // Desktop: open Quick Chat sidebar
            openQuickChat(query);
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

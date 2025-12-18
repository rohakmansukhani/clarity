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

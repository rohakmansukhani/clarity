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

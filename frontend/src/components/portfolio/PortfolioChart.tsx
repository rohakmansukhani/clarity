"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

interface PortfolioChartProps {
    data: { name: string; value: number; color: string }[];
    totalValue?: number;
}

/**
 * DataTerrain: Interactive Donut Chart
 * Users click legend items to highlight segments. Active segment expands
 * and shows detailed breakdown. Chart animates between states.
 */
export default function PortfolioChart({ data }: PortfolioChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    // Process data into percentages
    const { segments, total } = useMemo(() => {
        const totalVal = data.reduce((sum, item) => sum + item.value, 0);
        const segs = data.map((item) => ({
            label: item.name,
            value: totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0,
            rawValue: item.value,
            color: item.color,
            detail: `₹${item.value.toLocaleString()}`,
            growth: "" // We don't have growth per sector passed yet, leaving empty
        })).sort((a, b) => b.rawValue - a.rawValue);
        return { segments: segs, total: totalVal };
    }, [data]);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
                minHeight: "450px",
                padding: "24px",
                position: "relative",
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                style={{
                    width: "100%",
                    maxWidth: 600,
                    padding: "0px",
                    position: "relative",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#00E5FF", letterSpacing: 3, marginBottom: 6 }}>ALGO ALLOCATION</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: "#FFF", letterSpacing: -0.5 }}>Holdings Distribution</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#888" }}>Total: ₹{total.toLocaleString()}</div>
                </div>

                {/* Donut Chart */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
                    <div style={{ position: "relative", width: 220, height: 220 }}>
                        <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
                            {/* Background Circle */}
                            <circle cx="110" cy="110" r={radius} fill="none" stroke="#222" strokeWidth="8" />

                            {segments.map((seg, i) => {
                                const previousSegments = segments.slice(0, i);
                                const startOffset = previousSegments.reduce((a, b) => a + b.value, 0);
                                const segmentLength = (seg.value / 100) * circumference;
                                const gapLength = circumference - segmentLength;
                                const isActive = activeIndex === i;
                                const isDimmed = activeIndex !== null && activeIndex !== i;

                                return (
                                    <motion.circle
                                        key={i}
                                        cx="110"
                                        cy="110"
                                        r={radius}
                                        fill="none"
                                        stroke={seg.color}
                                        strokeLinecap="round"
                                        strokeDashoffset={-((startOffset / 100) * circumference)}
                                        strokeDasharray={`${segmentLength} ${gapLength}`}
                                        initial={{ strokeWidth: 8, opacity: 0 }}
                                        animate={{
                                            strokeDasharray: `${segmentLength} ${gapLength}`,
                                            strokeWidth: isActive ? 14 : 8,
                                            opacity: isDimmed ? 0.3 : 1,
                                        }}
                                        transition={{
                                            strokeDasharray: { duration: 0.8, ease: "easeInOut" }, // Faster, smoother
                                            strokeWidth: { duration: 0.3 }, // Simple ease instead of spring
                                            opacity: { duration: 0.3 },
                                        }}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Center HUD */}
                        <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            textAlign: "center",
                        }}>
                            <AnimatePresence mode="wait">
                                {activeIndex !== null ? (
                                    <motion.div
                                        key={`active-${activeIndex}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div style={{ fontSize: 11, color: segments[activeIndex].color, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>
                                            {segments[activeIndex].label}
                                        </div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -1 }}>
                                            {segments[activeIndex].value}%
                                        </div>
                                        <div style={{ fontSize: 12, color: "#888", fontWeight: 700 }}>
                                            ₹{segments[activeIndex].rawValue.toLocaleString()}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="default"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div style={{ fontSize: 11, color: "#666", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Portfolio</div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -1 }}>100%</div>
                                        <div style={{ fontSize: 12, color: "#00E5FF", fontWeight: 700 }}>Active</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Interactive Legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {segments.slice(0, 5).map((seg, i) => { // Limit to top 5 for UI cleanliness
                        const isActive = activeIndex === i;
                        const isDimmed = activeIndex !== null && activeIndex !== i;

                        return (
                            <motion.div
                                key={i}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                                animate={{
                                    backgroundColor: isActive ? `${seg.color}15` : "transparent",
                                    opacity: isDimmed ? 0.4 : 1,
                                }}
                                transition={{ duration: 0.3 }}
                                whileHover={{ scale: 1.015 }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "10px 16px",
                                    borderRadius: 14,
                                    userSelect: "none",
                                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                                    transition: "background-color 0.3s ease",
                                    cursor: 'pointer'
                                }}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.3 : 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }}
                                />
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#FFF", flex: 1 }}>{seg.label}</div>
                                <div style={{ fontSize: 14, color: "#888", fontFamily: "monospace", fontWeight: 500 }}>{seg.value}%</div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Active segment detail */}
                <AnimatePresence>
                    {activeIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            style={{ overflow: "hidden" }}
                        >
                            <div style={{
                                padding: "16px 20px",
                                borderRadius: 16,
                                backgroundColor: `${segments[activeIndex].color}10`, // Low opacity
                                border: `1px solid ${segments[activeIndex].color}30`,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: segments[activeIndex].color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                                    {segments[activeIndex].label} Details
                                </div>
                                <div style={{ fontSize: 14, color: "#BBB", fontWeight: 500 }}>
                                    Current Value: {segments[activeIndex].detail}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

import { motion, AnimatePresence } from "framer-motion";
import { useTheme, useMediaQuery } from "@mui/material";
import { useState, useMemo, useEffect } from "react";

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
    const [hasMounted, setHasMounted] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const radius = isMobile ? 60 : 70;
    const circumference = 2 * Math.PI * radius;
    const svgSize = isMobile ? 180 : 220;
    const centerPoint = svgSize / 2;

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
                minHeight: isMobile ? "350px" : "450px",
                padding: isMobile ? "12px" : "24px",
                position: "relative",
            }}
        >
            {!hasMounted ? (
                <div style={{ width: svgSize, height: svgSize, borderRadius: '50%', border: `8px solid ${theme.palette.divider}` }} />
            ) : (
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: isMobile ? 24 : 32, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0 }}>
                        <div>
                            <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: theme.palette.primary.main, letterSpacing: isMobile ? 2 : 3, marginBottom: 4 }}>ALGO ALLOCATION</div>
                            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: theme.palette.text.primary, letterSpacing: -0.5 }}>Holdings Distribution</div>
                        </div>
                        <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 500, color: theme.palette.text.secondary, width: isMobile ? '100%' : 'auto', textAlign: isMobile ? 'left' : 'right' }}>Total: ₹{total.toLocaleString()}</div>
                    </div>

                    {/* Donut Chart */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? 24 : 32 }}>
                        <div style={{ position: "relative", width: svgSize, height: svgSize }}>
                            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ transform: "rotate(-90deg)" }}>
                                {/* Background Circle */}
                                <circle cx={centerPoint} cy={centerPoint} r={radius} fill="none" stroke={theme.palette.divider} strokeWidth="8" />

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
                                            cx={centerPoint}
                                            cy={centerPoint}
                                            r={radius}
                                            fill="none"
                                            stroke={seg.color}
                                            strokeLinecap="round"
                                            strokeDashoffset={-((startOffset / 100) * circumference)}
                                            strokeDasharray={`${segmentLength} ${gapLength}`}
                                            initial={{ strokeWidth: 8, opacity: 0 }}
                                            animate={{
                                                strokeDasharray: `${segmentLength} ${gapLength}`,
                                                strokeWidth: isActive ? (isMobile ? 12 : 14) : 8,
                                                opacity: isDimmed ? 0.3 : 1,
                                            }}
                                            transition={{
                                                strokeDasharray: { duration: 0.8, ease: "easeInOut" },
                                                strokeWidth: { duration: 0.3 },
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
                                width: "100%"
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
                                            <div style={{ fontSize: isMobile ? 9 : 11, color: segments[activeIndex].color, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>
                                                {segments[activeIndex].label}
                                            </div>
                                            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: theme.palette.text.primary, letterSpacing: -1 }}>
                                                {segments[activeIndex].value}%
                                            </div>
                                            <div style={{ fontSize: isMobile ? 10 : 12, color: theme.palette.text.secondary, fontWeight: 700 }}>
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
                                            <div style={{ fontSize: isMobile ? 9 : 11, color: theme.palette.text.secondary, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Portfolio</div>
                                            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: theme.palette.text.primary, letterSpacing: -1 }}>100%</div>
                                            <div style={{ fontSize: isMobile ? 10 : 12, color: theme.palette.primary.main, fontWeight: 700 }}>Active</div>
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
                                        borderBottom: "1px solid",
                                        borderColor: theme.palette.divider,
                                        transition: "background-color 0.3s ease",
                                        cursor: 'pointer'
                                    }}
                                >
                                    <motion.div
                                        animate={{ scale: isActive ? 1.3 : 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }}
                                    />
                                    <div style={{ fontSize: 15, fontWeight: 600, color: theme.palette.text.primary, flex: 1 }}>{seg.label}</div>
                                    <div style={{ fontSize: 14, color: theme.palette.text.secondary, fontFamily: "monospace", fontWeight: 500 }}>{seg.value}%</div>
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
                                    <div style={{ fontSize: 14, color: theme.palette.text.secondary, fontWeight: 500 }}>
                                        Current Value: {segments[activeIndex].detail}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}

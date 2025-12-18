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

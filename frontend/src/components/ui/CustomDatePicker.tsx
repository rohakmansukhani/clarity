'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Dialog, DialogContent, DialogTitle, Button } from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, useMediaQuery } from '@mui/material';

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    minDate?: string;
}

export default function CustomDatePicker({ value, onChange, label = "Select Date", minDate }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Initial Date State
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [view, setView] = useState<'days' | 'months' | 'years'>('days');

    // Close on click outside (desktop only)
    useEffect(() => {
        if (isMobile) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const handleDateClick = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleMonthClick = (monthIndex: number) => {
        setCurrentMonth(monthIndex);
        setView('years');
    };

    const handleYearClick = (year: number) => {
        setCurrentYear(year);
        setView('days');
    };

    const isDateDisabled = (year: number, month?: number, day?: number) => {
        const today = new Date();
        if (year > today.getFullYear()) return true;
        if (year === today.getFullYear()) {
            if (month !== undefined && month > today.getMonth()) return true;
            if (month === today.getMonth() && day !== undefined && day > today.getDate()) return true;
        }
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
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else setCurrentMonth(currentMonth + 1);
    };

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else setCurrentMonth(currentMonth - 1);
    };

    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const renderHeader = () => {
        const maxYear = today.getFullYear();
        const isNextYearDisabled = currentYear >= maxYear;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, height: 40, position: 'relative' }}>
                {view !== 'years' && (
                    <IconButton
                        onClick={view === 'days' ? prevMonth : () => setCurrentYear(currentYear - 1)}
                        disabled={Boolean(
                            view === 'days'
                                ? (isDateDisabled(currentYear, currentMonth === 0 ? 11 : currentMonth - 1) && minDate && currentYear <= new Date(minDate).getFullYear())
                                : (minDate && currentYear <= new Date(minDate).getFullYear())
                        )}
                        size="small"
                        sx={{ color: 'text.secondary', zIndex: 1, '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
                    >
                        <ChevronLeft size={20} />
                    </IconButton>
                )}
                <Box sx={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography
                        onClick={() => {
                            if (view === 'days') setView('months');
                            else if (view === 'months') setView('years');
                        }}
                        sx={{
                            color: 'text.primary', fontWeight: 700,
                            cursor: view === 'years' ? 'default' : 'pointer',
                            display: 'inline-block',
                            pointerEvents: view === 'years' ? 'none' : 'auto',
                            '&:hover': { color: view === 'years' ? 'text.primary' : 'primary.main' }
                        }}
                    >
                        {view === 'days' && `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`}
                        {view === 'months' && `${currentYear}`}
                        {view === 'years' && 'Select Year'}
                    </Typography>
                </Box>
                {view !== 'years' && (
                    <IconButton
                        onClick={view === 'days' ? nextMonth : () => setCurrentYear(currentYear + 1)}
                        size="small"
                        disabled={view === 'days' ? (isDateDisabled(currentYear, currentMonth === 11 ? 0 : currentMonth + 1) && currentYear >= maxYear) : isNextYearDisabled}
                        sx={{ color: 'text.secondary', ml: 'auto', zIndex: 1, '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
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
        const cellSize = isMobile ? 44 : 36;

        return (
            <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1, textAlign: 'center' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <Typography key={i} variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, py: 0.5 }}>{d}</Typography>
                    ))}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 0.5 : 0.5 }}>
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
                                    height: cellSize, width: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: disabled ? 'default' : 'pointer', borderRadius: '50%',
                                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                                    color: disabled ? 'text.disabled' : (isSelected ? 'primary.contrastText' : (isToday ? 'primary.main' : 'text.secondary')),
                                    fontWeight: isSelected || isToday ? 700 : 500,
                                    fontSize: isMobile ? '1rem' : '0.9rem',
                                    border: isToday && !isSelected ? `1px solid ${theme.palette.primary.main}50` : 'none',
                                    mx: 'auto',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        bgcolor: disabled ? undefined : (isSelected ? 'primary.main' : 'action.hover'),
                                        color: disabled ? undefined : (isSelected ? 'primary.contrastText' : 'text.primary'),
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
                const disabled = isDateDisabled(currentYear, i, undefined);
                return (
                    <Box key={m} onClick={() => !disabled && handleMonthClick(i)} sx={{
                        p: isMobile ? 2 : 1.5, textAlign: 'center', borderRadius: 2,
                        cursor: disabled ? 'default' : 'pointer',
                        color: disabled ? 'text.disabled' : (i === currentMonth ? 'primary.main' : 'text.primary'),
                        fontWeight: i === currentMonth ? 700 : 500,
                        fontSize: isMobile ? '1rem' : 'inherit',
                        '&:hover': { bgcolor: disabled ? undefined : 'action.hover' }
                    }}>
                        {m.substring(0, 3)}
                    </Box>
                );
            })}
        </Box>
    );

    const renderYears = () => {
        const minYear = minDate ? new Date(minDate).getFullYear() : 1990;
        const years = [];
        for (let y = today.getFullYear(); y >= minYear; y--) years.push(y);

        return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxHeight: isMobile ? 'none' : 240, overflowY: isMobile ? 'visible' : 'auto' }}>
                {years.map(y => (
                    <Box key={y} onClick={() => handleYearClick(y)} sx={{
                        p: isMobile ? 1.5 : 1, textAlign: 'center', borderRadius: 2, cursor: 'pointer',
                        color: y === currentYear ? 'primary.main' : 'text.primary',
                        fontWeight: y === currentYear ? 700 : 500,
                        fontSize: isMobile ? '1rem' : 'inherit',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}>
                        {y}
                    </Box>
                ))}
            </Box>
        );
    };

    // The calendar content shared between mobile dialog and desktop dropdown
    const calendarContent = (
        <Box sx={{ p: isMobile ? 0 : 2 }}>
            {renderHeader()}
            {view === 'days' && renderDays()}
            {view === 'months' && renderMonths()}
            {view === 'years' && renderYears()}
        </Box>
    );

    return (
        <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
            {/* Input Trigger */}
            <Box
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    position: 'relative', border: '1px solid',
                    borderColor: isOpen ? 'primary.main' : 'divider',
                    borderRadius: '4px',
                    p: isOpen ? '15.5px 13px' : '16.5px 14px',
                    borderWidth: isOpen ? 2 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', bgcolor: 'background.paper',
                    '&:hover': { borderColor: isOpen ? 'primary.main' : 'text.primary' }
                }}
            >
                <Box>
                    <Typography variant="caption" sx={{
                        position: 'absolute', top: -10, left: 10, bgcolor: 'background.paper', px: 0.5,
                        color: isOpen ? 'primary.main' : 'text.secondary', fontSize: '0.75rem', zIndex: 1
                    }}>
                        {label}
                    </Typography>
                    <Typography sx={{ color: value ? 'text.primary' : 'text.secondary', fontWeight: 500 }}>
                        {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DD/MM/YYYY'}
                    </Typography>
                </Box>
                <Calendar size={20} color={isOpen ? theme.palette.primary.main : theme.palette.text.secondary} />
            </Box>

            {/* Mobile: Full-screen Dialog */}
            {isMobile && (
                <Dialog
                    open={isOpen}
                    onClose={() => setIsOpen(false)}
                    fullScreen
                    PaperProps={{
                        sx: {
                            bgcolor: 'background.default',
                            backgroundImage: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                        }
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Select Date</Typography>
                        <IconButton onClick={() => setIsOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
                            <X size={20} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                        {calendarContent}
                    </DialogContent>
                    {value && (
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => setIsOpen(false)}
                                sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'text.secondary' } }}
                            >
                                Confirm — {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </Button>
                        </Box>
                    )}
                </Dialog>
            )}

            {/* Desktop: Floating dropdown */}
            {!isMobile && (
                <AnimatePresence>
                    {isOpen && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            sx={{
                                position: 'absolute', top: '100%', left: 0, right: 0, minWidth: 320,
                                mt: 1, zIndex: 50, bgcolor: 'background.paper',
                                border: '1px solid', borderColor: 'divider', borderRadius: 3,
                                boxShadow: theme.shadows[8], p: 2
                            }}
                        >
                            {calendarContent}
                        </Box>
                    )}
                </AnimatePresence>
            )}
        </Box>
    );
}

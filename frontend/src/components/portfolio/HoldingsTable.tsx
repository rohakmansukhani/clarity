'use client';

import React, { useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Menu, MenuItem, ListItemIcon, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MoreVertical, Trash2, Bell } from 'lucide-react';

interface HoldingsTableProps {
    portfolio: any;
    onDelete?: (holdingId: string) => void;
    onAlert?: (ticker: string, currentPrice: number) => void;
}

export default function HoldingsTable({ portfolio, onDelete, onAlert }: HoldingsTableProps) {
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl({ ...anchorEl, [id]: event.currentTarget });
    };

    const handleMenuClose = (id: string) => {
        setAnchorEl({ ...anchorEl, [id]: null });
    };

    if (!portfolio || !portfolio.holdings) return null;

    return (
        <TableContainer sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ '& th': { borderBottom: '1px solid #222', color: '#666', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em', py: 2 } }}>
                        <TableCell>ASSET</TableCell>
                        <TableCell align="right">LTP</TableCell>
                        <TableCell align="right">DAY CHANGE</TableCell>
                        <TableCell align="right">AVG PRICE</TableCell>
                        <TableCell align="right">INVESTED</TableCell>
                        <TableCell align="right">CURRENT</TableCell>
                        <TableCell align="right">NET P&L</TableCell>
                        <TableCell align="center" sx={{ width: 80 }}>ACTIONS</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {portfolio.holdings.map((stock: any, i: number) => {
                        // Simulated Day Change (Since backend might not send it yet, we calculate or mock)
                        // If backend doesn't send day_change, we mock it for UI demo as requested "make it more comprehensive"
                        // ideally this comes from 'current_price' - 'previous_close'
                        const dayChangePct = stock.day_change_pct || 0;
                        const dayChangeVal = stock.day_change || 0;

                        return (
                            <TableRow
                                key={`${stock.ticker}-${i}`}
                                component={motion.tr}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => router.push(`/market/${stock.ticker}`)}
                                sx={{
                                    cursor: 'pointer',
                                    '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2.5, color: '#ddd', fontSize: '0.95rem' },
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', fontWeight: 700, color: '#666', fontSize: '0.8rem' }}>
                                            {stock.ticker[0]}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>{stock.ticker}</Typography>
                                            <Typography variant="caption" sx={{ color: '#666' }}>{stock.shares} qty</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>₹{stock.current_price.toLocaleString()}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <Typography variant="body2" sx={{ color: dayChangePct >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                            {dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            ₹{Math.abs(dayChangeVal).toFixed(2)}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#888' }}>₹{stock.avg_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#888' }}>₹{stock.invested_value.toLocaleString()}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{stock.current_value.toLocaleString()}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <Typography variant="body2" sx={{ color: stock.gain >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                            {stock.gain >= 0 ? '+' : ''}₹{stock.gain.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: stock.gain >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 600 }}>
                                            {stock.gain_pct.toFixed(2)}%
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Tooltip title="Set Alert">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onAlert) onAlert(stock.ticker, stock.current_price);
                                                }}
                                                sx={{ color: '#444', '&:hover': { color: '#00E5FF' }, mr: 1 }}
                                            >
                                                <Bell size={16} />
                                            </IconButton>
                                        </Tooltip>

                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMenuOpen(e, stock.id || stock.ticker);
                                            }}
                                            sx={{ color: '#444', '&:hover': { color: '#fff' } }}
                                        >
                                            <MoreVertical size={16} />
                                        </IconButton>
                                    </Box>
                                    <Menu
                                        anchorEl={anchorEl[stock.id || stock.ticker]}
                                        open={Boolean(anchorEl[stock.id || stock.ticker])}
                                        onClose={() => handleMenuClose(stock.id || stock.ticker)}
                                        PaperProps={{
                                            sx: {
                                                bgcolor: '#111',
                                                border: '1px solid #333',
                                                minWidth: 140
                                            }
                                        }}
                                    >
                                        <MenuItem
                                            onClick={() => {
                                                handleMenuClose(stock.id || stock.ticker);
                                                if (onDelete && stock.id) onDelete(stock.id);
                                            }}
                                            sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                                        >
                                            <ListItemIcon><Trash2 size={16} color="#EF4444" /></ListItemIcon>
                                            <Typography variant="body2">Delete</Typography>
                                        </MenuItem>
                                    </Menu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

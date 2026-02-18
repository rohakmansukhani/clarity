import React, { useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
import { motion } from 'framer-motion';
import { MoreVertical, Trash2, TrendingDown } from 'lucide-react';

interface HoldingsTableProps {
    portfolio: any;
    onDelete?: (holdingId: string) => void;
    onSell?: (holdingId: string, holding: any) => void;
}

export default function HoldingsTable({ portfolio, onDelete, onSell }: HoldingsTableProps) {
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
                    <TableRow sx={{ '& th': { borderBottom: '1px solid #222', color: '#666', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', py: 2 } }}>
                        <TableCell>ASSET</TableCell>
                        <TableCell align="right">SHARES</TableCell>
                        <TableCell align="right">AVG PRICE</TableCell>
                        <TableCell align="right">LTP</TableCell>
                        <TableCell align="right">INVESTED</TableCell>
                        <TableCell align="right">CURRENT</TableCell>
                        <TableCell align="right">RETURN</TableCell>
                        <TableCell align="center" sx={{ width: 60 }}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {portfolio.holdings.map((stock: any, i: number) => (
                        <TableRow
                            key={`${stock.ticker}-${i}`}
                            component={motion.tr}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            sx={{
                                '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 3, color: '#ddd', fontSize: '1.05rem' },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222', fontWeight: 700, color: '#666' }}>
                                        {stock.ticker[0]}
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{stock.ticker}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#888' }}>{stock.shares}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.avg_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>₹{stock.current_price.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ color: '#666' }}>₹{stock.invested_value.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{stock.current_value.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Typography variant="body1" sx={{ color: stock.gain >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                        {stock.gain >= 0 ? '+' : ''}₹{stock.gain.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: stock.gain >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 600 }}>
                                        {stock.gain_pct.toFixed(2)}%
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, stock.id || stock.ticker)} // Fallback to ticker if id missing
                                    sx={{ color: '#444', '&:hover': { color: '#fff' } }}
                                >
                                    <MoreVertical size={18} />
                                </IconButton>
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
                                            // TODO: Implement Sell logic
                                            if (onSell) onSell(stock.id, stock);
                                        }}
                                        sx={{ color: '#ccc', '&:hover': { bgcolor: '#222', color: '#fff' } }}
                                    >
                                        <ListItemIcon><TrendingDown size={16} color="#F59E0B" /></ListItemIcon>
                                        <Typography variant="body2">Sell</Typography>
                                    </MenuItem>
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
                    ))}
                    {portfolio.holdings.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#666' }}>
                                No holdings in {portfolio.name}. Click "Add Transaction" to start.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

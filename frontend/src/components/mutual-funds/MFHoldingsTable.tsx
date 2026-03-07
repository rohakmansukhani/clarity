import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, useTheme } from '@mui/material';
import { Trash2 } from 'lucide-react';

interface MFHoldingsTableProps {
    holdings: any[];
    onDelete: (id: string) => void;
}

export default function MFHoldingsTable({ holdings, onDelete }: MFHoldingsTableProps) {
    const theme = useTheme();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
    };

    if (!holdings || holdings.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Typography color="text.secondary">No Mutual Fund holdings found. Add your first investment!</Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Scheme Name</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Units</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Avg. NAV</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Invested</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {holdings.map((row) => (
                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell component="th" scope="row">
                                <Typography variant="body2" fontWeight={600}>{row.scheme_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.scheme_code}</Typography>
                            </TableCell>
                            <TableCell align="right">{row.units.toFixed(3)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.avg_nav)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(row.units * row.avg_nav)}</TableCell>
                            <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                                    <Trash2 size={16} />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

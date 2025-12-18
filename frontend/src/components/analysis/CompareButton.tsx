import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Scale } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompareButtonProps {
    stockCount: number;
    isLoading: boolean;
    onClick: () => void;
}

export function CompareButton({ stockCount, isLoading, onClick }: CompareButtonProps) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button
                variant="contained"
                size="large"
                disabled={isLoading}
                onClick={onClick}
                startIcon={isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Scale size={20} />}
                sx={{
                    bgcolor: '#00E5FF',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    px: 5,
                    py: 2,
                    borderRadius: '99px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(0, 229, 255, 0.3)',
                    '&:hover': { bgcolor: '#00D4EE', transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(0, 229, 255, 0.4)' },
                    '&:disabled': { bgcolor: '#333', color: '#666' },
                    transition: 'all 0.3s'
                }}
            >
                {isLoading ? 'Analyzing...' : `Compare ${stockCount} Stocks`}
            </Button>
        </motion.div>
    );
}

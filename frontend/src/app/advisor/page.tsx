import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AdvisorClient from './AdvisorClient';

export default function AdvisorPage() {
    return (
        <Suspense fallback={
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                bgcolor: 'background.default'
            }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
        }>
            <AdvisorClient />
        </Suspense>
    );
}
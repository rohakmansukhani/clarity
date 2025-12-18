import React from 'react';
import { Alert, Button } from '@mui/material';

interface ErrorBannerProps {
    error: string;
    onRetry: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
    return (
        <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    Retry
                </Button>
            }
        >
            {error}
        </Alert>
    );
}

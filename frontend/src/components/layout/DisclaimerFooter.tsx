'use client';

import { Box, Typography, useTheme } from '@mui/material';

export default function DisclaimerFooter() {
    const theme = useTheme();
    return (
        <Box sx={{ mt: 8, mb: 4, px: 2, textAlign: 'center', opacity: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.text.primary, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                DISCLAIMER: THIS APPLICATION IS FOR EDUCATIONAL PURPOSES ONLY.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mt: 0.5, fontSize: '0.75rem' }}>
                Do not consider this as financial advice. All investments involve risk.
            </Typography>
        </Box>
    );
}

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, Avatar, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SwitchAIButton from '@/components/common/SwitchAIButton';
import ClarityLogoPurple from '@/components/ui/ClarityLogoPurple';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggest_switch?: {
        to: 'advisor' | 'discovery_hub';
        reason: string;
        original_query?: string;
    };
}

interface DiscoveryChatProps {
    messages: Message[];
    input: string;
    loading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
    onCreatePortfolio: () => void;
}

export default function DiscoveryChat({
    messages,
    onCreatePortfolio,
    loading
}: DiscoveryChatProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [userInitial, setUserInitial] = React.useState('R'); // Default fallback

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load User Initial from LocalStorage (Matches Dashboard Logic)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const name = parsedUser.user_metadata?.full_name ||
                    parsedUser.user_metadata?.display_name ||
                    parsedUser.full_name ||
                    parsedUser.email;

                if (name) {
                    setUserInitial(name.charAt(0).toUpperCase());
                }
            } catch (e) {
                console.error("Failed to parse user for avatar", e);
            }
        }
    }, []);

    return (
        <Box sx={{
            p: { xs: 3, md: 4 },
            pt: 8,
            maxWidth: 800,
            mx: 'auto',
            width: '100%'
        }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                duration: 0.4,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                        >
                            <Box sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                            }}>
                                <Avatar
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: message.role === 'assistant'
                                            ? 'transparent'
                                            : '#8B5CF6',
                                        fontSize: '1.2rem',
                                        fontWeight: 700,
                                        color: '#000',
                                        flexShrink: 0
                                    }}
                                >
                                    {message.role === 'assistant' ? (
                                        <ClarityLogoPurple size={24} />
                                    ) : (
                                        userInitial
                                    )}
                                </Avatar>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        maxWidth: '75%',
                                        bgcolor: message.role === 'user'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(139, 92, 246, 0.08)',
                                        border: message.role === 'user'
                                            ? '1px solid rgba(255, 255, 255, 0.1)'
                                            : '1px solid rgba(139, 92, 246, 0.2)',
                                        borderRadius: 3,
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            color: '#fff',
                                            fontSize: '0.9375rem',
                                            lineHeight: 1.7,
                                            '& h1, & h2, & h3': {
                                                color: '#A78BFA',
                                                fontWeight: 600,
                                                mt: 2,
                                                mb: 1,
                                                '&:first-of-type': { mt: 0 }
                                            },
                                            '& h2': { fontSize: '1.125rem' },
                                            '& h3': { fontSize: '1rem' },
                                            '& p': {
                                                mb: 1.5,
                                                '&:last-child': { mb: 0 }
                                            },
                                            '& ul, & ol': {
                                                pl: 3,
                                                mb: 1.5,
                                                '& li': {
                                                    mb: 0.5,
                                                    '& ul, & ol': {
                                                        mt: 0.5,
                                                        mb: 0
                                                    }
                                                }
                                            },
                                            '& strong': {
                                                color: '#A78BFA',
                                                fontWeight: 600
                                            },
                                            '& code': {
                                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                px: 0.5,
                                                py: 0.25,
                                                borderRadius: 0.5,
                                                fontSize: '0.875rem'
                                            }
                                        }}
                                    >
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </Box>

                                    <Box sx={{ mt: 2 }}>
                                        {message.suggest_switch && (
                                            <SwitchAIButton
                                                target={message.suggest_switch.to}
                                                originalQuery={message.suggest_switch.original_query || ''}
                                                reason={message.suggest_switch.reason}
                                            />
                                        )}
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mt: 1,
                                            color: 'rgba(255, 255, 255, 0.4)',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Paper>
                            </Box>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Create Portfolio Action - REMOVED: Now only in Advisor */}

                {/* Loading Indicator */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Avatar
                                sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: 'transparent',
                                    flexShrink: 0
                                }}
                            >
                                <ClarityLogoPurple size={24} />
                            </Avatar>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: 'rgba(139, 92, 246, 0.08)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <motion.div
                                        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A78BFA' }}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                    />
                                    <motion.div
                                        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A78BFA' }}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                    />
                                    <motion.div
                                        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A78BFA' }}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ color: '#A78BFA', fontWeight: 600 }}>
                                    Analyzing...
                                </Typography>
                            </Paper>
                        </Box>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </Box>
        </Box >
    );
}

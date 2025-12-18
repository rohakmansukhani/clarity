'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Paper, CircularProgress, Avatar, Grid, Button, Drawer, List, ListItem, ListItemButton, Divider, Menu, MenuItem } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lightbulb, ArrowRight, Sparkles, History, MoreVertical, Pin, Trash2, Plus } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { marketService } from '@/services/marketService';
import { useRouter } from 'next/navigation';
import QuestionnaireFlow, { QuestionnaireData } from '@/components/sectors/QuestionnaireFlow';
import StockQuickCard from '@/components/sectors/StockQuickCard';
import SelectionBar from '@/components/sectors/SelectionBar';
import PortfolioBuilder from '@/components/sectors/PortfolioBuilder';
import SwitchAIButton from '@/components/common/SwitchAIButton';
import ReactMarkdown from 'react-markdown';

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

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

const STARTER_PROMPTS = [
    "Tell me about the aluminium sector in India",
    "Which renewable energy stocks are worth investing in?",
    "I want to invest ₹1L in pharma. Show me opportunities",
    "What's happening in the EV battery sector?",
];

export default function DiscoveryHubPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitial, setIsInitial] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // History Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [isSessionsLoading, setIsSessionsLoading] = useState(false);

    // Initial Load & Query Param Handling
    useEffect(() => {
        // Load sessions
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setIsSessionsLoading(true);
        try {
            const data = await marketService.getChatSessions('discovery_hub');
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setIsSessionsLoading(false);
        }
    };

    const handleCreateNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setRecommendations([]);
        setShowQuestionnaire(false);
        setIsInitial(true);
        setIsSidebarOpen(false);
    };

    const handleLoadSession = async (sessionId: string) => {
        setLoading(true);
        try {
            const msgs = await marketService.getSessionMessages(sessionId);
            const formattedMsgs = msgs.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at)
            }));

            setMessages(formattedMsgs);
            setCurrentSessionId(sessionId);
            setIsInitial(false);
            setIsSidebarOpen(false);
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (confirm("Delete this chat?")) {
            await marketService.deleteSession(sessionId);
            await loadSessions();
            if (currentSessionId === sessionId) {
                handleCreateNewChat();
            }
        }
    };

    // Questionnaire & Stock Selection State
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [userPreferences, setUserPreferences] = useState<QuestionnaireData | null>(null);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [portfolioAllocations, setPortfolioAllocations] = useState<any[]>([]);
    const [currentSectorQuery, setCurrentSectorQuery] = useState('');
    const [showPortfolioButton, setShowPortfolioButton] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const detectStockRecommendations = (response: string): boolean => {
        // Check if response contains stock recommendations
        const indicators = [
            'top picks',
            'recommendations',
            'stocks analyzed',
            'composite score',
            'recommendation is to',
            'current price is'
        ];
        return indicators.some(indicator => response.toLowerCase().includes(indicator));
    };

    const parseStockRecommendations = (response: string): StockRecommendation[] => {
        const stocks: StockRecommendation[] = [];
        const lines = response.split('\n');

        lines.forEach(line => {
            // Look for patterns like "**SYMBOL**: Current price is **₹XXX**"
            const symbolMatch = line.match(/\*\*([A-Z]+)\*\*/);
            const priceMatch = line.match(/₹([0-9,]+)/);
            const scoreMatch = line.match(/composite score of \*\*(\d+)\*\*/);
            const actionMatch = line.match(/recommendation is to \*\*([A-Z]+)\*\*/);

            if (symbolMatch && priceMatch) {
                const symbol = symbolMatch[1];
                const price = parseInt(priceMatch[1].replace(/,/g, ''));
                const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
                const action = (actionMatch ? actionMatch[1] : 'HOLD') as 'BUY' | 'HOLD' | 'SELL';

                stocks.push({
                    symbol,
                    name: symbol, // We'll use symbol as name for now
                    price,
                    score,
                    action,
                    reasoning: line.substring(0, 100) + '...'
                });
            }
        });

        return stocks;
    };

    const handleSend = async (message?: string) => {
        const userMessage = message || input.trim();
        if (!userMessage || loading) return;

        setIsInitial(false);
        setCurrentSectorQuery(userMessage);

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setLoading(true);

        try {
            // 1. Create Session if New
            let activeSessionId = currentSessionId;
            if (!activeSessionId) {
                const newSession = await marketService.createSession(
                    userMessage.slice(0, 30) || "New Research",
                    [],
                    'discovery_hub'
                );
                activeSessionId = newSession.id;
                setCurrentSessionId(newSession.id);
                loadSessions();
            }

            // Prepare conversation history (convert messages to API format)
            const conversationHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Pass Discovery Hub context
            const responseData = await marketService.chatWithAI(
                userMessage,
                { type: 'discovery_hub' },
                conversationHistory
            );

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseData.response,
                suggest_switch: responseData.suggest_switch,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

            // Check if response contains stock recommendations (only if not switching)
            if (!responseData.suggest_switch && detectStockRecommendations(responseData.response)) {
                setShowPortfolioButton(true);
            }

        } catch (error) {
            console.error('AI chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleStartPortfolioFlow = () => {
        setShowPortfolioButton(false);
        setShowQuestionnaire(true);
    };

    const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
        setShowQuestionnaire(false);
        setUserPreferences(data);
        setLoading(true);

        try {
            // Get the last AI response to parse stocks from
            const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
            if (lastAIMessage) {
                const parsedStocks = parseStockRecommendations(lastAIMessage.content);
                setRecommendations(parsedStocks);
            }
        } catch (error) {
            console.error('Failed to parse recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (symbol: string) => {
        if (selectedStocks.includes(symbol)) {
            setSelectedStocks(selectedStocks.filter(s => s !== symbol));
        } else if (selectedStocks.length < 5) {
            setSelectedStocks([...selectedStocks, symbol]);
        }
    };

    const handleToggleExpand = (symbol: string) => {
        setExpandedStock(expandedStock === symbol ? null : symbol);
    };

    const handleBuildPortfolio = () => {
        if (!userPreferences || selectedStocks.length < 2) return;

        const selectedRecs = recommendations.filter(r => selectedStocks.includes(r.symbol));
        const totalScore = selectedRecs.reduce((sum, r) => sum + r.score, 0);

        const allocations = selectedRecs.map(stock => {
            const baseAllocation = (stock.score / totalScore);
            const amount = Math.floor(userPreferences.budget * baseAllocation);
            const shares = Math.floor(amount / stock.price);
            const actualAmount = shares * stock.price;

            return {
                symbol: stock.symbol,
                allocation_percent: Math.round(baseAllocation * 100),
                amount: actualAmount,
                shares,
                price_per_share: stock.price
            };
        });

        setPortfolioAllocations(allocations);
        setShowPortfolio(true);

        setTimeout(() => {
            document.getElementById('portfolio-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleCompare = () => {
        router.push(`/analysis?stocks=${selectedStocks.join(',')}&source=discovery`);
    };

    const handleBacktrack = () => {
        if (selectedStocks.length > 0) {
            router.push(`/backtrack?stock=${selectedStocks[0]}`);
        }
    };

    const handleCreatePortfolio = async () => {
        if (!userPreferences || portfolioAllocations.length === 0) return;

        try {
            const portfolioName = `${currentSectorQuery.substring(0, 30)} Portfolio`;
            const totalInvestment = portfolioAllocations.reduce((sum, a) => sum + a.amount, 0);

            await marketService.createPortfolioWithHoldings(
                portfolioName,
                portfolioAllocations
            );

            alert('Portfolio created successfully!');
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            alert('Failed to create portfolio. Please try again.');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: { md: '140px' }, position: 'relative' }}>

                {/* History Sidebar */}
                <Drawer
                    anchor="left"
                    open={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    PaperProps={{
                        sx: { width: 320, bgcolor: '#0A0A0A', borderRight: '1px solid rgba(139, 92, 246, 0.2)' }
                    }}
                >
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>History</Typography>
                        <Button
                            startIcon={<Plus size={18} />}
                            onClick={handleCreateNewChat}
                            sx={{ color: '#fff', bgcolor: '#9C27B0', '&:hover': { bgcolor: '#7B1FA2' }, textTransform: 'none', px: 2 }}
                        >
                            New Chat
                        </Button>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    <List>
                        {sessions.map((session) => (
                            <ListItem key={session.id} disablePadding>
                                <ListItemButton
                                    selected={currentSessionId === session.id}
                                    onClick={() => handleLoadSession(session.id)}
                                    sx={{
                                        '&.Mui-selected': { bgcolor: 'rgba(139, 92, 246, 0.15)', borderLeft: '3px solid #D500F9' },
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    <Box sx={{ overflow: 'hidden', width: '100%' }}>
                                        <Typography variant="subtitle2" noWrap sx={{ color: '#fff' }}>
                                            {session.title || 'New Research'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {new Date(session.created_at).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ef4444' } }}
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Drawer>

                {/* History Toggle Button */}
                <Box sx={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                    <IconButton
                        onClick={() => setIsSidebarOpen(true)}
                        sx={{
                            bgcolor: 'rgba(139, 92, 246, 0.1)',
                            color: '#D500F9',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' }
                        }}
                    >
                        <History size={20} />
                    </IconButton>
                </Box>

                {/* Content Area */}
                <Box sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Initial State - Centered */}
                    {isInitial && messages.length === 0 && !loading && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexGrow: 1,
                            p: { xs: 3, md: 6 }
                        }}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 4,
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 4,
                                        boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
                                    }}>
                                        <Lightbulb size={40} color="#fff" strokeWidth={2} />
                                    </Box>

                                    <Typography variant="h4" sx={{
                                        fontWeight: 600,
                                        letterSpacing: '-0.03em',
                                        color: '#fff',
                                        mb: 2
                                    }}>
                                        Research any sector
                                    </Typography>

                                    <Typography sx={{
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '1rem',
                                        lineHeight: 1.6,
                                        mb: 5,
                                        fontWeight: 400
                                    }}>
                                        Get AI-powered insights, latest news, and investment opportunities for any sector or commodity
                                    </Typography>

                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 1.5,
                                        mb: 3
                                    }}>
                                        {STARTER_PROMPTS.map((prompt, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: 0.3 + index * 0.08,
                                                    duration: 0.5,
                                                    ease: [0.25, 0.1, 0.25, 1]
                                                }}
                                            >
                                                <Paper
                                                    onClick={() => handleSend(prompt)}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        textAlign: 'left',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(139, 92, 246, 0.08)',
                                                            borderColor: 'rgba(139, 92, 246, 0.3)',
                                                            transform: 'translateY(-2px)',
                                                            '& .arrow': {
                                                                transform: 'translateX(4px)',
                                                                opacity: 1
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{
                                                        color: 'rgba(255, 255, 255, 0.85)',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 400,
                                                        flex: 1,
                                                        lineHeight: 1.5
                                                    }}>
                                                        {prompt}
                                                    </Typography>
                                                    <ArrowRight
                                                        className="arrow"
                                                        size={16}
                                                        color="rgba(139, 92, 246, 0.6)"
                                                        style={{
                                                            transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                                            opacity: 0.5
                                                        }}
                                                    />
                                                </Paper>
                                            </motion.div>
                                        ))}
                                    </Box>
                                </Box>
                            </motion.div>
                        </Box>
                    )}

                    {/* Chat Messages */}
                    {!isInitial && !showQuestionnaire && recommendations.length === 0 && (
                        <Box sx={{
                            p: { xs: 3, md: 4 },
                            pt: 8,
                            maxWidth: 800,
                            mx: 'auto',
                            width: '100%'
                        }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <AnimatePresence>
                                    {messages.map((message, index) => (
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
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        background: message.role === 'assistant'
                                                            ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                        fontSize: '1.2rem',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {message.role === 'assistant' ? (
                                                        <Sparkles size={20} color="#fff" />
                                                    ) : (
                                                        '👤'
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
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: 'block',
                                                            mt: 1,
                                                            color: 'rgba(255, 255, 255, 0.4)',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        {message.timestamp.toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </Paper>
                                            </Box>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Create Portfolio Button */}
                                {showPortfolioButton && !loading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                onClick={handleStartPortfolioFlow}
                                                sx={{
                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                                                    color: '#fff',
                                                    px: 4,
                                                    py: 1.5,
                                                    borderRadius: 3,
                                                    fontWeight: 600,
                                                    fontSize: '1rem',
                                                    textTransform: 'none',
                                                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 12px 40px rgba(139, 92, 246, 0.4)'
                                                    },
                                                    transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
                                                }}
                                            >
                                                💼 Create Portfolio from These Stocks
                                            </Button>
                                        </Box>
                                    </motion.div>
                                )}

                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                            <Avatar
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                                                }}
                                            >
                                                <CircularProgress size={20} sx={{ color: '#fff' }} />
                                            </Avatar>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    bgcolor: 'rgba(139, 92, 246, 0.08)',
                                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                                    borderRadius: 3,
                                                    backdropFilter: 'blur(10px)'
                                                }}
                                            >
                                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9375rem' }}>
                                                    Researching and analyzing...
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </Box>
                        </Box>
                    )}

                    {/* Questionnaire Flow */}
                    {showQuestionnaire && (
                        <Box sx={{ p: { xs: 3, md: 6 }, maxWidth: 800, mx: 'auto', width: '100%' }}>
                            <QuestionnaireFlow sector="Discovery" onComplete={handleQuestionnaireComplete} />
                        </Box>
                    )}

                    {/* Stock Recommendations */}
                    {recommendations.length > 0 && !showPortfolio && (
                        <Box sx={{ p: { xs: 3, md: 6 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
                            <Typography variant="h5" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>
                                Select 2-5 stocks for your portfolio
                            </Typography>
                            <Grid container spacing={3}>
                                {recommendations.map((stock, index) => (
                                    <Grid key={stock.symbol} size={{ xs: 12, md: 6 }}>
                                        <StockQuickCard
                                            stock={stock}
                                            index={index}
                                            isSelected={selectedStocks.includes(stock.symbol)}
                                            isExpanded={expandedStock === stock.symbol}
                                            onToggleSelect={() => handleToggleSelect(stock.symbol)}
                                            onToggleExpand={() => handleToggleExpand(stock.symbol)}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Portfolio Builder */}
                    {showPortfolio && userPreferences && (
                        <Box id="portfolio-section" sx={{ p: { xs: 3, md: 6 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
                            <PortfolioBuilder
                                allocations={portfolioAllocations}
                                totalBudget={userPreferences.budget}
                                riskLevel="Moderate"
                                estimatedReturn={12}
                            />
                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setShowPortfolio(false)}
                                    sx={{
                                        borderColor: '#666',
                                        color: '#666',
                                        '&:hover': { borderColor: '#fff', color: '#fff' }
                                    }}
                                >
                                    Modify Selection
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleCreatePortfolio}
                                    sx={{
                                        bgcolor: '#8B5CF6',
                                        '&:hover': { bgcolor: '#7C3AED' }
                                    }}
                                >
                                    Create Portfolio
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Selection Bar */}
                {selectedStocks.length > 0 && !showPortfolio && (
                    <SelectionBar
                        selectedStocks={selectedStocks}
                        onRemove={(symbol) => setSelectedStocks(selectedStocks.filter(s => s !== symbol))}
                        onContinue={handleBuildPortfolio}
                        onCompare={handleCompare}
                        onBacktrack={handleBacktrack}
                    />
                )}

                {/* Input Area */}
                {!showQuestionnaire && recommendations.length === 0 && (
                    <Box sx={{
                        p: { xs: 3, md: 4 },
                        backdropFilter: 'blur(20px)',
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                            <Paper sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                '&:focus-within': {
                                    borderColor: 'rgba(139, 92, 246, 0.5)',
                                    bgcolor: 'rgba(255, 255, 255, 0.06)',
                                    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)'
                                }
                            }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={6}
                                    placeholder="Ask about any sector, commodity, or industry..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    variant="standard"
                                    InputProps={{
                                        disableUnderline: true,
                                        sx: {
                                            color: 'rgba(255, 255, 255, 0.92)',
                                            fontSize: '0.9375rem',
                                            fontWeight: 400,
                                            letterSpacing: '-0.01em',
                                            px: 1.5,
                                            py: 0.5,
                                            '&::placeholder': {
                                                color: 'rgba(255, 255, 255, 0.35)',
                                                opacity: 1
                                            }
                                        }
                                    }}
                                />
                                <IconButton
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || loading}
                                    sx={{
                                        ml: 1,
                                        width: 36,
                                        height: 36,
                                        background: input.trim() && !loading
                                            ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                                            : 'rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                        '&:hover': {
                                            background: input.trim() && !loading
                                                ? 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)'
                                                : 'rgba(255, 255, 255, 0.08)',
                                            transform: input.trim() && !loading ? 'scale(1.05)' : 'none'
                                        },
                                        '&:disabled': {
                                            background: 'rgba(255, 255, 255, 0.04)'
                                        }
                                    }}
                                >
                                    <Send size={16} color={input.trim() && !loading ? '#fff' : 'rgba(255, 255, 255, 0.3)'} />
                                </IconButton>
                            </Paper>
                            <Typography variant="caption" sx={{
                                color: 'rgba(255, 255, 255, 0.25)',
                                mt: 1.5,
                                display: 'block',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 400
                            }}>
                                Press Enter to send • Shift+Enter for new line
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

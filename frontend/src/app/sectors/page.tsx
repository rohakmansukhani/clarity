'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, CircularProgress, Button, TextField, Paper, Grid } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lightbulb, ArrowRight, History, FolderPlus, Scale, ChevronRight, Check } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { marketService } from '@/services/marketService';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/ui-store';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';
import QuestionnaireFlow, { QuestionnaireData } from '@/components/sectors/QuestionnaireFlow';
import StockQuickCard from '@/components/sectors/StockQuickCard';
import SelectionBar from '@/components/sectors/SelectionBar';
import PortfolioBuilder from '@/components/sectors/PortfolioBuilder';
import DiscoveryHistory from '@/components/sectors/DiscoveryHistory';
import DiscoveryChat from '@/components/sectors/DiscoveryChat';
import ConfirmDialog from '@/components/common/ConfirmDialog';


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

type ViewMode = 'chat' | 'questionnaire' | 'recommendations' | 'builder';

export default function DiscoveryHubPage() {
    const router = useRouter();
    const { isSidebarOpen, closeSidebar } = useUIStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitial, setIsInitial] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);

    // Flow State
    const [viewMode, setViewMode] = useState<ViewMode>('chat');

    // Data State
    const [userPreferences, setUserPreferences] = useState<QuestionnaireData | null>(null);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [portfolioAllocations, setPortfolioAllocations] = useState<any[]>([]); // For builder
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const toggleHistory = () => {
        if (!isHistoryOpen) {
            closeSidebar();
        }
        setIsHistoryOpen(!isHistoryOpen);
    };

    const closeHistory = () => setIsHistoryOpen(false);

    const loadSessions = async () => {
        try {
            const data = await marketService.getChatSessions('discovery_hub');
            setSessions(data);
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        if (isSidebarOpen && isHistoryOpen) {
            setIsHistoryOpen(false);
        }
    }, [isSidebarOpen, isHistoryOpen]);

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setIsInitial(true);
        setIsHistoryOpen(false);
        setViewMode('chat');
        setRecommendations([]);
        setSelectedStocks([]);
        setUserPreferences(null);
    };

    const handlePinSession = async (sessionId: string, currentPinStatus: boolean) => {
        try {
            await marketService.togglePinSession(sessionId, !currentPinStatus);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_pinned: !currentPinStatus } : s).sort((a, b) => {
                if (a.is_pinned === b.is_pinned) return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                return (a.is_pinned ? -1 : 1);
            }));
            loadSessions();
        } catch (e) {
            console.error("Pin failed", e);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        setSessionToDelete(sessionId);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;
        try {
            await marketService.deleteSession(sessionToDelete);
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
            if (currentSessionId === sessionToDelete) {
                handleNewChat();
            }
        } catch (e) {
            console.error("Delete failed", e);
        } finally {
            setDeleteConfirmOpen(false);
            setSessionToDelete(null);
        }
    };

    const handleSessionClick = async (sessionId: string) => {
        try {
            setLoading(true);
            setCurrentSessionId(sessionId);
            setIsHistoryOpen(false);
            setMessages([]);

            const msgs = await marketService.getSessionMessages(sessionId);
            const formattedMsgs: Message[] = msgs.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
                suggest_switch: m.metadata?.suggest_switch
            }));
            setMessages(formattedMsgs);
            setIsInitial(false);
            setViewMode('chat');
            setRecommendations([]);
            setSelectedStocks([]);
            setUserPreferences(null);
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setLoading(false);
        }
    };

    // Context State
    const [portfolioContext, setPortfolioContext] = useState<any>(null);

    useEffect(() => {
        const fetchContext = async () => {
            try {
                const portfolios = await marketService.getPortfolios();
                if (portfolios && portfolios.length > 0) {
                    // Simplified context logic
                    setPortfolioContext({
                        type: 'discovery_hub',
                        portfolio_summary: {
                            total_portfolios: portfolios.length
                        }
                    });
                } else {
                    setPortfolioContext({ type: 'discovery_hub' });
                }
            } catch (error) {
                console.error("Failed to fetch portfolio context:", error);
                setPortfolioContext({ type: 'discovery_hub' });
            }
        };
        fetchContext();
    }, []);

    const handleSend = async (message?: string) => {
        const userMessage = message || input.trim();
        if (!userMessage || loading) return;

        setIsInitial(false);
        const tempId = Date.now().toString();
        const newUserMessage: Message = {
            id: tempId,
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setLoading(true);

        try {
            let sessionId = currentSessionId;
            if (!sessionId) {
                const newSession = await marketService.createSession(userMessage, [], 'discovery_hub');
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
                loadSessions();
            }

            const conversationHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            const contextToSend = portfolioContext || { type: 'discovery_hub' };

            const response = await marketService.chatWithAI(userMessage, contextToSend, conversationHistory);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
                suggest_switch: response.suggest_switch
            };

            setMessages(prev => [...prev, aiMessage]);

            if (sessionId) {
                await marketService.addMessageToSession(sessionId, 'user', newUserMessage.content);
                const metadata = response.suggest_switch ? { suggest_switch: response.suggest_switch } : undefined;
                await marketService.addMessageToSession(sessionId, 'assistant', aiMessage.content, metadata);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
        console.log("Questionnaire data:", data);
        setUserPreferences(data);
        setViewMode('recommendations');

        // MOCK: Fetch recommendations based on preferences
        // In reality, this would be an API call
        setLoading(true);
        setTimeout(() => {
            const mockRecommendations: StockRecommendation[] = [
                { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3450.20, change: 1.25, score: 88, action: 'BUY', reasoning: 'Strong order book and market leadership position in IT sector.' },
                { symbol: 'INFY', name: 'Infosys Ltd', price: 1450.80, change: -0.45, score: 82, action: 'BUY', reasoning: 'Attractive valuation after recent correction with solid fundamentals.' },
                { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1240.50, change: 2.10, score: 79, action: 'BUY', reasoning: 'Best-in-class dividend yield and strong digital growth.' },
                { symbol: 'WIPRO', name: 'Wipro Limited', price: 445.30, change: 0.15, score: 72, action: 'HOLD', reasoning: 'Turnaround in progress, wait for stable margin improvement.' },
                { symbol: 'TECHM', name: 'Tech Mahindra', price: 1120.90, change: -1.20, score: 68, action: 'HOLD', reasoning: 'Telecom vertical weakness persists, watch for 5G recovery.' },
                { symbol: 'LTIM', name: 'LTIMindtree', price: 5234.00, change: 1.80, score: 75, action: 'BUY', reasoning: 'Synergy benefits kicking in, strong growth potential in BFSI.' },
                { symbol: 'KPITTECH', name: 'KPIT Technologies', price: 1560.40, change: 3.45, score: 91, action: 'BUY', reasoning: 'Pure-play auto ER&D leader with massive growth runway.' },
            ];
            setRecommendations(mockRecommendations);
            setLoading(false);
        }, 1500);
    };

    const toggleStockSelection = (symbol: string) => {
        setSelectedStocks(prev => {
            if (prev.includes(symbol)) {
                return prev.filter(s => s !== symbol);
            } else {
                if (prev.length >= 5) return prev; // Max 5
                return [...prev, symbol];
            }
        });
    };

    const handleCompareStocks = () => {
        router.push(`/analysis?stocks=${selectedStocks.join(',')}`);
    };

    const handleProceedToBuilder = () => {
        // Calculate allocations (Simple logic mostly equal weight for now)
        if (!userPreferences) return;

        const count = selectedStocks.length;
        const budget = userPreferences.budget;

        // MOCK Allocation Logic
        const newAllocations = selectedStocks.map(symbol => {
            const stock = recommendations.find(r => r.symbol === symbol);
            const price = stock?.price || 100;
            const weight = 1 / count; // Equal weight for now
            const amount = budget * weight;
            return {
                symbol,
                allocation_percent: Math.round(weight * 100),
                amount: Math.round(amount),
                shares: Math.floor(amount / price),
                price_per_share: price
            };
        });

        setPortfolioAllocations(newAllocations);
        setViewMode('builder');
    };

    const handleCreatePortfolio = async (name: string) => {
        try {
            const portfolio = await marketService.createPortfolio(name);
            setIsCreateModalOpen(false);

            // In a real app, we would save the allocations here
            // For now, redirect to portfolio page or show success

            router.push('/portfolio'); // Or wherever the user wants

        } catch (e) {
            console.error("Create failed", e);
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#000' }}>
            <Sidebar />

            <Box sx={{
                flexGrow: 1,
                height: '100vh',
                bgcolor: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, #000 70%)'
            }}>
                {/* Header */}
                <Box sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    pl: { xs: '80px', md: '120px' }
                }}>
                    <IconButton
                        onClick={toggleHistory}
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            color: '#fff',
                            bgcolor: isHistoryOpen ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: isHistoryOpen ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                transform: 'scale(1.05)'
                            }
                        }}
                    >
                        <History size={20} />
                    </IconButton>

                    {/* Breadcrumbs / View Indicator */}
                    {(viewMode !== 'chat' || !isInitial) && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button
                                onClick={() => setViewMode('chat')}
                                sx={{ color: viewMode === 'chat' ? '#fff' : '#666', textTransform: 'none' }}
                            >
                                Discovery
                            </Button>
                            {viewMode !== 'chat' && <ChevronRight size={16} color="#666" />}
                            {viewMode !== 'chat' && (
                                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                                    {viewMode === 'questionnaire' ? 'Preferences' :
                                        viewMode === 'recommendations' ? 'Selection' : 'Builder'}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>

                {/* History Panel */}
                <DiscoveryHistory
                    isOpen={isHistoryOpen}
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onClose={closeHistory}
                    onSessionClick={handleSessionClick}
                    onNewChat={handleNewChat}
                    onPinSession={handlePinSession}
                    onDeleteSession={handleDeleteSession}
                />

                {/* Content Area - Scrollable */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    pt: 10, // Space for header
                    pb: viewMode === 'chat' ? 0 : 4,
                    display: 'flex',
                    flexDirection: 'column'
                }}>

                    {/* VIEW: CHAT & INITIAL */}
                    {viewMode === 'chat' && (
                        <>
                            {isInitial && messages.length === 0 ? (
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
                                        transition={{ duration: 0.6 }}
                                    >
                                        <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
                                            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, background: 'linear-gradient(135deg, #fff 0%, #A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                Research any sector
                                            </Typography>
                                            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4 }}>
                                                AI-powered insights, latest news, and investment opportunities.
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                                {STARTER_PROMPTS.map((prompt, idx) => (
                                                    <Button
                                                        key={idx}
                                                        fullWidth
                                                        onClick={() => handleSend(prompt)}
                                                        sx={{
                                                            textAlign: 'left',
                                                            p: 2,
                                                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            color: 'rgba(255, 255, 255, 0.7)',
                                                            textTransform: 'none',
                                                            '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)', borderColor: '#8B5CF6' }
                                                        }}
                                                    >
                                                        {prompt}
                                                    </Button>
                                                ))}
                                            </Box>
                                        </Box>
                                    </motion.div>
                                </Box>
                            ) : (
                                <DiscoveryChat
                                    messages={messages}
                                    input={input}
                                    loading={loading}
                                    onInputChange={setInput}
                                    onSend={handleSend}
                                    onKeyPress={handleKeyPress}
                                    onCreatePortfolio={() => setViewMode('questionnaire')}
                                />
                            )}
                        </>
                    )}

                    {/* VIEW: QUESTIONNAIRE */}
                    {viewMode === 'questionnaire' && (
                        <Box sx={{ p: { xs: 3, md: 6 }, maxWidth: 800, mx: 'auto', width: '100%' }}>
                            <Button startIcon={<ArrowRight className="rotate-180" />} onClick={() => setViewMode('chat')} sx={{ mb: 2, color: '#666' }}>
                                Back to Chat
                            </Button>
                            <QuestionnaireFlow
                                sector={input || "General"} // Or pass last sector topic
                                onComplete={handleQuestionnaireComplete}
                            />
                        </Box>
                    )}

                    {/* VIEW: RECOMMENDATIONS */}
                    {viewMode === 'recommendations' && (
                        <Box sx={{ p: { xs: 2, md: 6 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                                    Top Picks for You
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#888' }}>
                                    Based on your preferences: {userPreferences?.riskProfile} Risk • {userPreferences?.horizon} Horizon
                                </Typography>
                            </Box>

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                                    <CircularProgress sx={{ color: '#00E5FF' }} />
                                </Box>
                            ) : (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                                    {recommendations.map((stock, index) => (
                                        <Box key={stock.symbol}>
                                            <StockQuickCard
                                                stock={stock}
                                                index={index}
                                                isSelected={selectedStocks.includes(stock.symbol)}
                                                isExpanded={expandedStock === stock.symbol}
                                                onToggleExpand={() => setExpandedStock((prev) => prev === stock.symbol ? null : stock.symbol)}
                                                onToggleSelect={() => toggleStockSelection(stock.symbol)}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            {/* Sticky Selection Bar */}
                            <SelectionBar
                                selectedStocks={selectedStocks}
                                onRemove={(symbol) => toggleStockSelection(symbol)}
                                onCompare={handleCompareStocks}
                                onContinue={handleProceedToBuilder}
                                onBacktrack={() => setViewMode('questionnaire')}
                            />
                        </Box>
                    )}

                    {/* VIEW: BUILDER */}
                    {viewMode === 'builder' && userPreferences && (
                        <Box sx={{ p: { xs: 2, md: 6 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
                            <Button startIcon={<ArrowRight className="rotate-180" />} onClick={() => setViewMode('recommendations')} sx={{ mb: 2, color: '#666' }}>
                                Back to Selection
                            </Button>
                            <PortfolioBuilder
                                allocations={portfolioAllocations}
                                totalBudget={userPreferences.budget || 0}
                                riskLevel={userPreferences.riskProfile || 'Moderate'}
                                estimatedReturn={14.2} // Mock return
                            />

                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, pb: 10 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setViewMode('recommendations')}
                                    sx={{ borderColor: '#333', color: '#fff', px: 4, py: 1.5, borderRadius: 3 }}
                                >
                                    Modify Selection
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    startIcon={<Check />}
                                    sx={{
                                        bgcolor: '#10B981',
                                        color: '#000',
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        '&:hover': { bgcolor: '#059669' }
                                    }}
                                >
                                    Create Portfolio
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Fixed Input Area - Outside Scrollable Content */}
                {viewMode === 'chat' && (
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
                            }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={6}
                                    placeholder="Ask about any sector..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={loading}
                                    variant="standard"
                                    InputProps={{ disableUnderline: true, sx: { color: '#fff' } }}
                                />
                                <IconButton
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || loading}
                                    sx={{ ml: 1, bgcolor: input.trim() ? '#8B5CF6' : 'transparent' }}
                                >
                                    <Send size={16} color={input.trim() ? '#fff' : '#666'} />
                                </IconButton>
                            </Paper>
                        </Box>
                    </Box>
                )}
            </Box>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Chat"
                message="Are you sure you want to delete this chat? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={confirmDeleteSession}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setSessionToDelete(null);
                }}
            />

            <CreatePortfolioModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePortfolio}
            />
        </Box>
    );
}

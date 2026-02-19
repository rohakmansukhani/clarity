'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { marketService } from '@/services/marketService';
import QuestionnaireFlow, { QuestionnaireData } from '@/components/sectors/QuestionnaireFlow';
import StockQuickCard from '@/components/sectors/StockQuickCard';
import SelectionBar from '@/components/sectors/SelectionBar';
import PortfolioBuilder from '@/components/sectors/PortfolioBuilder';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeContext';

interface StockRecommendation {
    symbol: string;
    name: string;
    price: number;
    change?: number;
    score: number;
    action: 'BUY' | 'HOLD' | 'SELL';
    reasoning: string;
}

export default function SectorDetailPage({ params }: { params: { sector: string } }) {
    const router = useRouter();
    const theme = useTheme();
    const { mode } = useColorMode();
    const sector = decodeURIComponent(params.sector);
    const [showQuestionnaire, setShowQuestionnaire] = useState(true);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [userPreferences, setUserPreferences] = useState<QuestionnaireData | null>(null);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [showPortfolio, setShowPortfolio] = useState(false);
    const [portfolioAllocations, setPortfolioAllocations] = useState<any[]>([]);

    const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
        setShowQuestionnaire(false);
        setLoading(true);
        setUserPreferences(data);

        try {
            const horizonMap = {
                'short': 'short-term (less than 1 year)',
                'medium': 'medium-term (1-3 years)',
                'long': 'long-term (3+ years)'
            };

            const riskMap = {
                'conservative': 'conservative (low risk, stable returns)',
                'balanced': 'balanced (moderate risk, growth with stability)',
                'aggressive': 'aggressive (high risk, maximum growth potential)'
            };

            const preferencesText = data.sectorPreferences.length > 0
                ? ` Focus on: ${data.sectorPreferences.join(', ')}.`
                : '';

            const query = `
                Recommend top 7 stocks from ${sector} sector for:
                - Budget: ₹${data.budget.toLocaleString()}
                - Horizon: ${horizonMap[data.horizon!]}
                - Risk: ${riskMap[data.riskProfile!]}
                ${preferencesText}
                
                For each stock provide: symbol, company name, current price, score (0-100), action (BUY/HOLD/SELL), and reasoning.
            `;

            const aiResponseData = await marketService.chatWithAI(query, { type: 'discovery_hub' });

            // Parse AI response into structured data
            const parsedStocks = parseAIResponse(aiResponseData.response);
            setRecommendations(parsedStocks);

        } catch (error) {
            console.error('Failed to get recommendations:', error);
            // Fallback mock data
            setRecommendations(getMockRecommendations(sector));
        } finally {
            setLoading(false);
        }
    };

    const parseAIResponse = (response: string): StockRecommendation[] => {
        // Simple parsing - in production, use structured AI output
        const mockStocks: StockRecommendation[] = [
            { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3281, change: 1.2, score: 85, action: 'BUY', reasoning: 'Strong fundamentals, consistent growth, low debt. Leader in digital transformation services.' },
            { symbol: 'INFY', name: 'Infosys Limited', price: 1456, change: 0.8, score: 78, action: 'BUY', reasoning: 'Good valuation, stable revenue streams, strong management team.' },
            { symbol: 'WIPRO', name: 'Wipro Limited', price: 445, change: -0.3, score: 72, action: 'HOLD', reasoning: 'Moderate growth potential, fair valuation. Turnaround story in progress.' },
            { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1234, change: 1.5, score: 76, action: 'BUY', reasoning: 'Undervalued compared to peers, strong order book, good dividend yield.' },
            { symbol: 'TECHM', name: 'Tech Mahindra', price: 1089, change: 0.2, score: 68, action: 'HOLD', reasoning: 'Wait for confirmation of turnaround. 5G opportunities ahead.' },
            { symbol: 'LTIM', name: 'LTIMindtree', price: 5234, change: 2.1, score: 74, action: 'BUY', reasoning: 'Post-merger synergies kicking in. Strong growth trajectory.' },
            { symbol: 'PERSISTENT', name: 'Persistent Systems', price: 4567, change: 1.8, score: 71, action: 'BUY', reasoning: 'Niche player with strong client relationships. Good growth potential.' }
        ];

        return mockStocks;
    };

    const getMockRecommendations = (sectorName: string): StockRecommendation[] => {
        // Fallback mock data
        return parseAIResponse('');
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

        // Calculate optimal allocations
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

        // Scroll to portfolio
        setTimeout(() => {
            document.getElementById('portfolio-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleCompare = () => {
        router.push(`/analysis?stocks=${selectedStocks.join(',')}&source=sector`);
    };

    const handleBacktrack = () => {
        // Navigate to backtrack with first selected stock
        if (selectedStocks.length > 0) {
            router.push(`/backtrack?stock=${selectedStocks[0]}`);
        }
    };

    const handleRestart = () => {
        setShowQuestionnaire(true);
        setRecommendations([]);
        setSelectedStocks([]);
        setShowPortfolio(false);
        setUserPreferences(null);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Sidebar />

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 6 }, ml: { md: '140px' }, pb: 12 }}>
                {/* Header */}
                <Box sx={{ mb: 6 }}>
                    <Button
                        startIcon={<ArrowLeft size={20} />}
                        onClick={() => router.push('/sectors')}
                        sx={{
                            color: 'text.secondary',
                            mb: 3,
                            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' }
                        }}
                    >
                        Back to Sectors
                    </Button>

                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1, color: 'text.primary' }}>
                        {sector} Sector Analysis
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
                        AI-powered stock recommendations tailored to your investment goals
                    </Typography>
                </Box>

                {/* Questionnaire */}
                {showQuestionnaire && (
                    <QuestionnaireFlow
                        sector={sector}
                        onComplete={handleQuestionnaireComplete}
                    />
                )}

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 20 }}>
                        <CircularProgress sx={{ color: 'primary.main', mb: 3 }} size={48} />
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ color: 'text.primary', mb: 1, fontWeight: 600 }}>
                                Analyzing {sector} Sector...
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3 }}>
                                {['Fetching market data...', 'Running AI analysis...', 'Calculating scores...', 'Optimizing recommendations...'].map((text, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.5 }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                            <Sparkles size={14} color={theme.palette.primary.main} />
                                            {text}
                                        </Typography>
                                    </motion.div>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Recommendations */}
                {!showQuestionnaire && !loading && recommendations.length > 0 && !showPortfolio && (
                    <Box>
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                                Top {recommendations.length} Recommendations
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Select 2-5 stocks to build your portfolio or compare
                            </Typography>
                        </Box>

                        <Grid container spacing={3}>
                            {recommendations.map((stock, index) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={stock.symbol}>
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

                        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={handleRestart}
                                sx={{
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        bgcolor: 'primary.main' + '1A'
                                    }
                                }}
                            >
                                Start Over
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Portfolio Builder */}
                {showPortfolio && portfolioAllocations.length > 0 && userPreferences && (
                    <Box id="portfolio-section">
                        <PortfolioBuilder
                            allocations={portfolioAllocations}
                            totalBudget={userPreferences.budget}
                            riskLevel={userPreferences.riskProfile?.toUpperCase() || 'BALANCED'}
                            estimatedReturn={12.5}
                        />

                        <Box sx={{ mt: 6, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={() => setShowPortfolio(false)}
                                sx={{
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        bgcolor: 'primary.main' + '1A'
                                    }
                                }}
                            >
                                Modify Selection
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCompare}
                                sx={{
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        bgcolor: 'primary.main' + '1A'
                                    }
                                }}
                            >
                                Compare Stocks
                            </Button>
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    if (!userPreferences) return;

                                    try {
                                        // Create portfolio name
                                        const portfolioName = `${sector} Portfolio - ${new Date().toLocaleDateString()}`;

                                        // Prepare holdings data
                                        const holdings = portfolioAllocations.map(alloc => ({
                                            ticker: alloc.symbol,
                                            shares: alloc.shares,
                                            avg_price: alloc.price_per_share
                                        }));

                                        // Save to backend
                                        const portfolio = await marketService.createPortfolioWithHoldings(
                                            portfolioName,
                                            holdings
                                        );

                                        // Success notification
                                        alert(`Portfolio "${portfolioName}" created successfully!`);

                                        // Optionally navigate to portfolio page
                                        // router.push('/portfolios');
                                    } catch (error) {
                                        console.error('Failed to create portfolio:', error);
                                        alert('Failed to create portfolio. Please try again.');
                                    }
                                }}
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    fontWeight: 700,
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: 'primary.dark'
                                    }
                                }}
                            >
                                Create Portfolio
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Selection Bar */}
                {!showQuestionnaire && !loading && !showPortfolio && (
                    <SelectionBar
                        selectedStocks={selectedStocks}
                        onRemove={(symbol) => setSelectedStocks(selectedStocks.filter(s => s !== symbol))}
                        onClear={() => setSelectedStocks([])}
                        onNext={handleBuildPortfolio}
                    />
                )}
            </Box>
        </Box>
    );
}

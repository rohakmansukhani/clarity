'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import BudgetInput from './BudgetInput';
import HorizonSelector from './HorizonSelector';
import RiskProfileCards from './RiskProfileCards';
import SectorPreferences from './SectorPreferences';

export interface QuestionnaireData {
    budget: number;
    horizon: 'short' | 'medium' | 'long' | null;
    riskProfile: 'conservative' | 'balanced' | 'aggressive' | null;
    sectorPreferences: string[];
}

interface QuestionnaireFlowProps {
    sector: string;
    onComplete: (data: QuestionnaireData) => void;
}

const QUESTIONS = [
    {
        id: 'budget',
        question: "What's your investment budget?",
        aiMessage: "Let's start by understanding your investment capacity. What budget are you comfortable with?"
    },
    {
        id: 'horizon',
        question: 'How long do you plan to hold these investments?',
        aiMessage: "Great choice! Now, what's your investment timeframe?"
    },
    {
        id: 'risk',
        question: "What's your risk tolerance?",
        aiMessage: "Perfect! Now, how comfortable are you with market volatility?"
    },
    {
        id: 'preferences',
        question: 'Any specific focus areas?',
        aiMessage: "Almost done! Want to narrow down to specific sub-sectors?"
    }
];

export default function QuestionnaireFlow({ sector, onComplete }: QuestionnaireFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<QuestionnaireData>({
        budget: 0,
        horizon: null,
        riskProfile: null,
        sectorPreferences: []
    });

    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
    const currentQuestion = QUESTIONS[currentStep];

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Complete questionnaire
            onComplete(data);
        }
    };

    const handleSkip = () => {
        // Skip preferences and complete
        onComplete(data);
    };

    return (
        <Box>
            {/* Progress Bar */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                        Question {currentStep + 1} of {QUESTIONS.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600 }}>
                        {Math.round(progress)}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#222',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: '#00E5FF',
                            borderRadius: 3,
                            transition: 'transform 0.4s ease'
                        }
                    }}
                />
            </Box>

            {/* AI Message */}
            <motion.div
                key={`ai-${currentStep}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                            borderRadius: 2,
                            bgcolor: '#00E5FF20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Sparkles size={20} color="#00E5FF" />
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#00E5FF', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Clarity AI
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#fff', lineHeight: 1.6 }}>
                            {currentQuestion.aiMessage}
                        </Typography>
                    </Box>
                </Box>
            </motion.div>

            {/* Question Card */}
            <Paper
                sx={{
                    p: 4,
                    borderRadius: 4,
                    bgcolor: '#0A0A0A',
                    border: '1px solid #222',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background Glow */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        filter: 'blur(80px)',
                        opacity: 0.1,
                        bgcolor: '#00E5FF'
                    }}
                />

                {/* Question Title */}
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        mb: 4,
                        color: '#fff',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {currentQuestion.question}
                </Typography>

                {/* Question Content */}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <BudgetInput
                                key="budget"
                                value={data.budget}
                                onChange={(value) => setData({ ...data, budget: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 1 && (
                            <HorizonSelector
                                key="horizon"
                                value={data.horizon}
                                onChange={(value) => setData({ ...data, horizon: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 2 && (
                            <RiskProfileCards
                                key="risk"
                                value={data.riskProfile}
                                onChange={(value) => setData({ ...data, riskProfile: value })}
                                onNext={handleNext}
                            />
                        )}
                        {currentStep === 3 && (
                            <SectorPreferences
                                key="preferences"
                                sector={sector}
                                value={data.sectorPreferences}
                                onChange={(value) => setData({ ...data, sectorPreferences: value })}
                                onNext={handleNext}
                                onSkip={handleSkip}
                            />
                        )}
                    </AnimatePresence>
                </Box>
            </Paper>
        </Box>
    );
}

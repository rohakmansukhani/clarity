import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Divider,
  Paper,
} from '@mui/material';
import { TrendingUp } from 'lucide-react';

interface SIPCalculatorStockProps {
  currentPrice: number;
  symbol: string;
}

interface CalculationResult {
  totalInvestment: number;
  wealthGain: number;
  maturityValue: number;
  estimatedShares: number;
}

const SIPCalculatorStock: React.FC<SIPCalculatorStockProps> = ({
  currentPrice,
  symbol,
}) => {
  const [investmentType, setInvestmentType] = useState<'sip' | 'lumpsum'>('sip');
  const [amount, setAmount] = useState<string>('');
  const [returnRate, setReturnRate] = useState<string>('');
  const [tenure, setTenure] = useState<string>('');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calculateSIP = (): CalculationResult | null => {
    const monthlyAmount = parseFloat(amount);
    const annualRate = parseFloat(returnRate);
    const years = parseFloat(tenure);

    if (
      isNaN(monthlyAmount) ||
      isNaN(annualRate) ||
      isNaN(years) ||
      monthlyAmount <= 0 ||
      annualRate < 0 ||
      years <= 0
    ) {
      return null;
    }

    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;

    // SIP Future Value Formula: FV = P × ((1 + r)^n - 1) / r × (1 + r)
    const maturityValue =
      monthlyAmount *
      (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    const totalInvestment = monthlyAmount * months;
    const wealthGain = maturityValue - totalInvestment;
    const estimatedShares = maturityValue / currentPrice;

    return {
      totalInvestment,
      wealthGain,
      maturityValue,
      estimatedShares,
    };
  };

  const calculateLumpsum = (): CalculationResult | null => {
    const lumpsumAmount = parseFloat(amount);
    const annualRate = parseFloat(returnRate);
    const years = parseFloat(tenure);

    if (
      isNaN(lumpsumAmount) ||
      isNaN(annualRate) ||
      isNaN(years) ||
      lumpsumAmount <= 0 ||
      annualRate < 0 ||
      years <= 0
    ) {
      return null;
    }

    // Lumpsum Future Value Formula: FV = P × (1 + r)^n
    const maturityValue = lumpsumAmount * Math.pow(1 + annualRate / 100, years);

    const totalInvestment = lumpsumAmount;
    const wealthGain = maturityValue - totalInvestment;
    const estimatedShares = maturityValue / currentPrice;

    return {
      totalInvestment,
      wealthGain,
      maturityValue,
      estimatedShares,
    };
  };

  const handleCalculate = () => {
    const calculationResult =
      investmentType === 'sip' ? calculateSIP() : calculateLumpsum();

    if (calculationResult) {
      setResult(calculationResult);
    } else {
      alert('Please enter valid values for all fields');
    }
  };

  const handleInvestmentTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'sip' | 'lumpsum' | null
  ) => {
    if (newType !== null) {
      setInvestmentType(newType);
      setResult(null);
    }
  };

  return (
    <Card
      sx={{
        maxWidth: 800,
        margin: 'auto',
        mt: 3,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendingUp size={28} style={{ marginRight: '12px', color: '#1976d2' }} />
          <Typography variant="h5" component="h2" fontWeight={600}>
            Investment Calculator - {symbol}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Current Price: {formatCurrency(currentPrice)}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={investmentType}
            exclusive
            onChange={handleInvestmentTypeChange}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="sip" sx={{ py: 1.5 }}>
              <Typography variant="body1" fontWeight={500}>
                SIP (Monthly)
              </Typography>
            </ToggleButton>
            <ToggleButton value="lumpsum" sx={{ py: 1.5 }}>
              <Typography variant="body1" fontWeight={500}>
                Lumpsum (One-time)
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={
                  investmentType === 'sip'
                    ? 'Monthly Investment Amount (₹)'
                    : 'Lumpsum Investment Amount (₹)'
                }
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                variant="outlined"
                InputProps={{
                  inputProps: { min: 0, step: 100 },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Expected Annual Return Rate (%)"
                type="number"
                value={returnRate}
                onChange={(e) => setReturnRate(e.target.value)}
                variant="outlined"
                InputProps={{
                  inputProps: { min: 0, max: 100, step: 0.1 },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Investment Tenure (Years)"
                type="number"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                variant="outlined"
                InputProps={{
                  inputProps: { min: 0, max: 50, step: 0.5 },
                }}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleCalculate}
            sx={{
              mt: 3,
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Calculate
          </Button>
        </Box>

        {result && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2 }}
                color="primary"
              >
                Investment Summary
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Total Investment
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {formatCurrency(result.totalInvestment)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#e8f5e9',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Wealth Gain
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="success.main">
                      {formatCurrency(result.wealthGain)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#e3f2fd',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Maturity Value
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      {formatCurrency(result.maturityValue)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#fff3e0',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Estimated Shares
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="warning.main">
                      {formatNumber(result.estimatedShares)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: '#fafafa',
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Note:</strong> This calculation is for illustrative purposes
                  only. Actual returns may vary based on market conditions. The
                  estimated shares are calculated using the current price of{' '}
                  {formatCurrency(currentPrice)} and may differ at maturity.
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SIPCalculatorStock;

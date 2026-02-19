import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FundamentalAnalyzer:
    """
    Analyzes fundamental health of a company.
    """
    
    def analyze(self, fundamentals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive fundamental analysis.
        """
        try:
            # Extract key metrics
            pe = float(fundamentals.get('trailingPE', 0))
            pb = float(fundamentals.get('priceToBook', 0))
            de = float(fundamentals.get('debtToEquity', 0)) / 100
            roe = float(fundamentals.get('returnOnEquity', 0)) * 100
            profit_margin = float(fundamentals.get('profitMargin', 0)) * 100
            revenue_growth = float(fundamentals.get('revenueGrowth', 0)) * 100
            
            # Liquidity
            current_ratio = float(fundamentals.get('currentRatio', 0))
            quick_ratio = float(fundamentals.get('quickRatio', 0))
            
            # Health Score (0-100)
            health_score = self._calc_health_score(pe, pb, de, roe, profit_margin, current_ratio)
            
            # Valuation
            valuation = self._assess_valuation(pe, pb, fundamentals.get('forwardPE'))
            
            # Financial Health
            financial_health = self._assess_financial_health(de, roe, profit_margin, current_ratio)
            
            # Growth Potential
            growth_potential = self._assess_growth(revenue_growth)
            
            return {
                "health_score": round(health_score),
                "valuation": valuation,
                "financial_health": financial_health,
                "growth_potential": growth_potential,
                "key_metrics": {
                    "pe_ratio": round(pe, 2),
                    "forward_pe": round(float(fundamentals.get('forwardPE', 0)), 2),
                    "pb_ratio": round(pb, 2),
                    "debt_equity": round(de, 2),
                    "roe": f"{roe:.2f}%",
                    "profit_margin": f"{profit_margin:.2f}%",
                    "revenue_growth": f"{revenue_growth:.2f}%",
                    "current_ratio": round(current_ratio, 2),
                    "quick_ratio": round(quick_ratio, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Fundamental Analysis Error: {e}")
            return {"error": str(e)}
    
    def _calc_health_score(self, pe, pb, de, roe, margin, current_ratio=0) -> float:
        """Calculate overall fundamental health score."""
        score = 40  # Start lower (neutral-conservative)
        
        # PE Score
        if 0 < pe < 15:
            score += 15
        elif 15 <= pe < 25:
            score += 10
        elif 25 <= pe < 40:
            score += 5
        
        # PB Score
        if 0 < pb < 2:
            score += 10
        elif 2 <= pb < 4:
            score += 5
        
        # Debt Score
        if de < 0.5:
            score += 15
        elif de < 1.0:
            score += 10
        elif de < 2.0:
            score += 5
        
        # ROE Score
        if roe > 20:
            score += 10
        elif roe > 15:
            score += 7
        elif roe > 10:
            score += 4
            
        # Liquidity bonus
        if current_ratio > 1.5:
            score += 10
        elif current_ratio >= 1.0:
            score += 5
        
        return min(100, max(0, score))
    
    def _assess_valuation(self, pe, pb, forward_pe=None) -> Dict[str, str]:
        """Assess valuation level with forward PE context if available."""
        is_undervalued = pe < 15 and pb < 2
        
        if forward_pe and float(forward_pe) < pe:
            earnings_outlook = "Earnings expected to improve"
        else:
            earnings_outlook = "Neutral earnings outlook"
            
        if is_undervalued:
            level = "UNDERVALUED"
            desc = f"Trading below historical averages. {earnings_outlook}."
        elif pe > 40 or pb > 5:
            level = "OVERVALUED"
            desc = f"Premium valuation noted. {earnings_outlook}."
        else:
            level = "FAIR"
            desc = f"Reasonably valued compared to peers. {earnings_outlook}."
        
        return {"level": level, "description": desc}
    
    def _assess_financial_health(self, de, roe, margin, current_ratio=0) -> Dict[str, str]:
        """Assess financial health including liquidity."""
        if de < 0.5 and roe > 15 and margin > 10 and current_ratio >= 1.0:
            level = "STRONG"
            desc = "Excellent financial position with good liquidity"
        elif de > 2 or roe < 5 or margin < 0 or (current_ratio < 0.8 and current_ratio > 0):
            level = "WEAK"
            desc = "Financial concerns present, check debt and liquidity"
        else:
            level = "MODERATE"
            desc = "Stable financial health across key metrics"
        
        return {"level": level, "description": desc}
    
    def _assess_growth(self, revenue_growth) -> Dict[str, str]:
        """Assess growth potential."""
        if revenue_growth > 20:
            level = "HIGH"
            desc = "Strong growth trajectory"
        elif revenue_growth > 10:
            level = "MODERATE"
            desc = "Steady growth"
        elif revenue_growth > 0:
            level = "LOW"
            desc = "Slow growth"
        else:
            level = "DECLINING"
            desc = "Revenue contraction"
        
        return {"level": level, "description": desc}

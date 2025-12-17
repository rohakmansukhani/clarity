import logging
import numpy as np

logger = logging.getLogger(__name__)

class StabilityScoreEngine:
    """
    Calculates a stability score (0-100) indicating how 'safe' or 'stable' a stock is.
    Based on: Volatility (30%), Fundamentals (30%), Market Position (20%), Growth (20%).
    """

    def calculate_score(self, symbol: str, market_data: dict) -> dict:
        try:
            # Extract Data
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Volatility Score (30 pts)
            vol_score, vol_metrics = self._calc_volatility_score(history)
            
            # 2. Fundamental Score (30 pts)
            fund_score, fund_metrics = self._calc_fundamental_score(fundamentals)
            
            # 3. Market Position Score (20 pts)
            mkt_score, mkt_metrics = self._calc_market_score(fundamentals)
            
            # 4. Growth Consistency (20 pts)
            growth_score, growth_metrics = self._calc_growth_score(fundamentals)
            
            total_score = vol_score + fund_score + mkt_score + growth_score
            
            return {
                "score": round(total_score),
                "breakdown": {
                    "volatility": {"score": vol_score, "max": 30, "metrics": vol_metrics},
                    "fundamentals": {"score": fund_score, "max": 30, "metrics": fund_metrics},
                    "market_position": {"score": mkt_score, "max": 20, "metrics": mkt_metrics},
                    "growth": {"score": growth_score, "max": 20, "metrics": growth_metrics}
                },
                "interpretation": self._interpret_score(total_score)
            }
        except Exception as e:
            logger.error(f"Stability Calc Error for {symbol}: {e}")
            return {"score": 0, "error": str(e)}

    def _calc_volatility_score(self, history: list) -> tuple:
        if not history or len(history) < 20:
            return 15, {"volatility_annualized": "N/A"} # Default average
            
        closes = [float(d['close']) for d in history]
        returns = np.diff(closes) / closes[:-1]
        volatility = np.std(returns) * np.sqrt(252) * 100 # Annualized %
        
        # Lower volatility = Higher score
        # Target < 20% for max score, > 50% for 0 score
        score = max(0, min(30, 30 * (1 - (volatility - 10) / 40)))
        
        return round(score), {"volatility_annualized": f"{volatility:.2f}%"}

    def _calc_fundamental_score(self, fundamentals: dict) -> tuple:
        score = 0
        metrics = {}
        
        # Debt to Equity (10 pts)
        de = float(fundamentals.get("debtToEquity", 100)) / 100 if fundamentals.get("debtToEquity") else 1.0
        metrics["debt_to_equity"] = round(de, 2)
        if de < 0.5: score += 10
        elif de < 1.0: score += 7
        elif de < 2.0: score += 4
        
        # Current Ratio (10 pts) - Proxy using quick ratio or creating a mock if missing
        cr = float(fundamentals.get("currentRatio", 1.0))
        metrics["current_ratio"] = round(cr, 2)
        if cr > 2.0: score += 10
        elif cr > 1.5: score += 7
        elif cr > 1.0: score += 5
        
        # ROE (10 pts)
        roe = float(fundamentals.get("returnOnEquity", 0)) * 100
        metrics["roe"] = f"{roe:.2f}%"
        if roe > 20: score += 10
        elif roe > 15: score += 8
        elif roe > 10: score += 5
        
        return score, metrics

    def _calc_market_score(self, fundamentals: dict) -> tuple:
        score = 0
        metrics = {}
        
        # Market Cap (10 pts)
        mcap = float(fundamentals.get("marketCap", 0))
        metrics["market_cap_cr"] = round(mcap / 10000000, 2) # Assume value is raw, convert to Cr roughly (adjustment needed based on source)
        
        # Heuristic: > 1L Cr is Large Cap
        if mcap > 1000000000000: score += 10 # 1 Trillion
        elif mcap > 500000000000: score += 7
        elif mcap > 100000000000: score += 4
        
        # Volume/Liquidity (10 pts) - Hard to get exact volume score without avg volume, use safe default
        score += 5 
        
        return score, metrics

    def _calc_growth_score(self, fundamentals: dict) -> tuple:
        # Placeholder for complex growth variance calc
        # Using Revenue Growth and EPS Growth from fundamentals if available
        score = 10 # Default
        
        rev_growth = float(fundamentals.get("revenueGrowth", 0))
        if rev_growth > 0.15: score += 5
        
        return score, {"revenue_growth": f"{rev_growth:.1%}"}

    def _interpret_score(self, score):
        if score >= 80: return "HIGH_STABILITY"
        if score >= 60: return "MEDIUM_STABILITY"
        if score >= 40: return "MODERATE_STABILITY"
        return "LOW_STABILITY"

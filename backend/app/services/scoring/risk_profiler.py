import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class RiskProfileEngine:
    """
    Calculates a Risk Profile (LOW/MEDIUM/HIGH) and Risk Score (0-100).
    Higher Score = Higher Risk.
    """

    def calculate_risk(self, symbol: str, market_data: dict) -> dict:
        try:
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Volatility Risk (40%)
            vol_risk, vol_val = self._calc_volatility_risk(history)
            
            # 2. Drawdown Risk (30%)
            dd_risk, dd_val = self._calc_drawdown_risk(history)
            
            # 3. Fundamental Risk (30%)
            fund_risk, fund_val = self._calc_fundamental_risk(fundamentals)
            
            total_risk = vol_risk + dd_risk + fund_risk
            
            return {
                "risk_score": round(total_risk),
                "risk_level": self._get_level(total_risk),
                "breakdown": {
                    "volatility_risk": {"score": vol_risk, "value": vol_val},
                    "drawdown_risk": {"score": dd_risk, "value": dd_val},
                    "fundamental_risk": {"score": fund_risk, "value": fund_val}
                }
            }
        except Exception as e:
            logger.error(f"Risk Calc Error for {symbol}: {e}")
            return {"risk_score": 50, "risk_level": "UNKNOWN", "error": str(e)}

    def _calc_volatility_risk(self, history: list) -> tuple:
        if not history or len(history) < 20: return 20, "N/A"
        
        closes = [float(d['close']) for d in history]
        returns = np.diff(closes) / closes[:-1]
        vol = np.std(returns) * np.sqrt(252) * 100
        
        # Vol > 40% = Max Risk (40pts)
        score = min(40, (vol / 40) * 40)
        return round(score), f"{vol:.2f}%"

    def _calc_drawdown_risk(self, history: list) -> tuple:
        if not history: return 15, "N/A"
        
        df = pd.DataFrame(history)
        close = df['close'].astype(float)
        
        rolling_max = close.cummax()
        drawdown = (close - rolling_max) / rolling_max
        max_dd = drawdown.min() * 100 # e.g. -30.5
        
        # Max Drawdown of -50% = Max Risk (30pts)
        score = min(30, (abs(max_dd) / 50) * 30)
        
        return round(score), f"{max_dd:.2f}%"

    def _calc_fundamental_risk(self, fundamentals: dict) -> tuple:
        score = 0
        issues = []
        
        # High Debt
        de = float(fundamentals.get("debtToEquity", 0)) / 100
        if de > 2.0: 
            score += 15
            issues.append("High Debt")
        elif de > 1.0:
            score += 8
            
        # Beta (Market Sensitivity)
        beta = float(fundamentals.get("beta", 1.0))
        if beta > 1.5:
            score += 15
            issues.append("High Beta")
        elif beta > 1.2:
            score += 8
            
        return min(30, score), ", ".join(issues) if issues else "Safe"

    def _get_level(self, score):
        if score >= 60: return "HIGH"
        if score >= 30: return "MEDIUM"
        return "LOW"

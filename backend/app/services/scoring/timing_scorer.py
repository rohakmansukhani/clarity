import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class TimingScoreEngine:
    """
    Calculates a Timing Score (0-100) and Signal (BUY/NEUTRAL/SELL).
    Based on: Technicals (40%), Valuation (30%), Momentum (20%), Sentiment (10%).
    """

    def calculate_score(self, symbol: str, market_data: dict) -> dict:
        try:
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Technical Signals (40 pts)
            tech_score, tech_metrics = self._calc_technicals(history)
            
            # 2. Valuation Score (30 pts)
            val_score, val_metrics = self._calc_valuation(fundamentals)
            
            # 3. Momentum Score (20 pts)
            mom_score, mom_metrics = self._calc_momentum(history)
            
            # 4. Sentiment (10 pts) - Placeholder for now
            sent_score = 5
            
            total_score = tech_score + val_score + mom_score + sent_score
            
            return {
                "score": round(total_score),
                "signal": self._get_signal(total_score),
                "confidence": "HIGH" if total_score > 70 or total_score < 30 else "MEDIUM",
                "breakdown": {
                    "technical": {"score": tech_score, "max": 40, "metrics": tech_metrics},
                    "valuation": {"score": val_score, "max": 30, "metrics": val_metrics},
                    "momentum": {"score": mom_score, "max": 20, "metrics": mom_metrics},
                    "sentiment": {"score": sent_score, "max": 10}
                }
            }
        except Exception as e:
            logger.error(f"Timing Calc Error for {symbol}: {e}")
            return {"score": 0, "signal": "UNKNOWN", "error": str(e)}

    def _calc_technicals(self, history: list) -> tuple:
        if not history or len(history) < 200:
            return 20, {"error": "Not enough history"}
            
        df = pd.DataFrame(history)
        df['close'] = df['close'].astype(float)
        
        current_price = df['close'].iloc[-1]
        
        # Moving Averages
        ma50 = df['close'].rolling(window=50).mean().iloc[-1]
        ma200 = df['close'].rolling(window=200).mean().iloc[-1]
        
        score = 0
        signals = []
        
        # Price vs MA50
        if current_price > ma50:
            score += 15
            signals.append("Price > 50DMA")
        
        # Price vs MA200 (Golden Cross potential)
        if current_price > ma200:
            score += 15
            signals.append("Price > 200DMA")
            
        # RSI Calculation (Basic 14 period)
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        # RSI Logic
        if 30 <= rsi <= 50: score += 10 # Good entry
        elif rsi < 30: score += 10 # Oversold (Buy)
        elif rsi > 70: score -= 5 # Overbought
        
        metrics = {
            "ma50": round(ma50, 2),
            "ma200": round(ma200, 2),
            "rsi": round(rsi, 2),
            "signals": signals
        }
        
        return min(40, max(0, score)), metrics

    def _calc_valuation(self, fundamentals: dict) -> tuple:
        score = 15 # Start neutral
        metrics = {}
        
        pe = float(fundamentals.get("trailingPE", 0))
        metrics["pe"] = round(pe, 2)
        
        # Simple heuristic since we lack sector PE currently
        # PE < 20 generally decent value for Indian market (very rough)
        if 0 < pe < 20: score += 10
        elif pe > 50: score -= 5
        
        pb = float(fundamentals.get("priceToBook", 0))
        metrics["pb"] = round(pb, 2)
        if 0 < pb < 3: score += 5
        
        return min(30, max(0, score)), metrics

    def _calc_momentum(self, history: list) -> tuple:
        if not history or len(history) < 30: return 10, {}
        
        df = pd.DataFrame(history)
        close = df['close'].astype(float)
        
        # 1 Month Return
        ret_1m = (close.iloc[-1] - close.iloc[-20]) / close.iloc[-20]
        
        score = 10
        if ret_1m > 0: score += 10 # Positive momentum
        
        return score, {"1m_return": f"{ret_1m:.1%}"}

    def _get_signal(self, score):
        if score >= 70: return "BUY"
        if score >= 40: return "NEUTRAL"
        return "WAIT"

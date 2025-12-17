import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    """
    Calculates technical indicators: Moving Averages, RSI, MACD, Bollinger Bands.
    """
    
    def analyze(self, history: List[dict]) -> Dict[str, Any]:
        """
        Full technical analysis on historical data.
        """
        if not history or len(history) < 50:
            return {"error": "Insufficient data for technical analysis"}
        
        try:
            df = pd.DataFrame(history)
            df['close'] = df['close'].astype(float)
            df['high'] = df['high'].astype(float)
            df['low'] = df['low'].astype(float)
            df['volume'] = df['volume'].astype(float)
            
            current_price = df['close'].iloc[-1]
            
            # Moving Averages
            ma_data = self._calc_moving_averages(df)
            
            # RSI
            rsi = self._calc_rsi(df)
            
            # MACD
            macd_data = self._calc_macd(df)
            
            # Bollinger Bands
            bb_data = self._calc_bollinger_bands(df)
            
            # Support & Resistance
            sr_data = self._calc_support_resistance(df)
            
            # Overall Signal
            signal = self._generate_signal(ma_data, rsi, macd_data, bb_data)
            
            return {
                "current_price": round(current_price, 2),
                "moving_averages": ma_data,
                "rsi": rsi,
                "macd": macd_data,
                "bollinger_bands": bb_data,
                "support_resistance": sr_data,
                "signal": signal
            }
            
        except Exception as e:
            logger.error(f"Technical Analysis Error: {e}")
            return {"error": str(e)}
    
    def _calc_moving_averages(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate 20, 50, 200 day moving averages."""
        current = df['close'].iloc[-1]
        
        mas = {}
        for period in [20, 50, 200]:
            if len(df) >= period:
                ma = df['close'].rolling(window=period).mean().iloc[-1]
                mas[f'ma{period}'] = round(ma, 2)
                mas[f'ma{period}_signal'] = 'ABOVE' if current > ma else 'BELOW'
            else:
                mas[f'ma{period}'] = None
                mas[f'ma{period}_signal'] = 'N/A'
        
        return mas
    
    def _calc_rsi(self, df: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
        """Calculate Relative Strength Index."""
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]
        
        if current_rsi < 30:
            signal = 'OVERSOLD'
        elif current_rsi > 70:
            signal = 'OVERBOUGHT'
        else:
            signal = 'NEUTRAL'
        
        return {
            "value": round(current_rsi, 2),
            "signal": signal
        }
    
    def _calc_macd(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate MACD (Moving Average Convergence Divergence)."""
        ema12 = df['close'].ewm(span=12, adjust=False).mean()
        ema26 = df['close'].ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        current_hist = histogram.iloc[-1]
        
        signal = 'BUY' if current_hist > 0 else 'SELL'
        
        return {
            "macd": round(current_macd, 2),
            "signal_line": round(current_signal, 2),
            "histogram": round(current_hist, 2),
            "signal": signal
        }
    
    def _calc_bollinger_bands(self, df: pd.DataFrame, period: int = 20) -> Dict[str, Any]:
        """Calculate Bollinger Bands."""
        sma = df['close'].rolling(window=period).mean()
        std = df['close'].rolling(window=period).std()
        
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        
        current_price = df['close'].iloc[-1]
        current_upper = upper.iloc[-1]
        current_lower = lower.iloc[-1]
        current_sma = sma.iloc[-1]
        
        if current_price > current_upper:
            signal = 'OVERBOUGHT'
        elif current_price < current_lower:
            signal = 'OVERSOLD'
        else:
            signal = 'NEUTRAL'
        
        return {
            "upper": round(current_upper, 2),
            "middle": round(current_sma, 2),
            "lower": round(current_lower, 2),
            "signal": signal
        }
    
    def _calc_support_resistance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify support and resistance levels."""
        # Simple pivot points
        high = df['high'].tail(20).max()
        low = df['low'].tail(20).min()
        close = df['close'].iloc[-1]
        
        pivot = (high + low + close) / 3
        resistance = (2 * pivot) - low
        support = (2 * pivot) - high
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "pivot": round(pivot, 2)
        }
    
    def _generate_signal(self, ma_data, rsi, macd, bb) -> str:
        """Generate overall technical signal."""
        buy_signals = 0
        sell_signals = 0
        
        # MA Signals
        if ma_data.get('ma50_signal') == 'ABOVE':
            buy_signals += 1
        else:
            sell_signals += 1
        
        # RSI
        if rsi['signal'] == 'OVERSOLD':
            buy_signals += 2
        elif rsi['signal'] == 'OVERBOUGHT':
            sell_signals += 2
        
        # MACD
        if macd['signal'] == 'BUY':
            buy_signals += 1
        else:
            sell_signals += 1
        
        # Bollinger
        if bb['signal'] == 'OVERSOLD':
            buy_signals += 1
        elif bb['signal'] == 'OVERBOUGHT':
            sell_signals += 1
        
        if buy_signals > sell_signals:
            return 'BUY'
        elif sell_signals > buy_signals:
            return 'SELL'
        else:
            return 'NEUTRAL'

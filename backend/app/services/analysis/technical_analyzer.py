import logging
import numpy as np
import polars as pl
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    """
    Calculates technical indicators: Moving Averages, RSI, MACD, Bollinger Bands.
    Optimized to use Polars for Memory Efficiency (10x lighter than Pandas).
    """
    
    def analyze(self, history: List[dict]) -> Dict[str, Any]:
        """
        Full technical analysis on historical data using Polars.
        """
        if not history or len(history) < 50:
            return {"error": "Insufficient data for technical analysis"}
        
        try:
            # OPTIMIZATION: Use Polars DataFrame (Zero-copy, lower memory)
            df = pl.DataFrame(history)
            
            # Cast columns to float
            df = df.with_columns([
                pl.col('close').cast(pl.Float64),
                pl.col('high').cast(pl.Float64),
                pl.col('low').cast(pl.Float64),
                pl.col('volume').cast(pl.Float64)
            ])
            
            current_price = df.select(pl.col("close").last()).item()
            
            # Moving Averages
            ma_data = self._calc_moving_averages(df, current_price)
            
            # RSI
            rsi = self._calc_rsi(df)
            
            # MACD
            macd_data = self._calc_macd(df)
            
            # Bollinger Bands
            bb_data = self._calc_bollinger_bands(df)
            
            # Volume Analysis
            volume_data = self._analyze_volume(df)
            
            # Trend Detection (EMA Crosses)
            trend_data = self._detect_trends(df)
            
            # Overall Signal
            signal = self._generate_signal(ma_data, rsi, macd_data, bb_data, volume_data)
            
            return {
                "current_price": round(current_price, 2),
                "moving_averages": ma_data,
                "rsi": rsi,
                "macd": macd_data,
                "bollinger_bands": bb_data,
                "support_resistance": sr_data,
                "volume_analysis": volume_data,
                "trend_analysis": trend_data,
                "signal": signal
            }
            
        except Exception as e:
            logger.error(f"Technical Analysis Error: {e}")
            return {"error": str(e)}
    
    def _calc_moving_averages(self, df: pl.DataFrame, current: float) -> Dict[str, Any]:
        """Calculate 20, 50, 200 day moving averages using Polars."""
        mas = {}
        for period in [20, 50, 200]:
            if df.height >= period:
                ma = df.select(pl.col("close").rolling_mean(window_size=period).last()).item()
                if ma is not None:
                    mas[f'ma{period}'] = round(ma, 2)
                    mas[f'ma{period}_signal'] = 'ABOVE' if current > ma else 'BELOW'
                else:
                    mas[f'ma{period}'] = None
                    mas[f'ma{period}_signal'] = 'N/A'
            else:
                mas[f'ma{period}'] = None
                mas[f'ma{period}_signal'] = 'N/A'
        
        return mas
    
    def _calc_rsi(self, df: pl.DataFrame, period: int = 14) -> Dict[str, Any]:
        """Calculate RSI using Polars."""
        delta = df.select(pl.col("close").diff())
        
        # Create gain/loss series
        gain = delta.select(pl.when(pl.col("close") > 0).then(pl.col("close")).otherwise(0).alias("gain"))
        loss = delta.select(pl.when(pl.col("close") < 0).then(-pl.col("close")).otherwise(0).alias("loss"))
        
        avg_gain = gain.select(pl.col("gain").rolling_mean(window_size=period)).to_series()
        avg_loss = loss.select(pl.col("loss").rolling_mean(window_size=period)).to_series()
        
        rs = avg_gain / avg_loss
        rsi_series = 100 - (100 / (1 + rs))
        current_rsi = rsi_series[-1]
        
        if current_rsi is None or np.isnan(current_rsi):
             current_rsi = 50.0  # Fallback
             
        if current_rsi < 30:
            signal = 'OVERSOLD'
        elif current_rsi > 70:
            signal = 'OVERBOUGHT'
        else:
            signal = 'NEUTRAL'
        
        return {
            "value": round(float(current_rsi), 2),
            "signal": signal
        }
    
    def _calc_macd(self, df: pl.DataFrame) -> Dict[str, Any]:
        """Calculate MACD using Polars ewm_mean."""
        # Polars ewm_mean is slightly different, ensure span logic matches
        ema12 = df.select(pl.col("close").ewm_mean(span=12, adjust=False)).to_series()
        ema26 = df.select(pl.col("close").ewm_mean(span=26, adjust=False)).to_series()
        
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm_mean(span=9, adjust=False)
        histogram = macd_line - signal_line
        
        current_macd = macd_line[-1]
        current_signal = signal_line[-1]
        current_hist = histogram[-1]
        
        signal = 'BUY' if current_hist > 0 else 'SELL'
        
        return {
            "macd": round(float(current_macd), 2),
            "signal_line": round(float(current_signal), 2),
            "histogram": round(float(current_hist), 2),
            "signal": signal
        }
    
    def _calc_bollinger_bands(self, df: pl.DataFrame, period: int = 20) -> Dict[str, Any]:
        """Calculate Bollinger Bands using Polars."""
        sma = df.select(pl.col("close").rolling_mean(window_size=period)).to_series()
        std = df.select(pl.col("close").rolling_std(window_size=period)).to_series()
        
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        
        current_price = df.select(pl.col("close").last()).item()
        current_upper = upper[-1]
        current_lower = lower[-1]
        current_sma = sma[-1]
        
        if current_price > current_upper:
            signal = 'OVERBOUGHT'
        elif current_price < current_lower:
            signal = 'OVERSOLD'
        else:
            signal = 'NEUTRAL'
        
        return {
            "upper": round(float(current_upper), 2),
            "middle": round(float(current_sma), 2),
            "lower": round(float(current_lower), 2),
            "signal": signal
        }
    
    def _calc_support_resistance(self, df: pl.DataFrame) -> Dict[str, Any]:
        """Identify support and resistance using Polars."""
        # Simple pivot points from last 20 days
        last_20 = df.tail(20)
        high = last_20.select(pl.col("high").max()).item()
        low = last_20.select(pl.col("low").min()).item()
        close = df.select(pl.col("close").last()).item()
        
        pivot = (high + low + close) / 3
        resistance = (2 * pivot) - low
        support = (2 * pivot) - high
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "pivot": round(pivot, 2)
        }
    
    def _analyze_volume(self, df: pl.DataFrame) -> Dict[str, Any]:
        """Analyze volume patterns and spikes."""
        current_vol = df.select(pl.col("volume").last()).item()
        avg_vol_20 = df.select(pl.col("volume").rolling_mean(window_size=20).last()).item()
        
        if avg_vol_20 and avg_vol_20 > 0:
            spike_ratio = (current_vol / avg_vol_20)
            spike_pct = (spike_ratio - 1) * 100
        else:
            spike_ratio = 1.0
            spike_pct = 0.0
            
        signal = 'NEUTRAL'
        if spike_ratio > 2.0:
            signal = 'HIGH_VOLUME_SPIKE'
        elif spike_ratio > 1.5:
            signal = 'ACCUMULATION'
        elif spike_ratio < 0.5:
            signal = 'LOW_LIQUIDITY'
            
        return {
            "current_volume": int(current_vol),
            "avg_volume_20d": int(avg_vol_20) if avg_vol_20 else 0,
            "spike_ratio": round(spike_ratio, 2),
            "spike_percent": round(spike_pct, 2),
            "signal": signal
        }

    def _detect_trends(self, df: pl.DataFrame) -> Dict[str, Any]:
        """Detect Golden Cross / Death Cross and trend persistence."""
        if df.height < 200:
            return {"status": "INSUFFICIENT_DATA", "days_available": df.height}
            
        ma50 = df.select(pl.col("close").rolling_mean(window_size=50).to_series())
        ma200 = df.select(pl.col("close").rolling_mean(window_size=200).to_series())
        
        curr_ma50 = ma50[-1]
        curr_ma200 = ma200[-1]
        prev_ma50 = ma50[-2]
        prev_ma200 = ma200[-2]
        
        status = 'NEUTRAL'
        if prev_ma50 <= prev_ma200 and curr_ma50 > curr_ma200:
            status = 'GOLDEN_CROSS_BULLISH'
        elif prev_ma50 >= prev_ma200 and curr_ma50 < curr_ma200:
            status = 'DEATH_CROSS_BEARISH'
        elif curr_ma50 > curr_ma200:
            status = 'BULLISH_TREND'
        else:
            status = 'BEARISH_TREND'
            
        return {
            "status": status,
            "ma50": round(curr_ma50, 2),
            "ma200": round(curr_ma200, 2),
            "strength": "STRONG" if abs(curr_ma50 - curr_ma200) / curr_ma200 > 0.05 else "WEAK"
        }

    def _generate_signal(self, ma_data, rsi, macd, bb, volume_data=None) -> str:
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
            
        # Volume Spike (Confirmation filter)
        if volume_data and volume_data['signal'] == 'HIGH_VOLUME_SPIKE':
            if buy_signals > sell_signals:
                buy_signals += 1
            elif sell_signals > buy_signals:
                sell_signals += 1
        
        if buy_signals > sell_signals:
            return 'BUY'
        elif sell_signals > buy_signals:
            return 'SELL'
        else:
            return 'NEUTRAL'

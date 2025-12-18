from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
import yfinance as yf
import logging
import asyncio

logger = logging.getLogger(__name__)

class YahooProvider(BaseDataSource):
    @property
    def source_name(self) -> str:
        return "YahooFinance"
    
    def _normalize_symbol(self, symbol: str) -> str:
        """
        Clean and normalize stock symbol by removing all exchange suffixes.
        
        Examples:
            "RELIANCE.NS.NS" -> "RELIANCE"
            "TCS.BO" -> "TCS"
            "INFY.NS" -> "INFY"
            "INFY" -> "INFY"
        """
        # Remove all exchange suffixes
        clean = symbol.replace('.NS', '').replace('.BO', '').replace('.BSE', '')
        return clean.strip()

    async def get_latest_price(self, symbol: str) -> float:
        try:
            # Normalize symbol first to prevent double suffix
            clean_symbol = self._normalize_symbol(symbol)
            ticker = f"{clean_symbol}.NS"
            
            loop = asyncio.get_event_loop()
            # fetching history(period='1d') is fast
            hist = await loop.run_in_executor(None, lambda: yf.Ticker(ticker).history(period="1d"))
            
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
            return 0.0
        except Exception as e:
            logger.error(f"Yahoo Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch detailed stock information from Yahoo Finance.
        Tries NSE first (.NS), then BSE (.BO) as fallback.
        """
        def _fetch(ticker_symbol: str):
            try:
                info = yf.Ticker(ticker_symbol).info
                # Check if we got valid data
                if not info or 'currentPrice' not in info:
                    return None
                return info
            except Exception as e:
                logger.debug(f"Yahoo fetch error for {ticker_symbol}: {e}")
                return None
        
        # Normalize symbol first to prevent double suffix
        clean_symbol = self._normalize_symbol(symbol)
        
        # Try NSE first
        ticker = f"{clean_symbol}.NS"
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _fetch, ticker)
        
        # If NSE fails, try BSE as fallback
        if info is None:
            logger.info(f"NSE data unavailable for {clean_symbol}, trying BSE...")
            ticker = f"{clean_symbol}.BO"
            info = await loop.run_in_executor(None, _fetch, ticker)
            
            if info is not None:
                logger.info(f"✓ BSE data found for {clean_symbol}")
        
        # Normalize Keys if we got data
        if info:
            info['market_cap'] = info.get('marketCap')
            info['pe_ratio'] = info.get('trailingPE')
            info['high_52w'] = info.get('fiftyTwoWeekHigh')
            info['low_52w'] = info.get('fiftyTwoWeekLow')
            return info
        
        return {}

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

    async def get_latest_price(self, symbol: str) -> float:
        try:
            # Yahoo needs ".NS" suffix for NSE
            ticker = f"{symbol}.NS"
            
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
        try:
            ticker = f"{symbol}.NS"
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, lambda: yf.Ticker(ticker).info)
            
            # Normalize Keys
            if info:
                info['market_cap'] = info.get('marketCap')
                info['pe_ratio'] = info.get('trailingPE')
                info['high_52w'] = info.get('fiftyTwoWeekHigh')
                info['low_52w'] = info.get('fiftyTwoWeekLow')
                
            return info
        except Exception as e:
            logger.error(f"Yahoo Details Error for {symbol}: {e}")
            return {}

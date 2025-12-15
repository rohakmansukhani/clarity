from typing import Dict, Any, Optional
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class GoogleFinanceProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://www.google.com/finance/quote"
        
    @property
    def source_name(self) -> str:
        return "GoogleFinance"

    def _get_headers(self):
        return {
            "User-Agent": self.ua.random,
            "Accept-Language": "en-US,en;q=0.9"
        }

    async def get_latest_price(self, symbol: str) -> float:
        """
        Scrapes Google Finance for the latest price.
        Symbol format: "RELIANCE:NSE" or just "RELIANCE" (we default to NSE)
        """
        try:
            # Google Finance format: /quote/SYMBOL:EXCHANGE
            # e.g., /quote/RELIANCE:NSE
            ticker = symbol.replace('.NS', '') # Clean yahoo suffix if present
            
            # Run blocking request in executor
            loop = asyncio.get_event_loop()
            price = await loop.run_in_executor(None, self._scrape_price, ticker)
            return price
        except Exception as e:
            logger.error(f"GoogleFinance Error for {symbol}: {e}")
            return 0.0

    def _scrape_price(self, ticker: str) -> float:
        try:
            url = f"{self.base_url}/{ticker}:NSE"
            resp = requests.get(url, headers=self._get_headers(), timeout=5)
            
            if resp.status_code != 200:
                return 0.0
                
            soup = BeautifulSoup(resp.text, 'lxml')
            
            # The class name for price in Google Finance often changes, but usually it's in a specific meta structure or 'YMlKec fxKbKc'
            # Robust strategy: Look for the big price text
            # Currently class 'YMlKec fxKbKc' is common for the main price
            
            price_div = soup.find("div", {"class": "YMlKec fxKbKc"})
            if price_div:
                price_text = price_div.text.replace('₹', '').replace(',', '').strip()
                return float(price_text)
                
            return 0.0
        except Exception as e:
            logger.debug(f"Scrape failed: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        # Minimal implementation for now
        price = await self.get_latest_price(symbol)
        return {"price": price, "source": "GoogleFinance"}

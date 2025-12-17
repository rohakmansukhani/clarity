from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class ScreenerProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://www.screener.in/company"
        
    @property
    def source_name(self) -> str:
        return "Screener.in"
        
    def _get_headers(self):
        return {
            "User-Agent": self.ua.random
        }

    async def get_latest_price(self, symbol: str) -> float:
        # Screener is better for details, but can parse price too
        details = await self.get_stock_details(symbol)
        return float(details.get("current_price", 0.0))

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetches fundamentals like Market Cap, P/E, ROE from Screener.in
        """
        try:
            ticker = symbol.replace('.NS', '')
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._scrape_details, ticker)
        except Exception as e:
            logger.error(f"Screener Error for {symbol}: {e}")
            return {}

    def _scrape_details(self, ticker: str) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}/{ticker}/" # consolidating? normally /company/TICKER/
            resp = requests.get(url, headers=self._get_headers(), timeout=5)
            
            if resp.status_code != 200:
                # Try consolidated
                url = f"{self.base_url}/{ticker}/consolidated/"
                resp = requests.get(url, headers=self._get_headers(), timeout=5)
                if resp.status_code != 200:
                    return {}

            soup = BeautifulSoup(resp.text, 'lxml')
            
            # Parse Top Ratios
            # ul id="top-ratios" -> li -> span name, span value
            ratios = {}
            top_ratios = soup.find("ul", {"id": "top-ratios"})
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_span = li.find("span", {"class": "name"})
                    val_span = li.find("span", {"class": "value"})
                    if name_span and val_span:
                        key = name_span.text.strip().lower().replace(" ", "_")
                        val = val_span.text.replace(',', '').strip()
                        try:
                            ratios[key] = float(val)
                        except:
                            ratios[key] = val
                            
                            ratios[key] = val
                            
            # Normalize Keys for Frontend
            if "stock_p/e" in ratios:
                ratios["pe_ratio"] = ratios["stock_p/e"]
            if "high_/_low" in ratios:
                hl = str(ratios["high_/_low"]).split("/")
                if len(hl) == 2:
                    try:
                        ratios["high_52w"] = float(hl[0].strip().replace(",", ""))
                        ratios["low_52w"] = float(hl[1].strip().replace(",", ""))
                    except:
                        pass
            
            return ratios
        except Exception as e:
            logger.error(f"Screener scrape failed: {e}")
            return {}

from typing import Dict, Any, List
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class MoneyControlProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        # Search URL to find the specific company page is complex
        # For MVP we might need a mapping or just search logic.
        # But for 'News', we can try the generic search or symbol specific if known.
        # Fallback to Google News is easier? 
        # Let's try to scrape specific MC page if we can map Symbol -> Slug.
        # Since mapping is hard without a DB, we will implement a Google News RSS fallback 
        # which is robust for any symbol.
        self.base_url = "https://news.google.com/rss/search"

    @property
    def source_name(self) -> str:
        return "News_Aggregator"

    async def get_latest_price(self, symbol: str) -> float:
        return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        # Returns news
        return {"news": await self.get_news(symbol)}

    async def get_news(self, symbol: str) -> List[Dict[str, str]]:
        try:
            ticker = symbol.replace('.NS', '')
            query = f"{ticker} share price news india"
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._fetch_rss, query)
        except Exception as e:
            logger.error(f"News Error: {e}")
            return []

    def _fetch_rss(self, query: str) -> List[Dict[str, str]]:
        try:
            params = {"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"}
            resp = requests.get(self.base_url, params=params, timeout=5)
            soup = BeautifulSoup(resp.content, "xml")
            
            items = soup.find_all("item", limit=5)
            news = []
            for item in items:
                news.append({
                    "title": item.title.text,
                    "link": item.link.text,
                    "pubDate": item.pubDate.text,
                    "source": item.source.text if item.source else "Google News"
                })
            return news
        except Exception as e:
            logger.error(f"RSS Parse Error: {e}")
            return []

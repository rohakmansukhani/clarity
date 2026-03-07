from typing import Dict, Any, List, Optional
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

# Cutoff: only show news published within this many days
NEWS_RECENCY_DAYS = 90  # ~3 months

class MoneyControlProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://news.google.com/rss/search"

    @property
    def source_name(self) -> str:
        return "News_Aggregator"

    async def get_latest_price(self, symbol: str) -> float:
        return 0.0

    async def get_stock_details(self, symbol: str, company_name: str = None) -> Dict[str, Any]:
        return {"news": await self.get_news(symbol, company_name)}

    async def get_news(self, symbol: str, company_name: str = None) -> List[Dict[str, str]]:
        try:
            ticker = symbol.replace('.NS', '').replace('.BO', '').strip().upper()

            # Build relevance keywords from ticker and company name
            keywords = self._build_keywords(ticker, company_name)

            # Use company name if provided (much more accurate than raw ticker)
            if company_name and company_name.upper() != ticker and len(company_name) > 3:
                search_name = (company_name
                               .replace(' Ltd.', '').replace(' Limited', '')
                               .replace(' NSE', '').replace(' ETF', '').strip())
                query = f'"{search_name}" stock NSE India'
            else:
                # Quote the ticker to force exact match (prevents GOLDCASE → gold + case)
                query = f'"{ticker}" NSE stock India'

            loop = asyncio.get_event_loop()
            raw_news = await loop.run_in_executor(None, self._fetch_rss, query)

            # Apply relevance + recency filters
            return self._filter_news(raw_news, keywords)

        except Exception as e:
            logger.error(f"News Error: {e}")
            return []

    def _build_keywords(self, ticker: str, company_name: Optional[str]) -> List[str]:
        """Build a set of keywords that a relevant article title should contain."""
        keywords = [ticker.lower()]
        if company_name:
            # Add each meaningful word from company name (length > 3 to skip 'and', 'the', etc.)
            for word in company_name.lower().split():
                if len(word) > 3 and word not in {'limited', 'india', 'stock', 'fund', 'house', 'asset'}:
                    keywords.append(word)
        return keywords

    def _is_recent(self, pub_date_str: str) -> bool:
        """Return True if the article was published within NEWS_RECENCY_DAYS days."""
        try:
            pub_dt = parsedate_to_datetime(pub_date_str)
            cutoff = datetime.now(pub_dt.tzinfo) - timedelta(days=NEWS_RECENCY_DAYS)
            return pub_dt >= cutoff
        except Exception:
            # If we can't parse the date, include the article conservatively
            return True

    def _is_relevant(self, title: str, keywords: List[str]) -> bool:
        """Return True if the article title contains at least one of the keywords."""
        title_lower = title.lower()
        return any(kw in title_lower for kw in keywords)

    def _filter_news(self, news: List[Dict[str, str]], keywords: List[str]) -> List[Dict[str, str]]:
        """Keep only articles that are recent AND relevant to the stock/ETF."""
        filtered = []
        for item in news:
            title = item.get('title', '')
            pub_date = item.get('pubDate', '')
            if self._is_recent(pub_date) and self._is_relevant(title, keywords):
                filtered.append(item)
        return filtered

    def _fetch_rss(self, query: str) -> List[Dict[str, str]]:
        try:
            params = {"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"}
            resp = requests.get(self.base_url, params=params, timeout=5)
            soup = BeautifulSoup(resp.content, "xml")

            # Fetch more items so we have room for filtering
            items = soup.find_all("item", limit=15)
            news = []
            for item in items:
                news.append({
                    "title": item.title.text,
                    "link": item.link.text,
                    "pubDate": item.pubDate.text if item.pubDate else "",
                    "source": item.source.text if item.source else "Google News"
                })
            return news
        except Exception as e:
            logger.error(f"RSS Parse Error: {e}")
            return []

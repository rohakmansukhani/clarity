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
        # Import NewsAnalyzer for sentiment classification
        from app.services.analysis.news_analyzer import NewsAnalyzer
        self.news_analyzer = NewsAnalyzer()

    @property
    def source_name(self) -> str:
        return "News_Aggregator"

    async def get_latest_price(self, symbol: str) -> float:
        return 0.0

    async def get_stock_details(self, symbol: str, company_name: str = None) -> Dict[str, Any]:
        return {"news": await self.get_news(symbol, company_name)}

    def _build_keywords(self, ticker: str, company_name: str = None) -> Dict[str, Any]:
        """Build relevance keywords from ticker and company name."""
        # List of generic/ambiguous tickers that need strict matching
        generic_tickers = {
            'gold', 'silver', 'copper', 'wheat', 'cotton', 'sugar', 'crude',
            'it', 'lt', 'bank', 'pharma', 'auto', 'fmcg', 'realty', 'metal'
        }

        result = {
            "ticker": ticker.lower(),
            "company_words": [],
            "is_etf": False,
            "is_commodity": False,
            "is_generic_ticker": ticker.lower() in generic_tickers,
            "full_company_name": company_name.lower() if company_name else None
        }

        if company_name:
            company_lower = company_name.lower()
            # Check if it's an ETF
            result["is_etf"] = 'etf' in company_lower
            # Check if it's a commodity (gold, silver, etc.)
            result["is_commodity"] = any(commodity in company_lower for commodity in generic_tickers)

            # Extract meaningful words with stricter filtering
            words = []
            # Common filler words to exclude (expanded list)
            exclude_words = {
                'limited', 'india', 'stock', 'fund', 'house', 'asset', 'ltd',
                'the', 'and', 'of', 'for', 'with', 'from', 'company', 'group',
                'corporation', 'corp', 'inc', 'pvt', 'private', 'public'
            }

            for word in company_lower.split():
                # Only include words > 3 chars (stricter than before) and not in exclude list
                if len(word) > 3 and word not in exclude_words:
                    words.append(word)
            result["company_words"] = words

        return result

    async def get_news(self, symbol: str, company_name: str = None) -> List[Dict[str, str]]:
        try:
            ticker = symbol.replace('.NS', '').replace('.BO', '').strip().upper()

            # Build relevance keywords from ticker and company name
            keywords = self._build_keywords(ticker, company_name)

            # Build search query based on ticker type and company name
            if company_name and company_name.upper() != ticker and len(company_name) > 3:
                # For ETFs, keep "ETF" in the query for better context
                if keywords.get("is_etf"):
                    search_name = (company_name
                                   .replace(' Ltd.', '').replace(' Limited', '')
                                   .replace(' NSE', '').strip())
                    # Add "stock market" to ensure financial context
                    query = f'"{search_name}" stock market NSE India'
                # For generic/commodity tickers, be very specific
                elif keywords.get("is_generic_ticker") or keywords.get("is_commodity"):
                    search_name = (company_name
                                   .replace(' Ltd.', '').replace(' Limited', '')
                                   .replace(' NSE', '').replace(' ETF', '').strip())
                    # Add "stock price" to force financial context
                    query = f'"{search_name}" stock price NSE India'
                else:
                    search_name = (company_name
                                   .replace(' Ltd.', '').replace(' Limited', '')
                                   .replace(' NSE', '').replace(' ETF', '').strip())
                    query = f'"{search_name}" stock NSE India'
            else:
                # Quote the ticker to force exact match
                if keywords.get("is_etf"):
                    query = f'"{ticker}" ETF stock NSE India'
                elif keywords.get("is_generic_ticker") or keywords.get("is_commodity"):
                    # For generic tickers, add "stock price" for financial context
                    query = f'"{ticker}" stock price NSE India'
                else:
                    query = f'"{ticker}" NSE stock India'

            loop = asyncio.get_event_loop()
            raw_news = await loop.run_in_executor(None, self._fetch_rss, query)

            # Apply relevance + recency filters
            filtered_news = self._filter_news(raw_news, keywords)

            # Add sentiment analysis to each news item
            if filtered_news:
                filtered_news = self.news_analyzer.analyze_news_items(filtered_news)

            return filtered_news

        except Exception as e:
            logger.error(f"News Error: {e}")
            return []

    def _is_recent(self, pub_date_str: str) -> bool:
        """Return True if the article was published within NEWS_RECENCY_DAYS days."""
        try:
            pub_dt = parsedate_to_datetime(pub_date_str)
            cutoff = datetime.now(pub_dt.tzinfo) - timedelta(days=NEWS_RECENCY_DAYS)
            return pub_dt >= cutoff
        except Exception:
            # If we can't parse the date, include the article conservatively
            return True

    def _is_relevant(self, title: str, rules: Dict[str, Any]) -> bool:
        """Return True if the article title strictly matches the ticker or company name."""
        import re

        title_lower = title.lower()

        # CRITICAL: Reject news about non-financial topics
        # This prevents false matches across multiple categories
        irrelevant_keywords = [
            # Legal/Criminal
            'criminal', 'crime', 'court', 'judge', 'lawsuit', 'arrest', 'police',
            'murder', 'theft', 'robbery', 'fraud case', 'scam case', 'cheating case',
            'accused', 'convicted', 'prison', 'jail', 'bail', 'investigation case',
            'fir filed', 'chargesheet', 'trial', 'verdict', 'sentence',
            # Entertainment/Celebrity
            'bollywood', 'celebrity', 'movie', 'film', 'actor', 'actress', 'director',
            'award', 'concert', 'music', 'singer', 'album', 'celebrity',
            # Sports
            'cricket', 'football', 'sports', 'player', 'match', 'tournament',
            'stadium', 'team', 'coach', 'olympics', 'medal', 'championship',
            # Politics (unless financial impact)
            'election', 'political party', 'minister visits', 'parliament session',
            'rally', 'campaign', 'voting',
            # Medical/Health (unless healthcare company)
            'disease outbreak', 'vaccine drive', 'doctor', 'patient care', 'hospital bed',
            'treatment', 'symptoms', 'diagnosis',
            # Weather/Disasters
            'earthquake', 'flood', 'cyclone', 'weather', 'disaster', 'tsunami',
            # General non-finance
            'recipe', 'cooking', 'festival', 'temple', 'religious', 'astrology',
            'horoscope', 'education board', 'examination', 'admission'
        ]

        # If title contains any irrelevant keyword, immediately reject
        if any(keyword in title_lower for keyword in irrelevant_keywords):
            return False

        # Financial context keywords - categorized by strength
        # STRONG indicators (direct stock market terminology)
        strong_financial_keywords = [
            'nse', 'bse', 'stock exchange', 'sensex', 'nifty', 'ticker',
            'shares trade', 'equity', 'market cap', 'pe ratio', 'eps',
            'dividend yield', 'stock price', 'share price', 'block deal',
            'bulk deal', 'delivery', 'intraday', 'futures', 'options',
            'demat', 'trading volume', 'circuit', '52-week high', '52-week low'
        ]

        # MEDIUM indicators (financial but could be generic)
        medium_financial_keywords = [
            'stock', 'share', 'etf', 'fund', 'trading', 'investor',
            'investment', 'ipo', 'listing', 'rally', 'surge', 'plunge',
            'nav', 'aum', 'portfolio', 'mutual fund', 'index fund'
        ]

        # WEAK indicators (too generic, need additional context)
        weak_financial_keywords = [
            'market', 'price', 'buy', 'sell', 'gain', 'loss',
            'profit', 'revenue', 'earnings', 'quarter', 'crore', 'lakh'
        ]

        # Calculate financial context strength
        has_strong_context = any(keyword in title_lower for keyword in strong_financial_keywords)
        has_medium_context = any(keyword in title_lower for keyword in medium_financial_keywords)
        has_weak_context = any(keyword in title_lower for keyword in weak_financial_keywords)

        # Generic/commodity tickers need STRONG financial context
        if rules.get("is_generic_ticker") or rules.get("is_commodity"):
            has_financial_context = has_strong_context
        else:
            # Regular stocks: medium or strong context is fine
            has_financial_context = has_strong_context or has_medium_context

        # 1. Exact ticker match with WORD BOUNDARIES (prevents "goldcase" matching "gold" + "case")
        # Use regex word boundary \b to ensure complete word match
        ticker_pattern = r'\b' + re.escape(rules["ticker"]) + r'\b'
        if re.search(ticker_pattern, title_lower):
            # If ticker found, it MUST have financial context
            return has_financial_context

        # 2. Strong company name match (all important words must be present)
        # e.g. for "Zerodha Gold ETF", require "zerodha" AND "gold" AND ("etf" OR financial context)
        words = rules["company_words"]
        if words and len(words) >= 2:
            # All words must be present
            if all(word in title_lower for word in words):
                # For ETFs, be extra strict - title should contain "etf" or "fund"
                if rules.get("is_etf"):
                    # ETF must have explicit ETF/fund mention OR strong financial context
                    if 'etf' in title_lower or 'fund' in title_lower:
                        return has_strong_context or has_medium_context
                    elif has_strong_context:
                        # Strong context alone is acceptable for ETFs
                        return True
                    else:
                        return False
                # For commodities, require strong context
                elif rules.get("is_commodity"):
                    return has_strong_context
                else:
                    # Regular companies: must have financial context
                    return has_financial_context

        # 2.5. Single meaningful word match (for unique company names)
        # Only if it's a distinctive word (not generic) and has strong financial context
        elif words and len(words) == 1:
            word = words[0]
            # Word must be at least 5 characters and not a generic term
            if len(word) >= 5 and word in title_lower:
                # Single word needs STRONG financial context
                return has_strong_context

        # 3. Full company name substring match (for exact matches like "Zerodha Gold ETF")
        # This catches cases where the full name appears but may be slightly modified
        if rules.get("full_company_name"):
            full_name = rules["full_company_name"]
            # Remove common suffixes for matching
            clean_name = full_name.replace(' etf', '').replace(' ltd', '').replace(' limited', '').strip()

            # Check if a significant portion of the company name appears
            if len(clean_name) > 5 and clean_name in title_lower:
                return has_financial_context

        return False

    def _filter_news(self, news: List[Dict[str, str]], rules: Dict[str, Any]) -> List[Dict[str, str]]:
        """Keep only articles that are recent AND relevant to the stock/ETF."""
        filtered = []
        for item in news:
            title = item.get('title', '')
            description = item.get('description', '')
            pub_date = item.get('pubDate', '')

            # Check title first
            title_relevant = self._is_relevant(title, rules)

            # For stricter filtering, also check description if available
            # If title is borderline, description can provide additional context
            if title_relevant and description and rules.get("is_generic_ticker"):
                # For generic tickers, verify description also seems relevant
                desc_relevant = self._is_relevant(description, rules)
                if not desc_relevant:
                    # Title matched but description doesn't - likely false positive
                    continue

            if self._is_recent(pub_date) and title_relevant:
                # Format the date for frontend display
                try:
                    pub_dt = parsedate_to_datetime(pub_date)
                    now = datetime.now(pub_dt.tzinfo)
                    diff = now - pub_dt

                    # Format based on age
                    if diff.days == 0:
                        if diff.seconds < 3600:
                            item['time'] = f"{diff.seconds // 60}m ago"
                        else:
                            item['time'] = f"{diff.seconds // 3600}h ago"
                    elif diff.days == 1:
                        item['time'] = "Yesterday"
                    elif diff.days < 7:
                        item['time'] = f"{diff.days}d ago"
                    else:
                        item['time'] = pub_dt.strftime("%b %d, %Y")
                except Exception:
                    item['time'] = pub_date

                filtered.append(item)
        return filtered

    def _fetch_rss(self, query: str) -> List[Dict[str, str]]:
        try:
            params = {"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"}
            resp = requests.get(self.base_url, params=params, timeout=5)
            soup = BeautifulSoup(resp.content, "xml")

            # Fetch more items so we have room for filtering
            items = soup.find_all("item", limit=20)
            news = []
            for item in items:
                # Extract description/summary from RSS
                description = ""
                if item.description:
                    desc_text = item.description.text
                    # Clean HTML tags from description
                    from bs4 import BeautifulSoup as BS
                    description = BS(desc_text, "html.parser").get_text(strip=True)
                    # Limit description length
                    if len(description) > 200:
                        description = description[:197] + "..."

                news.append({
                    "title": item.title.text,
                    "link": item.link.text,
                    "pubDate": item.pubDate.text if item.pubDate else "",
                    "source": item.source.text if item.source else "Google News",
                    "description": description
                })
            return news
        except Exception as e:
            logger.error(f"RSS Parse Error: {e}")
            return []

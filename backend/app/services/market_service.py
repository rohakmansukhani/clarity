import asyncio
from typing import Dict, Any, List
from app.services.consensus_engine import ConsensusEngine
from app.services.providers.screener_service import ScreenerProvider
from app.services.providers.moneycontrol_service import MoneyControlProvider
from app.services.providers.yahoo_service import YahooProvider
from app.core.cache import cache
import logging
from nselib import capital_market
from app.utils.formatters import format_inr, format_percent

logger = logging.getLogger(__name__)

class MarketService:
    """
    Market Service
    
    A unified service that aggregates data from multiple providers to offer a 
    '360-degree view' of the market.
    
    Responsibilities:
    1. Aggregation: Combines Price (Consensus), Fundamentals (Screener), and News (Google).
    2. Search: Provides fuzzy search over NSE equity list.
    3. History: Fetches OHLCV data for charting.
    4. Market Intelligence: Tracks indices (Nifty/Sensex) and Sector performance.
    
    Caching:
    - Uses Redis (@cache) heavily to improve performance and reduce upstream API calls.
    """
    def __init__(self):
        self.consensus = ConsensusEngine()
        self.screener = ScreenerProvider()
        self.news_provider = MoneyControlProvider()
        self.yahoo = YahooProvider()

    @cache(expire=300, key_prefix="stock_details")
    async def get_aggregated_details(self, symbol: str) -> Dict[str, Any]:
        """
        Aggregates Price, Fundamentals, and News for a given symbol.
        """
        symbol = symbol.upper()
        
        # Parallel Execution
        # 1. Consensus Price (Fast)
        # 2. Fundamentals (Screener - Moderate)
        # 3. News (Google RSS - Moderate)
        
        task_price = self.consensus.get_consensus_price(symbol)
        task_fundamentals = self.screener.get_stock_details(symbol)
        task_news = self.news_provider.get_stock_details(symbol) # Returns {'news': []}
        
        results = await asyncio.gather(task_price, task_fundamentals, task_news, return_exceptions=True)
        
        price_data = results[0] if not isinstance(results[0], Exception) else {"price": 0.0}
        fund_data = results[1] if not isinstance(results[1], Exception) else {}
        news_data = results[2] if not isinstance(results[2], Exception) else {"news": []}
        
        return {
            "symbol": symbol,
            "market_data": {
                **price_data,
                "price_formatted": format_inr(price_data.get("price", 0.0))
            },
            "fundamentals": fund_data,
            "news": news_data.get("news", [])
        }

    @cache(expire=86400, key_prefix="stock_master_list")
    async def get_all_symbols(self) -> List[Dict[str, str]]:
        """
        Fetches list of all NSE securities. Cached for 24 hours.
        """
        try:
            # Blocking call
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, capital_market.equity_list)
            
            # DF columns: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, FACE VALUE
            symbols = []
            if df is not None:
                # Filter for EQ series only? Or all? -> EQ + BE
                # For now take all, maybe top 2000?
                # Let's map to simple list
                for _, row in df.iterrows():
                    symbols.append({
                        "symbol": row['SYMBOL'],
                        "name": row['NAME OF COMPANY']
                    })
            return symbols
        except Exception as e:
            logger.error(f"Error fetching stock list: {e}")
            return []

    async def search_stocks(self, query: str) -> List[Dict[str, str]]:
        """
        Fuzzy search on cached stock list.
        """
        all_stocks = await self.get_all_symbols()
        query = query.upper()
        
        # Simple containment search
        # Rank by: Starts with Symbol > Starts with Name > Contains Symbol
        
        matches = []
        for s in all_stocks:
            sym = s['symbol']
            name = s['name'].upper()
            
            score = 0
            if sym == query: score = 100
            elif sym.startswith(query): score = 80
            elif name.startswith(query): score = 60
            elif query in sym: score = 40
            elif query in name: score = 20
            
            if score > 0:
                s_copy = s.copy()
                s_copy['score'] = score
                matches.append(s_copy)
                
        # Sort by score desc, limit 10
        matches.sort(key=lambda x: x['score'], reverse=True)
        return matches[:10]

    @cache(expire=3600, key_prefix="history")
    async def get_history(self, symbol: str, period: str = "1mo") -> Dict[str, Any]:
        """
        Delegates to Yahoo for history.
        """
        # YahooProvider needs a get_history method?
        # currently logic is in YahooService, but base interface doesn't enforce history.
        # We can implement it here or add to YahooProvider.
        # Let's use YahooProvider if we add the method, or just direct yfinance call here.
        # Direct yfinance here is fine for the service layer.
        import yfinance as yf
        
        def _fetch():
            ticker = symbol.replace(".NS", "") + ".NS"
            dat = yf.Ticker(ticker)
            hist = dat.history(period=period)
            # Convert to list of dicts
            hist.reset_index(inplace=True)
            # Date to str
            res = []
            for _, row in hist.iterrows():
                res.append({
                    "date": row['Date'].isoformat(),
                    "open": row['Open'],
                    "high": row['High'],
                    "low": row['Low'],
                    "close": row['Close'],
                    "volume": row['Volume']
                })
            return res

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

    @cache(expire=60, key_prefix="market_status")
    async def get_market_status(self) -> List[Dict[str, Any]]:
        """
        Fetches status of major indices (Nifty 50, Sensex).
        """
        import yfinance as yf
        
        indices = {
            "NIFTY 50": "^NSEI",
            "SENSEX": "^BSESN",
            "NIFTY BANK": "^NSEBANK"
        }
        
        def _fetch_indices():
            result = []
            for name, ticker in indices.items():
                try:
                    stock = yf.Ticker(ticker)
                    
                    # Use history for reliable data
                    hist = stock.history(period="1d")
                    if hist.empty:
                        result.append({"index": name, "error": "No data"})
                        continue
                    
                    current_price = hist['Close'].iloc[-1]
                    
                    # Get previous close from info
                    info = stock.info
                    prev_close = info.get('previousClose', info.get('regularMarketPreviousClose', current_price))
                    
                    change = current_price - prev_close
                    pct_change = (change / prev_close * 100) if prev_close > 0 else 0
                    
                    # Market state
                    market_state = info.get('marketState', 'CLOSED')
                    is_open = market_state in ['REGULAR', 'PRE', 'POST']
                    
                    result.append({
                        "index": name,
                        "current": round(current_price, 2),
                        "current_formatted": format_inr(current_price),
                        "change": round(change, 2),
                        "change_formatted": format_inr(change),
                        "percent_change": round(pct_change, 2),
                        "percent_change_formatted": format_percent(pct_change),
                        "status": "OPEN" if is_open else "CLOSED"
                    })
                except Exception as e:
                    logger.error(f"Error fetching {name}: {e}")
                    result.append({"index": name, "error": "Data Unavailable"})
            
            return result
    
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch_indices)

    @cache(expire=300, key_prefix="market_sectors")
    async def get_sector_performance(self) -> List[Dict[str, Any]]:
        """
        Fetches performance of major sectors.
        """
        import yfinance as yf
        
        # Yahoo tickers for NSE Sectors
        sectors = {
            "NIFTY IT": "^CNXIT",
            "NIFTY AUTO": "^CNXAUTO",
            "NIFTY PHARMA": "^CNXPHARMA",
            "NIFTY FMCG": "^CNXFMCG",
            "NIFTY METAL": "^CNXMETAL",
            "NIFTY REALTY": "^CNXREALTY",
            "NIFTY ENERGY": "^CNXENERGY",
            "NIFTY PSU BANK": "^CNXPSUBANK"
        }
        
        def _fetch_sectors():
            data = yf.Tickers(" ".join(sectors.values()))
            result = []
            for name, ticker in sectors.items():
                try:
                    info = data.tickers[ticker].fast_info
                    last_price = info.last_price
                    prev_close = info.previous_close
                    pct_change = ((last_price - prev_close) / prev_close) * 100
                    
                    result.append({
                        "sector": name,
                        "current": round(last_price, 2),
                        "percent_change": round(pct_change, 2)
                    })
                except:
                   continue
            
            # Sort by performance
            result.sort(key=lambda x: x['percent_change'], reverse=True)
            return result

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch_sectors)

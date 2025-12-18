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
from app.services.analysis.technical_analyzer import TechnicalAnalyzer
from app.services.analysis.fundamental_analyzer import FundamentalAnalyzer
from app.services.analysis.news_analyzer import NewsAnalyzer

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
        # NEW: Analysis engines
        self.technical_analyzer = TechnicalAnalyzer()
        self.fundamental_analyzer = FundamentalAnalyzer()
        self.news_analyzer = NewsAnalyzer()

    @cache(expire=300, key_prefix="stock_details")
    async def get_aggregated_details(self, symbol: str) -> Dict[str, Any]:
        """
        Aggregates Price, Fundamentals, and News for a given symbol.
        """
        symbol = symbol.upper()
        
        # Global Symbol Mapping (Nickname -> Official NSE Symbol)
        # This ensures NSELib, Screener, and Yahoo all get the correct primary ticker.
        mapping = {
            "RIL": "RELIANCE",
            "RELIANCE": "RELIANCE",
            "TCS": "TCS",
            "INFY": "INFY",
            "HDFCBANK": "HDFCBANK",
            "SBIN": "SBIN",
            "ICICIBANK": "ICICIBANK",
            "BHARTIARTL": "BHARTIARTL",
            "ITC": "ITC",
            "BAJFINANCE": "BAJFINANCE",
            "KOTAKBANK": "KOTAKBANK"
        }
        
        # If symbol matches a known nickname, use the official one
        clean_input = symbol.replace(".NS", "")
        if clean_input in mapping:
            symbol = mapping[clean_input]
        
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
        
        # Extract rich info from Consensus Details (if available)
        rich_details = price_data.get('details', {})
        
        # Normalize fields (NSE vs Yahoo keys)
        change = rich_details.get('Change') or rich_details.get('regularMarketChange') or 0.0
        p_change = rich_details.get('pChange') or rich_details.get('regularMarketChangePercent') or 0.0
        
        # Ensure floats
        try:
             change = round(float(str(change).replace(',', '')), 2)
             p_change = round(float(str(p_change).replace(',', '')), 2)
        except:
             change = 0.0
             p_change = 0.0

        return {
            "symbol": symbol,
            "market_data": {
                **price_data,
                "change": change,
                "pChange": p_change,
                "changePercent": p_change, # Fix for frontend (0%) issue
                "open": rich_details.get('Open') or rich_details.get('regularMarketOpen'),
                "high": rich_details.get('dayHigh') or rich_details.get('dayLow') or rich_details.get('regularMarketDayHigh'), # NSE uses dayHigh
                "low": rich_details.get('dayLow') or rich_details.get('regularMarketDayLow'),
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
            
            # Smart resolve handled globally now, but ensure we use correct symbol
            clean_sym = symbol.replace(".NS", "").upper()
            ticker = f"{clean_sym}.NS"
            
            dat = yf.Ticker(ticker)
            hist = dat.history(period=period)
            
            if hist.empty and period == "1y":
                 # Retry with shorter period if 1y fails or maybe ticker is wrong?
                 # But hist.empty usually means wrong ticker or no data.
                 logger.warning(f"History empty for {ticker}")
                 
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

    @cache(expire=300, key_prefix="top_movers_v2")
    async def get_top_movers(self) -> List[Dict[str, Any]]:
        """
        Fetches Top Gainers and Losers (Calculated via Yahoo Finance).
        """
        import yfinance as yf
        
        # Major Nifty 50 Stocks for fast movers calculation
        # Fetching all 50 might be slow, so we take the top weighted ones (~15)
        # This provides a good approximation for "Top Movers" widget
        tickers_list = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", 
            "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "ULTRACEMCO.NS",
            "SUNPHARMA.NS", "TITAN.NS", "TATAMOTORS.NS"
        ]
        
        def _fetch():
            try:
                # Batch fetch is faster
                data = yf.Tickers(" ".join(tickers_list))
                
                movers = []
                for ticker_symbol in tickers_list:
                    try:
                        # Access via data.tickers[ticker_symbol]
                        # fast_info is fastest for current price and prev close
                        info = data.tickers[ticker_symbol].fast_info
                        
                        last = info.last_price
                        prev = info.previous_close
                        
                        if prev == 0: continue
                        
                        change_amt = last - prev
                        change_pct = ((last - prev) / prev) * 100
                        
                        movers.append({
                            "symbol": ticker_symbol.replace(".NS", ""),
                            "price": format_inr(last),
                            "change": f"{change_pct:+.2f}%",
                            "change_val": change_pct,
                            "isUp": change_pct >= 0
                        })
                    except Exception as e:
                        continue
                
                # Sort by change_pct
                movers.sort(key=lambda x: x['change_val'], reverse=True)
                
                # Top 3 Gainers
                top_gainers = movers[:3]
                
                # Top 2 Losers (from end)
                top_losers = movers[-2:]
                top_losers.reverse() # Show worst first? Or just list them.
                
                # Combine
                # Ensure we only return if we have data
                if not movers:
                     return []
                     
                return top_gainers + top_losers
                
            except Exception as e:
                logger.error(f"Top Movers Calc Error: {e}")
                return []
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

    @cache(expire=300, key_prefix="stock_analysis_full")
    async def get_comprehensive_analysis(self, symbol: str) -> Dict[str, Any]:
        """
        Full 360-degree analysis: Technical + Fundamental + News + Scores.
        This is the MAIN function called by AI for recommendations.
        """
        try:
            # 1. Get base data with Yahoo fallback for fundamentals
            base_data = await self.get_aggregated_details(symbol)
            if not base_data:
                return {"error": "Stock not found"}
                
            fundamentals = base_data.get('fundamentals', {})
            if not fundamentals:
                 logger.info(f"Screener fundamentals failed for {symbol}, trying Yahoo")
                 fundamentals = await self.yahoo.get_stock_details(symbol)
                 base_data['fundamentals'] = fundamentals # Update base_data with Yahoo data
            
            history = await self.get_history(symbol, period="1y")
            
            # 2. Run all analyzers
            technical = self.technical_analyzer.analyze(history)
            fundamental = self.fundamental_analyzer.analyze(fundamentals)
            news = self.news_analyzer.analyze(base_data.get('news', []))
            
            # 3. Calculate scores
            from app.services.scoring.stability_scorer import StabilityScoreEngine
            from app.services.scoring.timing_scorer import TimingScoreEngine
            from app.services.scoring.risk_profiler import RiskProfileEngine
            
            market_data_for_scoring = {
                "history": history,
                "fundamentals": fundamentals # Use the potentially updated fundamentals
            }
            
            stability = StabilityScoreEngine().calculate_score(symbol, market_data_for_scoring)
            timing = TimingScoreEngine().calculate_score(symbol, market_data_for_scoring)
            risk = RiskProfileEngine().calculate_risk(symbol, market_data_for_scoring)
            
            # 4. Generate recommendation
            recommendation = self._generate_recommendation(stability, timing, risk, fundamental)
            
            return {
                "symbol": symbol,
                "price": base_data.get("market_data", {}).get("price_formatted"),
                "price_raw": base_data.get("market_data", {}).get("price"),
                "recommendation": recommendation,
                "scores": {
                    "stability": stability,
                    "timing": timing,
                    "risk": risk
                },
                "analysis": {
                    "technical": technical,
                    "fundamental": fundamental,
                    "news": news
                },
                "raw_data": {
                    "fundamentals": base_data.get("fundamentals", {}),
                    "news_items": base_data.get("news", [])[:5]
                }
            }
            
        except Exception as e:
            logger.error(f"Comprehensive Analysis Error for {symbol}: {e}")
            return {"error": str(e)}

    def _generate_recommendation(self, stability, timing, risk, fundamental) -> Dict[str, Any]:
        """
        Generate final BUY/HOLD/SELL recommendation based on all scores.
        """
        stability_score = stability.get('score', 0)
        timing_score = timing.get('score', 0)
        timing_signal = timing.get('signal', 'NEUTRAL')
        risk_score = risk.get('risk_score', 50)
        fund_health = fundamental.get('health_score', 50)
        
        # Composite Score (weighted)
        composite = (
            stability_score * 0.3 +
            timing_score * 0.3 +
            (100 - risk_score) * 0.2 +  # Lower risk = higher score
            fund_health * 0.2
        )
        
        # Determine Action
        if composite >= 75 and timing_signal == 'BUY':
            action = "STRONG BUY"
            confidence = "HIGH"
            reason = "Excellent fundamentals, perfect entry timing, low risk."
        elif composite >= 65:
            action = "BUY"
            confidence = "MEDIUM"
            reason = "Solid fundamentals with favorable risk-reward."
        elif composite >= 55:
            if timing_signal == 'BUY':
                action = "ACCUMULATE"
                reason = "Good long-term value, consider adding on dips."
            else:
                action = "HOLD"
                reason = "Stable stock, but wait for better momentum to add more."
            confidence = "MEDIUM"
        elif composite >= 40:
            action = "HOLD"
            confidence = "LOW"
            reason = "Mixed signals. If you own it, continue holding; otherwise wait."
        elif composite >= 25:
            action = "REDUCE"
            confidence = "MEDIUM"
            reason = "Weakening fundamentals or trend. Consider trimming position."
        else:
            action = "SELL"
            confidence = "HIGH"
            reason = "Multiple red flags detected. High risk."
        
        return {
            "action": action,
            "confidence": confidence,
            "composite_score": round(composite),
            "reasoning": reason,
            "key_factors": {
                "stability": f"{stability_score}/100",
                "timing": timing_signal,
                "risk": risk.get('risk_level'),
                "fundamentals": fundamental.get('valuation', {}).get('level')
            }
        }
    @cache(expire=3600, key_prefix="price_at_date")
    async def get_price_at_date(self, symbol: str, date: str) -> float:
        """
        Fetches closing price for a specific date.
        """
        import yfinance as yf
        from datetime import datetime, timedelta

        def _fetch():
            try:
                symbol_clean = symbol.replace(".NS", "").upper()
                ticker = f"{symbol_clean}.NS"
                
                # yfinance download expects start (inclusive) and end (exclusive)
                target_date = datetime.strptime(date, "%Y-%m-%d")
                
                # Try fetching [date, date+7] to find the first valid trading day on or after date
                end_window = target_date + timedelta(days=7)
                df = yf.download(ticker, start=date, end=end_window.strftime("%Y-%m-%d"), progress=False)
                
                if df.empty:
                    # Fallback: Try looking BACK 5 days if looking forward failed (maybe simple data gap)
                    start_back = target_date - timedelta(days=5)
                    df = yf.download(ticker, start=start_back.strftime("%Y-%m-%d"), end=target_date.strftime("%Y-%m-%d"), progress=False)
                    if not df.empty:
                         return float(df['Close'].iloc[-1]) # Last available
                    return 0.0
                
                # Return first available close in the forward window
                return float(df['Close'].iloc[0])

            except Exception as e:
                logger.error(f"Error fetching price at date {date} for {symbol}: {e}")
                return 0.0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)
    @cache(expire=86400, key_prefix="listing_date")
    async def get_listing_date(self, symbol: str) -> str:
        """
        Fetches the first trade date (listing date) for a symbol.
        Returns YYYY-MM-DD string or empty string if not found.
        """
        import yfinance as yf
        from datetime import datetime
        
        def _fetch():
            try:
                symbol_clean = symbol.replace(".NS", "").upper()
                ticker = f"{symbol_clean}.NS"
                dat = yf.Ticker(ticker)
                
                # Try getting from metadata
                # firstTradeDateEpochUtc is reliable when available
                epoch = dat.info.get('firstTradeDateEpochUtc')
                if epoch:
                    dt = datetime.fromtimestamp(epoch)
                    return dt.strftime("%Y-%m-%d")
                
                # Fallback: history max (slower but more accurate for old stocks)
                # Note: yfinance historical data may not go back to actual listing date
                # For example, RELIANCE listed on Nov 28, 1995 but yfinance data starts Jan 1, 1996
                hist = dat.history(period="max")
                if not hist.empty:
                    return hist.index[0].strftime("%Y-%m-%d")
                    
                return ""
            except Exception as e:
                logger.error(f"Error fetching listing date for {symbol}: {e}")
                return ""
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)


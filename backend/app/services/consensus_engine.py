import asyncio
import logging
from typing import List, Dict, Any
from app.interfaces.market_data import BaseDataSource
from app.core.cache import cache
from app.services.providers.nselib_service import NSELibProvider
from app.services.providers.yahoo_service import YahooProvider
from app.services.providers.google_finance import GoogleFinanceProvider
from app.services.providers.bse_service import BSEProvider
from app.core.symbol_registry import registry, Exchange
from app.utils.market_hours import get_smart_cache_expiry

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    Consensus Engine
    Responsible for fetching stock prices from multiple sources and arbitrating verify 
    the 'true' price.
    
    Sources:
    1. NSELib: Official NSE data (Scraped/API)
    2. YahooFinance: Reliable global data
    3. GoogleFinance: Fallback for realtime
    """
    def __init__(self):
        # Initialize providers (map by name for easier selection)
        self.nselib_provider = NSELibProvider()
        self.yahoo_provider = YahooProvider()
        self.google_provider = GoogleFinanceProvider()
        self.bse_provider = BSEProvider()
    
    async def get_consensus_price(self, symbol: str, exchange: Exchange = None) -> Dict[str, Any]:
        """
        Fetches full details from all providers and determines consensus price.
        Returns the consensus price AND the details from the primary source.
        
        Cache: 60s during market hours, until next market open when closed
        """
        # Calculate smart cache expiry
        cache_expiry = get_smart_cache_expiry(60)
        
        # Use cache decorator dynamically
        @cache(expire=cache_expiry, key_prefix="consensus")
        async def _fetch_consensus(sym: str):
            return await self._fetch_consensus_internal(sym, exchange)
        
        return await _fetch_consensus(symbol)
    
    async def _fetch_consensus_internal(self, symbol: str, exchange_override: Exchange = None) -> Dict[str, Any]:
        # Auto-detect exchange if not provided
        target_exchange = exchange_override or registry.get_exchange(symbol) or Exchange.NSE
        
        info = registry.resolve(symbol)
        
        providers_to_use = []
        
        if target_exchange == Exchange.BSE or target_exchange == Exchange.BOTH:
             if info and info.bse_scrip:
                 providers_to_use.append((self.bse_provider, info.bse_scrip))
             elif symbol.isdigit():
                 providers_to_use.append((self.bse_provider, symbol))
                 
        if target_exchange == Exchange.NSE or target_exchange == Exchange.BOTH:
             nse_sym = info.nse_symbol if info and info.nse_symbol else symbol
             providers_to_use.append((self.nselib_provider, nse_sym))
             # Add Yahoo/Google as well for NSE (fallback/consensus)
             yahoo_sym = info.symbol if info else symbol
             providers_to_use.append((self.yahoo_provider, yahoo_sym))
             providers_to_use.append((self.google_provider, yahoo_sym))
             
        # Fallback if no providers matched (e.g., unrecognized symbol format and unmapped)
        if not providers_to_use:
             providers_to_use = [
                  (self.nselib_provider, symbol),
                  (self.yahoo_provider, symbol),
                  (self.google_provider, symbol)
             ]

        # Parallel fetch details
        tasks = [p.get_stock_details(sym) for p, sym in providers_to_use]
        details_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Weights for each provider
        weights = {
            "NSE_Lib": 1.0,
            "BSEIndia": 0.9,
            "YahooFinance": 0.8,
            "GoogleFinance": 0.6
        }
        
        weighted_prices = []
        source_map = {}
        valid_details = [] # Tuple of (price, weight, details, provider_name)
        
        for i, res in enumerate(details_list):
            provider_name = providers_to_use[i][0].source_name
            
            if isinstance(res, Exception):
                logger.error(f"{provider_name} failed: {res}")
                continue
            
            if not isinstance(res, dict):
                continue

            # Extract Price based on Provider
            price = 0.0
            if provider_name == "NSE_Lib":
                # Handle possible string format
                p = res.get('LastPrice', 0)
                if isinstance(p, str):
                    price = float(p.replace(',', ''))
                else:
                    price = float(p)
            elif provider_name == "BSEIndia":
                price = float(res.get('LTP', 0.0))
            elif provider_name == "YahooFinance":
                price = res.get('currentPrice') or res.get('regularMarketPrice') or res.get('price', 0.0)
            elif provider_name == "GoogleFinance":
                price = res.get('price', 0.0)
                
            if price > 0:
                weight = weights.get(provider_name, 0.5)
                weighted_prices.append((price, weight, provider_name))
                source_map[provider_name] = price
                valid_details.append({
                    "price": price,
                    "weight": weight,
                    "source": provider_name,
                    "data": res
                })
                
        if not weighted_prices:
            return {"status": "ERROR", "price": 0.0, "message": "No data source available"}
            
        # Weighted average for Price
        total_weight = sum(w for _, w, _ in weighted_prices)
        final_price = sum(p * w for p, w, _ in weighted_prices) / total_weight
        
        # Calculate variance
        prices_only = [p for p, _, _ in weighted_prices]
        min_p = min(prices_only)
        max_p = max(prices_only)
        variance = (max_p - min_p) / min_p if min_p > 0 else 0
        
        # Determine status
        if len(weighted_prices) >= 2:
            if variance < 0.005: status = "VERIFIED"
            elif variance < 0.01: status = "WARNING"
            else: status = "UNSTABLE"
        else:
            status = "SINGLE_SOURCE"

        # Determine Primary Source details to return (highest weight)
        valid_details.sort(key=lambda x: x['weight'], reverse=True)
        primary_data = valid_details[0]['data'] if valid_details else {}
        primary_source_name = valid_details[0]['source'] if valid_details else None

        return {
            "price": round(final_price, 2),
            "status": status,
            "variance_pct": round(variance * 100, 2),
            "sources": source_map,
            "primary_source": primary_source_name,
            "details": primary_data # Return rich data
        }

import asyncio
import logging
from typing import List, Dict, Any
from app.interfaces.market_data import BaseDataSource
from app.core.cache import cache
from app.services.providers.nselib_service import NSELibProvider
from app.services.providers.yahoo_service import YahooProvider
from app.services.providers.google_finance import GoogleFinanceProvider

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
        # Initialize providers
        self.providers: List[BaseDataSource] = [
            NSELibProvider(),
            YahooProvider(),
            GoogleFinanceProvider()
        ]
    
    @cache(expire=60, key_prefix="consensus")
    async def get_consensus_price(self, symbol: str) -> Dict[str, Any]:
        """
        Fetches prices from all providers and determines consensus.
        
        Weighting:
        - NSELib: 1.0 (official, highest weight)
        - YahooFinance: 0.8
        - GoogleFinance: 0.6
        """
        results = []
        # Parallel fetch
        tasks = [p.get_latest_price(symbol) for p in self.providers]
        prices = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Weights for each provider
        weights = {
            "NSE_Lib": 1.0,
            "YahooFinance": 0.8,
            "GoogleFinance": 0.6
        }
        
        weighted_prices = []
        source_map = {}
        
        for i, res in enumerate(prices):
            provider_name = self.providers[i].source_name
            if isinstance(res, Exception):
                logger.error(f"{provider_name} failed: {res}")
                continue
            if isinstance(res, (int, float)) and res > 0:
                weight = weights.get(provider_name, 0.5)
                weighted_prices.append((res, weight, provider_name))
                source_map[provider_name] = res
                
        if not weighted_prices:
            return {"status": "ERROR", "price": 0.0, "message": "No data source available"}
            
        # Weighted average
        total_weight = sum(w for _, w, _ in weighted_prices)
        final_price = sum(p * w for p, w, _ in weighted_prices) / total_weight
        
        # Calculate variance
        prices_only = [p for p, _, _ in weighted_prices]
        min_p = min(prices_only)
        max_p = max(prices_only)
        variance = (max_p - min_p) / min_p if min_p > 0 else 0
        
        # Determine status
        if len(weighted_prices) >= 2:
            if variance < 0.005: # < 0.5% variance
                status = "VERIFIED"
            elif variance < 0.01: # < 1% variance
                status = "WARNING"
            else:
                status = "UNSTABLE"
        else:
            status = "SINGLE_SOURCE"

        return {
            "price": round(final_price, 2),
            "status": status,
            "variance_pct": round(variance * 100, 2),
            "sources": source_map,
            "primary_source": weighted_prices[0][2] if weighted_prices else None
        }

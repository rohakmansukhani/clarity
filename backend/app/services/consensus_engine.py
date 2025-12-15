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
        Fetches prices from all providers in parallel and determines the consensus.
        
        Logic:
        1. Fetch Price from all sources.
        2. Filter out invalid (0.00) or failed requests.
        3. Simple Average if multiple sources agree (Variance < 0.5%).
        4. Return 'VERIFIED' status if high confidence, else 'WARNING' or 'SINGLE_SOURCE'.
        """
        results = []
        # Parallel fetch
        tasks = [p.get_latest_price(symbol) for p in self.providers]
        prices = await asyncio.gather(*tasks, return_exceptions=True)
        
        valid_prices = []
        source_map = {}
        
        for i, res in enumerate(prices):
            provider_name = self.providers[i].source_name
            if isinstance(res, Exception):
                logger.error(f"{provider_name} failed: {res}")
                continue
            if isinstance(res, (int, float)) and res > 0:
                valid_prices.append(res)
                source_map[res] = provider_name
                
        if not valid_prices:
            return {"status": "ERROR", "price": 0.0, "message": "No data source available"}
            
        # Sort prices to easily find Min/Max for variance check
        valid_prices.sort()
        
        # Default Logic: simple average of avail sources
        final_price = sum(valid_prices) / len(valid_prices)
        status = "SINGLE_SOURCE"
        
        if len(valid_prices) >= 2:
            # Check consistency metrics
            min_p = min(valid_prices)
            max_p = max(valid_prices)
            variance = (max_p - min_p) / min_p
            
            if variance < 0.005: # < 0.5% variance (Sources agree)
                status = "VERIFIED"
            elif variance < 0.01: # < 1% variance (Minor diff)
                status = "WARNING"
            else:
                status = "UNSTABLE" # > 1% diff (Sources disagree significantly)
        else:
            status = "SINGLE_SOURCE"

        return {
            "price": round(final_price, 2),
            "status": status,
            "variance_pct": round(((max(valid_prices) - min(valid_prices)) / min(valid_prices) * 100), 2) if len(valid_prices) > 1 else 0,
            "sources": source_map
        }

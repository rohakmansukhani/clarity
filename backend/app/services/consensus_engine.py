```python
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
    def __init__(self):
        # Initialize providers
        self.providers: List[BaseDataSource] = [
            NSELibProvider(),
            YahooProvider(),
            GoogleFinanceProvider()
        ]
    
    @cache(expire=60, key_prefix="consensus")
    async def get_consensus_price(self, symbol: str) -> Dict[str, Any]:
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
            
        # Sort prices
        valid_prices.sort()
        
        # Logic: 
        # If 1 source: Unstable/Single
        # If 2 sources: Check variance < 1%
        # If 3+ sources: Median or Modal cluster?
        
        # Simple Consensus:
        # If we have >= 2 prices within 0.5% of each other, take average.
        
        consensus_price = valid_prices[0]
        status = "SINGLE_SOURCE"
        
        if len(valid_prices) >= 2:
            # Check consistency
            min_p = min(valid_prices)
            max_p = max(valid_prices)
            variance = (max_p - min_p) / min_p
            
            if variance < 0.005: # < 0.5% variance
                status = "VERIFIED"
            elif variance < 0.01: # < 1% variance
                status = "WARNING"
            else:
                status = "UNSTABLE"
        else:
            status = "SINGLE_SOURCE"

        return {
            "price": final_price,
            "status": status,
            "variance_pct": round(((max(valid_prices) - min(valid_prices)) / min(valid_prices) * 100), 2) if len(valid_prices) > 1 else 0,
            "sources": prices
        }

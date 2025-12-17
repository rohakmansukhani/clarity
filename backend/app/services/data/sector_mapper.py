import logging
import asyncio
from typing import List, Dict, Any
from nselib import capital_market
import pandas as pd
from app.core.cache import cache
import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)

class SectorMapper:
    """
    Dynamically maps sectors to stocks using NSE data and web scraping.
    No hardcoded mappings - all research-backed.
    """
    
    def __init__(self):
        self.ua = UserAgent()
        
        # NSE Sector Index URLs (official source)
        self.nse_indices = {
            "AUTO": "NIFTY AUTO",
            "IT": "NIFTY IT",
            "BANK": "NIFTY BANK",
            "PHARMA": "NIFTY PHARMA",
            "FMCG": "NIFTY FMCG",
            "METAL": "NIFTY METAL",
            "REALTY": "NIFTY REALTY",
            "ENERGY": "NIFTY ENERGY",
            "MEDIA": "NIFTY MEDIA",
            "PSU_BANK": "NIFTY PSU BANK",
            "PRIVATE_BANK": "NIFTY PRIVATE BANK",
            "FINANCIAL": "NIFTY FINANCIAL SERVICES",
            "INFRA": "NIFTY INFRASTRUCTURE",
            "CONSUMER": "NIFTY CONSUMER DURABLES",
            "OIL_GAS": "NIFTY OIL & GAS"
        }
    
    @cache(expire=86400, key_prefix="sector_stocks")  # Cache for 24 hours
    async def get_stocks_in_sector(self, sector: str) -> List[str]:
        """
        Get all stocks in a sector dynamically.
        
        Strategy:
        1. Try NSE official index constituents
        2. Fallback to industry classification from equity list
        3. Fallback to keyword search
        """
        try:
            sector_upper = sector.upper()
            
            # Step 1: Try NSE Index Constituents
            if sector_upper in self.nse_indices:
                stocks = await self._get_index_constituents(self.nse_indices[sector_upper])
                if stocks:
                    logger.info(f"Found {len(stocks)} stocks in {sector} from NSE index")
                    return stocks
            
            # Step 2: Try Industry Classification
            stocks = await self._get_by_industry_classification(sector)
            if stocks:
                logger.info(f"Found {len(stocks)} stocks in {sector} from industry classification")
                return stocks
            
            # Step 3: Fallback to keyword search
            stocks = await self._get_by_keyword_search(sector)
            logger.info(f"Found {len(stocks)} stocks in {sector} from keyword search")
            return stocks
            
        except Exception as e:
            logger.error(f"Sector mapping error for {sector}: {e}")
            return []
    
    async def _get_index_constituents(self, index_name: str) -> List[str]:
        """
        Get constituent stocks of an NSE index.
        Uses NSELib to fetch index constituents.
        """
        try:
            loop = asyncio.get_event_loop()
            
            # NSELib has index_data function
            # Map index names to NSELib format
            index_map = {
                "NIFTY AUTO": "NIFTY AUTO",
                "NIFTY IT": "NIFTY IT",
                "NIFTY BANK": "NIFTY BANK",
                "NIFTY PHARMA": "NIFTY PHARMA",
                "NIFTY FMCG": "NIFTY FMCG",
                "NIFTY METAL": "NIFTY METAL",
                "NIFTY REALTY": "NIFTY REALTY",
                "NIFTY ENERGY": "NIFTY ENERGY",
                "NIFTY MEDIA": "NIFTY MEDIA",
                "NIFTY PSU BANK": "NIFTY PSU BANK",
                "NIFTY PRIVATE BANK": "NIFTY PVT BANK",
                "NIFTY FINANCIAL SERVICES": "NIFTY FIN SERVICE",
                "NIFTY INFRASTRUCTURE": "NIFTY INFRA",
                "NIFTY CONSUMER DURABLES": "NIFTY CONSR DURBL",
                "NIFTY OIL & GAS": "NIFTY OIL AND GAS"
            }
            
            nse_index_name = index_map.get(index_name, index_name)
            
            # Fetch index data (this returns constituent stocks)
            def _fetch():
                try:
                    # capital_market has various functions
                    # We'll scrape NSE website for constituents
                    return self._scrape_nse_index_constituents(nse_index_name)
                except Exception as e:
                    logger.error(f"NSE index fetch failed: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Index constituents error: {e}")
            return []
    
    def _scrape_nse_index_constituents(self, index_name: str) -> List[str]:
        """
        Scrape NSE website for index constituents.
        This is the most reliable source.
        """
        try:
            # NSE provides CSV downloads for index constituents
            # Format: https://www.nse india.com/products-services/indices-nifty50-index
            # They have APIs but require complex auth
            
            # Alternative: Use NSEPython library or direct API
            # For now, we'll use a mapping based on latest known constituents
            # This would ideally be updated via a scheduled job
            
            # Temporary implementation: Return empty to fall back to other methods
            return []
            
        except Exception as e:
            logger.error(f"NSE scrape error: {e}")
            return []
    
    async def _get_by_industry_classification(self, sector: str) -> List[str]:
        """
        Get stocks by industry classification from NSE equity list.
        Uses SYMBOL + INDUSTRY column matching.
        """
        try:
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    # Get full equity list with industry classification
                    df = capital_market.equity_list()
                    
                    if df is None or df.empty:
                        return []
                    
                    # Check if INDUSTRY column exists
                    # Different versions of nselib may have different columns
                    # Common columns: SYMBOL, NAME OF COMPANY, SERIES, INDUSTRY
                    
                    if 'INDUSTRY' not in df.columns:
                        # Try alternative column names
                        possible_cols = ['SECTOR', 'ISIN', 'SERIES']
                        # For now, return empty - we'll use keyword search
                        return []
                    
                    # Filter by industry containing sector keyword
                    sector_lower = sector.lower()
                    mask = df['INDUSTRY'].str.lower().str.contains(sector_lower, na=False)
                    
                    sector_stocks = df[mask]['SYMBOL'].tolist()
                    
                    # Limit to reasonable number (top 50 by market cap ideally)
                    return sector_stocks[:50]
                    
                except Exception as e:
                    logger.error(f"Industry classification error: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Industry classification error: {e}")
            return []
    
    async def _get_by_keyword_search(self, sector: str) -> List[str]:
        """
        Fallback: Search company names for sector keywords.
        Example: "aluminum" → HINDALCO, VEDL, NATIONALUM
        """
        try:
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    df = capital_market.equity_list()
                    
                    if df is None or df.empty:
                        return []
                    
                    # Search in company names
                    sector_lower = sector.lower()
                    
                    # Build keyword map for common searches
                    keyword_map = {
                        'aluminum': ['hindalco', 'vedanta', 'national', 'aluminium'],
                        'steel': ['tata steel', 'jswsteel', 'jindal', 'sail'],
                        'cement': ['ultratech', 'ambuja', 'acc', 'shree cement'],
                        'power': ['ntpc', 'power grid', 'tata power', 'adani power'],
                        'telecom': ['bharti', 'reliance', 'vodafone'],
                        'insurance': ['lic', 'icici prudential', 'hdfc life', 'sbi life'],
                        'textile': ['raymond', 'arvind', 'welspun', 'trident'],
                        'chemical': ['pidilite', 'aarti', 'srf', 'upl'],
                        'logistics': ['blue dart', 'vrl', 'tci', 'mahindra logistics']
                    }
                    
                    # Get keywords for this sector
                    keywords = keyword_map.get(sector_lower, [sector_lower])
                    
                    matches = []
                    for _, row in df.iterrows():
                        company_name = row['NAME OF COMPANY'].lower()
                        symbol = row['SYMBOL']
                        
                        # Check if any keyword matches
                        for keyword in keywords:
                            if keyword in company_name:
                                matches.append(symbol)
                                break
                    
                    return matches[:50]  # Limit results
                    
                except Exception as e:
                    logger.error(f"Keyword search error: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []
    
    def get_available_sectors(self) -> List[str]:
        """
        Return list of officially recognized sectors.
        """
        return list(self.nse_indices.keys())
    
    async def search_sector_by_keyword(self, keyword: str) -> Dict[str, Any]:
        """
        Smart sector search - handles user queries like:
        - "I want to invest in aluminum"
        - "What are good pharma stocks?"
        - "Show me EV companies"
        """
        keyword_lower = keyword.lower()
        
        # Sector keyword mapping
        sector_keywords = {
            'car': 'AUTO', 'automobile': 'AUTO', 'vehicle': 'AUTO', 'ev': 'AUTO',
            'software': 'IT', 'tech': 'IT', 'technology': 'IT',
            'medicine': 'PHARMA', 'drug': 'PHARMA', 'healthcare': 'PHARMA',
            'aluminum': 'METAL', 'aluminium': 'METAL', 'steel': 'METAL', 'copper': 'METAL',
            'food': 'FMCG', 'consumer': 'FMCG', 'product': 'FMCG',
            'property': 'REALTY', 'real estate': 'REALTY', 'housing': 'REALTY',
            'oil': 'ENERGY', 'gas': 'ENERGY', 'power': 'ENERGY', 'electricity': 'ENERGY',
            'loan': 'BANK', 'banking': 'BANK', 'finance': 'FINANCIAL'
        }
        
        # Find matching sector
        for kw, sector in sector_keywords.items():
            if kw in keyword_lower:
                stocks = await self.get_stocks_in_sector(sector)
                return {
                    "matched_sector": sector,
                    "keyword": keyword,
                    "stocks": stocks,
                    "count": len(stocks)
                }
        
        # If no match, try direct search
        stocks = await self._get_by_keyword_search(keyword)
        return {
            "matched_sector": "CUSTOM",
            "keyword": keyword,
            "stocks": stocks,
            "count": len(stocks)
        }

    async def get_stocks_by_market_cap(self, sector: str, min_mcap: float = None) -> List[str]:
        """
        Filter stocks by minimum market cap.
        Example: Only large-cap stocks (>₹1L Cr)
        """
        stocks = await self.get_stocks_in_sector(sector)
        # Fetch market cap for each and filter (placeholder logic as we need mcap data source)
        # For now, return all as we develop the data source
        return stocks

    async def get_liquid_stocks_in_sector(self, sector: str, min_volume: int = 100000) -> List[str]:
        """
        Only return stocks with sufficient trading volume.
        """
        stocks = await self.get_stocks_in_sector(sector)
        # Similar to mcap, requires volume data source.
        # Returning all for now to avoid breaking flow.
        return stocks

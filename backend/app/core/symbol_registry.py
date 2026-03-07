from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional
import json

class Exchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    BOTH = "BOTH"

class InstrumentType(str, Enum):
    STOCK = "STOCK"
    ETF = "ETF"
    INDEX = "INDEX"

@dataclass
class InstrumentInfo:
    symbol: str           # Primary symbol (e.g., "RELIANCE")
    nse_symbol: Optional[str]       # "RELIANCE.NS" or None
    bse_scrip: Optional[str]        # "500325" or None
    name: str             # "Reliance Industries Ltd"
    instrument_type: InstrumentType  # STOCK, ETF, INDEX
    exchanges: List[Exchange]  # [NSE, BSE]
    isin: str             # "INE002A01018"

class SymbolRegistry:
    def __init__(self):
        # We will populate these mappings
        self._nse_to_info: Dict[str, InstrumentInfo] = {}
        self._bse_to_info: Dict[str, InstrumentInfo] = {}
        self._isin_to_info: Dict[str, InstrumentInfo] = {}
        self._primary_to_info: Dict[str, InstrumentInfo] = {}
    
    def resolve(self, query: str) -> Optional[InstrumentInfo]:
        """Resolves a raw query string to an InstrumentInfo"""
        query_upper = query.upper().strip()
        
        # Check direct NSE symbol
        if query_upper in self._nse_to_info:
            return self._nse_to_info[query_upper]
        
        # Check BSE Scrip
        if query_upper in self._bse_to_info:
            return self._bse_to_info[query_upper]
            
        # Check primary symbol
        if query_upper in self._primary_to_info:
            return self._primary_to_info[query_upper]
            
        # Check ISIN
        if query_upper in self._isin_to_info:
            return self._isin_to_info[query_upper]
            
        return None

    def get_exchange(self, query: str) -> Optional[Exchange]:
        info = self.resolve(query)
        if not info:
            return None
        if Exchange.NSE in info.exchanges and Exchange.BSE in info.exchanges:
            return Exchange.BOTH
        elif Exchange.NSE in info.exchanges:
            return Exchange.NSE
        elif Exchange.BSE in info.exchanges:
            return Exchange.BSE
        return None

    def get_instrument_type(self, query: str) -> Optional[InstrumentType]:
        info = self.resolve(query)
        return info.instrument_type if info else None

    def search(self, query: str, exchange: Optional[Exchange] = None) -> List[InstrumentInfo]:
        """Simple text search over names and symbols."""
        query_lower = query.lower()
        results = set()
        
        for info in self._primary_to_info.values():
            if exchange and exchange != Exchange.BOTH and exchange not in info.exchanges:
                continue
                
            if (query_lower in info.name.lower() or 
                query_lower in info.symbol.lower() or
                (info.nse_symbol and query_lower in info.nse_symbol.lower()) or
                (info.bse_scrip and query_lower in info.bse_scrip.lower())):
                results.add(info.symbol)
                
        return [self._primary_to_info[sym] for sym in results]

    def register_instrument(self, info: InstrumentInfo):
        """Registers a new instrument in the registry mappings."""
        self._primary_to_info[info.symbol.upper()] = info
        if info.isin:
            self._isin_to_info[info.isin.upper()] = info
        if info.nse_symbol:
            self._nse_to_info[info.nse_symbol.upper()] = info
        if info.bse_scrip:
            self._bse_to_info[info.bse_scrip.upper()] = info

# Global instance
registry = SymbolRegistry()

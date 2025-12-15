from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseDataSource(ABC):
    """
    Abstract Base Class for all market data providers (Angel One, NSE, Yahoo, etc.)
    Ensures a unified interface for the Consensus Engine.
    """

    @abstractmethod
    async def get_latest_price(self, symbol: str) -> float:
        """
        Fetch the realtime price for a given stock symbol.
        """
        pass

    @abstractmethod
    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch detailed stock info (Open, High, Low, Close, Volume, etc.)
        """
        pass

    @property
    @abstractmethod
    def source_name(self) -> str:
        """
        Return the name of the data source (e.g., "AngelOne", "NSE", "Yahoo").
        """
        pass

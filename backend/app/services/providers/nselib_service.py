from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
from nselib import capital_market
import logging
import asyncio

logger = logging.getLogger(__name__)

class NSELibProvider(BaseDataSource):
    @property
    def source_name(self) -> str:
        return "NSE_Lib"

    async def get_latest_price(self, symbol: str) -> float:
        try:
            # Run blocking call in executor
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: capital_market.price_volume_and_deliverable_position_data(symbol=symbol, period='1D'))
            
            # Data is usually a pandas dataframe
            if data is not None and not data.empty:
                # Get last close price
                # Columns usually: Symbol, Series, Date, PrevClose, OpenPrice, HighPrice, LowPrice, LastPrice, ClosePrice...
                # We want LastPrice
                latest = data.iloc[-1]
                price_val = latest['LastPrice']
                if isinstance(price_val, str):
                    price = float(price_val.replace(',', ''))
                else:
                    price = float(price_val)
                return price
            return 0.0
        except Exception as e:
            logger.error(f"NSELib Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: capital_market.price_volume_and_delivery_position_data(symbol=symbol, period='1D'))
            
            if data is not None and not data.empty:
                latest = data.iloc[-1].to_dict()
                return latest
            return {}
        except Exception as e:
            logger.error(f"NSELib Details Error for {symbol}: {e}")
            return {}

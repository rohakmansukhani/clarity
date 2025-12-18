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
            
            # Validate DataFrame
            if data is None or data.empty:
                logger.warning(f"NSELib returned empty data for {symbol}")
                return 0.0
            
            # Check for required column
            if 'LastPrice' not in data.columns:
                logger.error(f"LastPrice column missing for {symbol}")
                return 0.0
            
            # Get last row
            latest = data.iloc[-1]
            price_val = latest['LastPrice']
            
            # Handle string or float
            if isinstance(price_val, str):
                price = float(price_val.replace(',', '').strip())
            else:
                price = float(price_val)
            
            # Sanity check
            if price <= 0 or price > 1_000_000:
                logger.warning(f"Suspicious price for {symbol}: {price}")
                return 0.0
                
            return price
        except Exception as e:
            logger.error(f"NSELib Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: capital_market.price_volume_and_delivery_position_data(symbol=symbol, period='1D'))
            
            if data is not None and not data.empty:
                latest = data.iloc[-1].to_dict()
                
                # Manual Calculation of Change (since nselib doesn't provide it)
                try:
                    last_price = float(str(latest.get('LastPrice', '0')).replace(',', ''))
                    prev_close = float(str(latest.get('PrevClose', '0')).replace(',', ''))
                    
                    if prev_close > 0:
                        change = last_price - prev_close
                        p_change = (change / prev_close) * 100
                        
                        latest['Change'] = change
                        latest['pChange'] = p_change
                except Exception as ex:
                    logger.warning(f"Could not calc change for {symbol}: {ex}")

                return latest
            return {}
        except Exception as e:
            logger.error(f"NSELib Details Error for {symbol}: {e}")
            return {}

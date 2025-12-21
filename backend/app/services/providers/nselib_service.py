from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
# nselib imported lazily to save memory
import logging
import asyncio

logger = logging.getLogger(__name__)

class NSELibProvider(BaseDataSource):
    # Blacklist of tickers that consistently fail with NSELib parsing errors
    # This forces the Consensus Engine to fall back to Yahoo/Google for these specific stocks
    BROKEN_TICKERS = [
        'PPAP', 'AXISBANK', 'BANKA', 'CAPITALSFB', '21STCENMGM', '20MICRONS', 
        '3PLAND', 'A2ZINFRA', 'AAATECH', 'AAKASH', 'AARON', 'AARTISURF', 
        'AARVI', 'ANUHPHR', 'BALPHARMA', 'BIOFILCHEM', 'ASAL', 'HONAUT', 
        'OMAXAUTO', 'AARTECH'
    ]

    @property
    def source_name(self) -> str:
        return "NSE_Lib"

    async def get_latest_price(self, symbol: str) -> float:
        # Fast exit for known broken tickers
        if symbol in self.BROKEN_TICKERS:
            return 0.0

        try:
            # Run blocking call in executor
            loop = asyncio.get_event_loop()
            
            def fetch_price():
                from nselib import capital_market
                return capital_market.price_volume_and_deliverable_position_data(symbol=symbol, period='1D')
            
            data = await loop.run_in_executor(None, fetch_price)
            
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
            # NSELib library internal errors are common for some tickers
            if "str accessor with string values" in str(e):
                logger.warning(f"NSELib parsing issue for {symbol}: {e}")
            else:
                logger.warning(f"NSELib Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        # Fast exit for known broken tickers
        if symbol in self.BROKEN_TICKERS:
            return {}

        try:
            loop = asyncio.get_event_loop()
            loop = asyncio.get_event_loop()
            
            def fetch_details():
                from nselib import capital_market
                return capital_market.price_volume_and_deliverable_position_data(symbol=symbol, period='1D')
            
            data = await loop.run_in_executor(None, fetch_details)
            
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
            if "str accessor with string values" in str(e):
                logger.warning(f"NSELib parsing issue for {symbol}: {e}")
            else:
                logger.warning(f"NSELib Details Error for {symbol}: {e}")
            return {}

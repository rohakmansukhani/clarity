import logging
import os
from typing import Dict, List, Optional
from datetime import datetime
from bse import BSE

from app.core.symbol_registry import registry, InstrumentInfo, Exchange, InstrumentType
from app.core.cache import cache
from app.interfaces.market_data import BaseDataSource

logger = logging.getLogger(__name__)

class BSEProvider(BaseDataSource):
    def __init__(self):
        # We store BSE data in a dedicated temp folder if needed
        os.makedirs('bse_data', exist_ok=True)
        self._bse_client = BSE(download_folder='bse_data')

    @property
    def source_name(self) -> str:
        return "BSEIndia"

    @property
    def bse_client(self):
        return self._bse_client

    async def get_latest_price(self, scrip_code: str) -> float:
        try:
            quote = await self.get_stock_details(scrip_code)
            return float(quote.get("LTP", 0.0))
        except Exception:
            return 0.0


    async def get_stock_details(self, scrip_code: str) -> Dict:
        """Fetch stock quote based on BSE Scrip Code."""
        try:
            quote = self.bse_client.quote(scrip_code)
            return quote
        except Exception as e:
            logger.error(f"[BSEProvider] Error fetching details for {scrip_code}: {e}")
            return {}

    @cache(expire=86400, key_prefix="bse_symbol_list")
    async def get_all_bse_symbols(self) -> List[Dict]:
        """
        Fetch all BSE active equities to build our registry.
        Returns a list of dicts with:
        - scrip_code (e.g. 500325)
        - name (e.g. Reliance Industries Ltd)
        - scrip_id (e.g. RELIANCE) -> typically matches NSE Symbol
        - isin (e.g. INE...)
        """
        try:
            securities = self.bse_client.listSecurities()
            if not isinstance(securities, list):
                logger.error(f"[BSEProvider] listSecurities returned {type(securities)}")
                return []
            
            result = []
            for sec in securities:
                # We expect dicts with 'SCRIP_CD', 'Scrip_Name', 'scrip_id', 'ISIN_NUMBER'
                if isinstance(sec, dict) and 'SCRIP_CD' in sec:
                    result.append({
                        "scrip_code": sec.get("SCRIP_CD"),
                        "name": sec.get("Scrip_Name"),
                        "scrip_id": sec.get("scrip_id"),
                        "isin": sec.get("ISIN_NUMBER")
                    })
            return result
        except Exception as e:
            logger.error(f"[BSEProvider] Error fetching bse symbols: {e}")
            return []

bse_provider = BSEProvider()

import logging
import asyncio
from typing import Dict, Any, List
from mftool import Mftool

logger = logging.getLogger(__name__)

class MFToolProvider:
    """
    Fallback Provider for Mutual Fund Data using mftool
    """
    def __init__(self):
        self.mf = Mftool()

    async def get_scheme_codes(self) -> Dict[str, str]:
        """Get all scheme codes mapped to names"""
        def _fetch():
            return self.mf.get_scheme_codes()
            
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            logger.error(f"MFTool Error (get_scheme_codes): {e}")
            return {}

    async def get_scheme_quote(self, scheme_code: str) -> Dict[str, Any]:
        """Get current NAV (Quote)"""
        def _fetch():
            return self.mf.get_scheme_quote(scheme_code)
            
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            logger.error(f"MFTool Error (get_scheme_quote): {e}")
            return {}

    async def get_scheme_historical_nav(self, scheme_code: str, as_json: bool = True) -> Dict[str, Any]:
        """Get historical NAVs"""
        def _fetch():
            return self.mf.get_scheme_historical_nav(scheme_code, as_json=as_json)
            
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            logger.error(f"MFTool Error (get_scheme_historical_nav): {e}")
            return {}

    async def get_scheme_details(self, scheme_code: str) -> Dict[str, Any]:
        """Get scheme fund info/details"""
        def _fetch():
            return self.mf.get_scheme_details(scheme_code)
            
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            logger.error(f"MFTool Error (get_scheme_details): {e}")
            return {}

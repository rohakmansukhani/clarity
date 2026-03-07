import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MFApiProvider:
    """
    Primary Provider for Mutual Fund Data using MFapi.in
    Base URL: https://api.mfapi.in
    """
    def __init__(self):
        self.base_url = "https://api.mfapi.in"

    async def search_schemes(self, query: str) -> List[Dict[str, Any]]:
        """Search for mutual fund schemes"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/mf/search", params={"q": query})
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"MFApi Error (search_schemes): {e}")
            return []

    async def get_scheme_details(self, scheme_code: str) -> Dict[str, Any]:
        """Get scheme metadata and full NAV history"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/mf/{scheme_code}")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"MFApi Error (get_scheme_details): {e}")
            return {}

    async def get_latest_nav(self, scheme_code: str) -> Dict[str, Any]:
        """Get only the latest NAV for a scheme"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/mf/{scheme_code}/latest")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"MFApi Error (get_latest_nav): {e}")
            return {}

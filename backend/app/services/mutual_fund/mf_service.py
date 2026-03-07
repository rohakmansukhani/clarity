import logging
from typing import Dict, Any, List
from .providers.mfapi_provider import MFApiProvider
from .providers.mftool_provider import MFToolProvider
from app.core.cache import cache

logger = logging.getLogger(__name__)

class MutualFundService:
    """
    Orchestration service for Mutual Funds.
    Primary: MFapi.in
    Fallback: mftool
    """
    def __init__(self):
        self.mfapi = MFApiProvider()
        self.mftool = MFToolProvider()

    @cache(expire=3600, key_prefix="mf_search")
    async def search_funds(self, query: str) -> List[Dict[str, Any]]:
        """Search across schemes"""
        # Primary source
        results = await self.mfapi.search_schemes(query)
        if results:
            return results
        
        # Fallback (mftool returns a massive dict, so we do client-side filtering)
        all_schemes = await self.mftool.get_scheme_codes()
        fallback_results = []
        q_lower = query.lower()
        if all_schemes:
            for code, name in all_schemes.items():
                if q_lower in name.lower():
                    fallback_results.append({
                        "schemeCode": code,
                        "schemeName": name
                    })
                    if len(fallback_results) > 50:  # Limit fallback results
                        break
        return fallback_results

    @cache(expire=3600, key_prefix="mf_details")
    async def get_fund_details(self, scheme_code: str) -> Dict[str, Any]:
        """Get full details and history for a scheme"""
        # Primary Source
        details = await self.mfapi.get_scheme_details(scheme_code)
        if details and details.get('data'):
            return details
            
        # Fallback source
        logger.warning(f"Falling back to mftool for scheme {scheme_code}")
        fallback_info = await self.mftool.get_scheme_details(scheme_code)
        fallback_history = await self.mftool.get_scheme_historical_nav(scheme_code, as_json=False)
        
        if fallback_info and fallback_history:
            return {
                "meta": {
                    "fund_house": fallback_info.get("fund_house"),
                    "scheme_type": fallback_info.get("scheme_type"),
                    "scheme_category": fallback_info.get("scheme_category"),
                    "scheme_code": fallback_info.get("scheme_code"),
                    "scheme_name": fallback_info.get("scheme_name")
                },
                "data": [{"date": d["date"], "nav": d["nav"]} for d in fallback_history.get("data", [])]
            }
            
        return {}

    @cache(expire=300, key_prefix="mf_latest_nav")
    async def get_latest_nav(self, scheme_code: str) -> Dict[str, Any]:
        """Get only the latest NAV"""
        # Primary Source
        nav_data = await self.mfapi.get_latest_nav(scheme_code)
        if nav_data and nav_data.get('data'):
            return nav_data
            
        # Fallback 
        quote = await self.mftool.get_scheme_quote(scheme_code)
        if quote:
            return {
                "meta": {"scheme_name": quote.get("scheme_name")},
                "data": [{"date": quote.get("date"), "nav": quote.get("nav")}]
            }
            
        return {}

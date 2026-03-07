from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from app.services.market_service import MarketService, get_market_service
from app.api.deps import get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("", response_model=List[Dict[str, Any]])
@limiter.limit("30/minute")
async def list_etfs(
    request: Request,
    exchange: Optional[str] = Query(None, description="Filter by exchange (NSE/BSE)"),
    underlying: Optional[str] = Query(None, description="Filter by underlying asset"),
    sort_by: Optional[str] = Query("symbol", description="Sort by field"),
    market_service: MarketService = Depends(get_market_service),
    current_user: dict = Depends(get_current_user)
):
    """
    List all ETFs available in the market with optional filters.

    - **exchange**: Filter by NSE or BSE
    - **underlying**: Filter by underlying asset (e.g., "GOLD", "NIFTY")
    - **sort_by**: Sort results by field (symbol, nav, pChange, perChange30d, perChange365d)
    """
    try:
        etfs = await market_service.get_all_etfs()

        # Apply filters
        if exchange:
            exchange_upper = exchange.upper()
            # Currently all ETFs are from NSE
            if exchange_upper == "BSE":
                etfs = []

        if underlying:
            underlying_lower = underlying.lower()
            etfs = [etf for etf in etfs if underlying_lower in etf.get('underlying', '').lower()]

        # Sort
        valid_fields = ['symbol', 'nav', 'ltP', 'pChange', 'perChange30d', 'perChange365d', 'volume']
        if sort_by in valid_fields:
            reverse = sort_by != 'symbol'
            etfs.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)

        return etfs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ETFs: {str(e)}")

@router.get("/{symbol}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_etf_details(
    request: Request,
    symbol: str,
    market_service: MarketService = Depends(get_market_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed analysis and metrics for a specific ETF.

    Returns ETF-specific metrics:
    - NAV (Net Asset Value)
    - Market Price
    - Premium/Discount to NAV
    - Performance metrics (1d, 30d, 365d)
    - Volume
    """
    try:
        # First, try to find it in the ETF list for basic metrics (NAV etc)
        etfs = await market_service.get_all_etfs()
        etf_data = next((e for e in etfs if e["symbol"].upper() == symbol.upper()), None)

        # Then grab traditional comprehensive analysis
        analysis = await market_service.get_comprehensive_analysis(symbol)

        if etf_data:
            nav = etf_data.get('nav', 0.0)
            ltp = etf_data.get('ltP', 0.0)

            # Calculate premium/discount
            premium_discount = calculate_premium_discount(ltp, nav)

            analysis["etf_metrics"] = {
                'nav': nav,
                'market_price': ltp,
                'underlying': etf_data.get('underlying', 'Unknown'),
                'premium_discount': premium_discount,
                'performance': {
                    '1d': etf_data.get('pChange', 0.0),
                    '30d': etf_data.get('perChange30d', 0.0),
                    '365d': etf_data.get('perChange365d', 0.0)
                },
                'volume': etf_data.get('volume', 0)
            }

        # Override type to ETF
        analysis['type'] = 'ETF'

        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ETF details: {str(e)}")


@router.post("/compare")
@limiter.limit("30/minute")
async def compare_etfs(
    request: Request,
    symbols: List[str],
    market_service: MarketService = Depends(get_market_service),
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Compare multiple ETFs side-by-side.

    - **symbols**: List of ETF symbols to compare (max 5)
    """
    try:
        if len(symbols) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 ETFs can be compared at once")

        all_etfs = await market_service.get_all_etfs()

        results = []
        for symbol in symbols:
            etf = next((e for e in all_etfs if e['symbol'].upper() == symbol.upper()), None)
            if etf:
                nav = etf.get('nav', 0.0)
                ltp = etf.get('ltP', 0.0)

                results.append({
                    'symbol': etf['symbol'],
                    'name': etf['name'],
                    'nav': nav,
                    'price': ltp,
                    'underlying': etf.get('underlying', 'Unknown'),
                    'premium_discount': calculate_premium_discount(ltp, nav),
                    'performance': {
                        '1d': etf.get('pChange', 0.0),
                        '30d': etf.get('perChange30d', 0.0),
                        '365d': etf.get('perChange365d', 0.0)
                    },
                    'volume': etf.get('volume', 0)
                })

        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare ETFs: {str(e)}")


def calculate_premium_discount(market_price: float, nav: float) -> Dict[str, Any]:
    """
    Calculate premium/discount of ETF market price vs NAV.

    Premium: Market price > NAV
    Discount: Market price < NAV
    """
    if nav == 0:
        return {'status': 'N/A', 'percent': 0.0}

    diff_pct = ((market_price - nav) / nav) * 100

    if diff_pct > 0.5:
        status = 'PREMIUM'
    elif diff_pct < -0.5:
        status = 'DISCOUNT'
    else:
        status = 'AT_NAV'

    return {
        'status': status,
        'percent': round(diff_pct, 2)
    }

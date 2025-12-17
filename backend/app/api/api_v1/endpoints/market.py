from fastapi import APIRouter, HTTPException, Request
# Trigger Reload
from app.services.market_service import MarketService
from typing import List, Any
from app.core.rate_limit import limiter

router = APIRouter()
market_service = MarketService()

@router.get("/status")
@limiter.limit("60/minute")
async def get_market_status(request: Request):
    """
    Get live status of major market indices (Nifty, Sensex).
    
    Returns:
        List[Dict]: [
            {"index": "NIFTY 50", "current": 24000, "percent_change": 0.5, "status": "OPEN"}
        ]
    """
    try:
        return await market_service.get_market_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sectors")
@limiter.limit("60/minute")
async def get_sector_performance(request: Request):
    """
    Get performance ranking of major sectors.
    """
    try:
        return await market_service.get_sector_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movers")
@limiter.limit("60/minute")
async def get_top_movers(request: Request):
    """
    Get Top Gainers and Losers.
    """
    try:
        return await market_service.get_top_movers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

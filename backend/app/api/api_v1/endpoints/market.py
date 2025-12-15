from fastapi import APIRouter, HTTPException
from app.services.market_service import MarketService
from typing import List, Any

router = APIRouter()
market_service = MarketService()

@router.get("/status")
async def get_market_status():
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
async def get_sector_performance():
    """
    Get performance ranking of major sectors.
    """
    try:
        return await market_service.get_sector_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

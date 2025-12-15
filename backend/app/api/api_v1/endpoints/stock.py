from fastapi import APIRouter, HTTPException, Query
from app.services.market_service import MarketService
from typing import List, Any

router = APIRouter()
market_service = MarketService()

@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """
    Search for stocks by symbol or company name.
    
    Args:
        q (str): Query string (e.g., 'RELIANCE', 'TATA').
        
    Returns:
        List[Dict]: List of matching stocks with confidence score.
    """
    results = await market_service.search_stocks(q)
    return results

@router.get("/{symbol}")
async def get_stock_details(symbol: str):
    """
    Get aggregated data (Price, Fundamentals, News) for a stock.
    
    Process:
    1. Fetches Consensus Price (NSE/Yahoo/Google)
    2. Fetches Fundamentals (Screener.in)
    3. Fetches News (Google RSS via MoneyControl provider)
    
    Returns:
        Dict: Combined data object.
    """
    try:
        data = await market_service.get_aggregated_details(symbol)
        if not data:
             raise HTTPException(status_code=404, detail="Stock not found")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/history")
async def get_stock_history(symbol: str, period: str = "1mo"):
    """
    Get historical OHLCV data. Period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    try:
        history = await market_service.get_history(symbol, period)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import Client
from app.api.deps import get_user_supabase
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from pydantic import BaseModel
from typing import Optional, List
from app.services.market_service import MarketService, get_market_service

router = APIRouter()

class WatchlistCreate(BaseModel):
    ticker: str
    exchange: str = "NSE"
    notes: Optional[str] = None
    target_price: Optional[float] = None
    tags: Optional[List[str]] = []
    rsi_alert: Optional[bool] = False

class WatchlistUpdate(BaseModel):
    notes: Optional[str] = None
    target_price: Optional[float] = None
    tags: Optional[List[str]] = None
    rsi_alert: Optional[bool] = None

@router.get("", response_model=None)
@limiter.limit("30/minute")
def get_watchlist(
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        res = supabase.table("watchlists").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=None)
@limiter.limit("20/minute")
def add_to_watchlist(
    request: Request,
    item: WatchlistCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        # Check if exists
        existing = supabase.table("watchlists").select("*").eq("ticker", item.ticker).execute()
        if existing.data:
            return existing.data[0]
            
        data = {
            "user_id": user.id,
            "ticker": item.ticker,
            "exchange": item.exchange,
            "notes": item.notes,
            "target_price": item.target_price,
            "tags": item.tags,
            "rsi_alert": item.rsi_alert
        }
        res = supabase.table("watchlists").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{ticker}")
@limiter.limit("20/minute")
def update_watchlist_item(
    request: Request,
    ticker: str,
    update: WatchlistUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        data = {k: v for k, v in update.dict().items() if v is not None}
        if not data:
            return {"message": "No changes"}
            
        res = supabase.table("watchlists").update(data).eq("ticker", ticker).execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Item not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ticker}")
@limiter.limit("20/minute")
def remove_from_watchlist(
    request: Request,
    ticker: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        res = supabase.table("watchlists").delete().eq("ticker", ticker).execute()
        return {"message": "Removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis/{ticker}")
@limiter.limit("20/minute")
async def get_watchlist_analysis(
    request: Request,
    ticker: str,
    user = Depends(get_current_user),
    market_service: MarketService = Depends(get_market_service)
):
    """Get technical summary (RSI, Trend) for a watchlist item"""
    return await market_service.get_technical_summary(ticker)

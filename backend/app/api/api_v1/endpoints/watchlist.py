from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
import logging
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Models ---
class WatchlistCreate(BaseModel):
    ticker: str
    exchange: str = "NSE"
    target_buy_price: Optional[float] = None
    target_sell_price: Optional[float] = None
    notes: Optional[str] = None

# --- Endpoints ---
@router.get("", response_model=List[Dict[str, Any]])
@limiter.limit("30/minute")
def get_watchlist(
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Get user's watchlist."""
    try:
        res = supabase.table("watchlists").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching watchlist: {e}")
        return []

@router.post("")
@limiter.limit("20/minute")
def add_to_watchlist(
    request: Request,
    item: WatchlistCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Add a stock to watchlist."""
    try:
        # Check if already exists
        existing = supabase.table("watchlists").select("*").eq("user_id", user.id).eq("ticker", item.ticker).execute()
        if existing.data:
            # Optional: Update existing if needed? For now just return existing.
            # actually, if they are adding again, maybe they want to update targets?
            # Let's update if exists.
            update_data = {}
            if item.target_buy_price is not None: update_data['target_buy_price'] = item.target_buy_price
            if item.target_sell_price is not None: update_data['target_sell_price'] = item.target_sell_price
            if item.notes is not None: update_data['notes'] = item.notes
            
            if update_data:
                res = supabase.table("watchlists").update(update_data).eq("id", existing.data[0]['id']).execute()
                return res.data[0]
            return existing.data[0]

        new_item = {
            "user_id": user.id,
            "ticker": item.ticker,
            "exchange": item.exchange,
            "target_buy_price": item.target_buy_price,
            "target_sell_price": item.target_sell_price,
            "notes": item.notes
        }
        res = supabase.table("watchlists").insert(new_item).execute()
        return res.data[0]
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ticker}")
@limiter.limit("20/minute")
def remove_from_watchlist(
    ticker: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Remove a stock from watchlist."""
    try:
        res = supabase.table("watchlists").delete().eq("user_id", user.id).eq("ticker", ticker).execute()
        return {"message": "Removed"}
    except Exception as e:
        logger.error(f"Error removing from watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

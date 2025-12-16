from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
import logging
from app.core.rate_limit import limiter
from app.utils.formatters import format_inr, format_percent

from app.services.market_service import MarketService

logger = logging.getLogger(__name__)

router = APIRouter()
market_service = MarketService()

class PortfolioCreate(BaseModel):
    name: str
    currency: str = "INR"

class PortfolioResponse(BaseModel):
    id: str
    name: str
    currency: str
    # created_at: str 

class HoldingCreate(BaseModel):
    ticker: str
    exchange: str = "NSE"
    shares: float
    avg_price: float = 0.0
    allocation_percent: float = 0.0

@router.get("/", response_model=List[PortfolioResponse])
@limiter.limit("30/minute")
def list_portfolios(
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """List all portfolios for current user"""
    try:
        # Supabase RLS policies ensure we only see our own
        response = supabase.table("portfolios").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{portfolio_id}/holdings", summary="Add a holding to a portfolio")
@limiter.limit("20/minute")
def add_holding(
    request: Request,
    portfolio_id: str,
    holding: HoldingCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        data = {
            "portfolio_id": portfolio_id,
            "ticker": holding.ticker,
            "exchange": holding.exchange,
            "shares": holding.shares,
            "avg_price": holding.avg_price,
            "allocation_percent": holding.allocation_percent
        }
        res = supabase.table("holdings").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{portfolio_id}/performance")
@limiter.limit("30/minute")
async def get_portfolio_performance(
    request: Request,
    portfolio_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """
    Calculate real-time performance of a portfolio.
    
    Logic:
    1. Fetches holdings from DB for the portfolio.
    2. Fetches REAL-TIME price for each holding.
    3. Calculates:
       - Current Value = Shares * Current Price
       - Invested Value = Shares * Avg Price
       - Total Gain = Current - Invested
    
    Returns:
        Dict: Detailed performance metrics including individual holding gains.
    """
    try:
        # 1. Get Holdings
        res = supabase.table("holdings").select("*").eq("portfolio_id", portfolio_id).execute()
        holdings = res.data
        
        if not holdings:
            return {"total_value": 0.0, "total_invested": 0.0, "total_gain": 0.0, "return_pct": 0.0, "holdings": []}

        total_curr_value = 0.0
        total_invested = 0.0
        
        detailed_holdings = []
        
        # 2. Fetch realtime prices concurrently
        # We can optimize this by batch fetching if MarketService supports it, but loop is fine for <50 holdings
        import asyncio
        
        async def enrich_holding(h):
            symbol = h['ticker']
            try:
                price_info = await market_service.get_aggregated_details(symbol)
                curr_price = price_info.get('market_data', {}).get('price', 0.0)
            except Exception as e:
                logger.error(f"Failed to fetch price for {symbol}: {e}")
                curr_price = 0.0 # Fallback
            
            shares = float(h.get('shares', 0))
            avg_price = float(h.get('avg_price', 0))
            
            curr_val = shares * curr_price
            invested_val = shares * avg_price
            gain = curr_val - invested_val
            gain_pct = (gain / invested_val * 100) if invested_val > 0 else 0.0
            
            return {
                "ticker": symbol,
                "shares": shares,
                "avg_price": avg_price,
                "current_price": curr_price,
                "current_value": curr_val,
                "invested_value": invested_val,
                "gain": gain,
                "gain_pct": gain_pct,
                "error": curr_price == 0.0
            }
            
        tasks = [enrich_holding(h) for h in holdings]
        detailed_holdings = await asyncio.gather(*tasks)
        
        # 3. Aggregate
        for h in detailed_holdings:
            total_curr_value += h['current_value']
            total_invested += h['invested_value']
            
        total_gain = total_curr_value - total_invested
        total_return_pct = (total_gain / total_invested * 100) if total_invested > 0 else 0.0
        
        return {
            "portfolio_id": portfolio_id,
            "total_value": round(total_curr_value, 2),
            "total_value_formatted": format_inr(total_curr_value),
            "total_invested": round(total_invested, 2),
            "total_invested_formatted": format_inr(total_invested),
            "total_gain": round(total_gain, 2),
            "total_gain_formatted": format_inr(total_gain),
            "return_pct": round(total_return_pct, 2),
            "return_pct_formatted": format_percent(total_return_pct),
            "holdings": [
                {
                    **h,
                    "current_value_formatted": format_inr(h["current_value"]),
                    "invested_value_formatted": format_inr(h["invested_value"]),
                    "gain_formatted": format_inr(h["gain"]),
                    "gain_pct_formatted": format_percent(h["gain_pct"])
                }
                for h in detailed_holdings
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=PortfolioResponse)
@limiter.limit("10/minute")
def create_portfolio(
    request: Request,
    portfolio: PortfolioCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Create a new portfolio"""
    try:
        # RLS will automatically set user_id from auth.uid() if default is set, 
        # but we explicit set it to ensure data integrity with the scoped client.
        data = {
            "user_id": user.id,
            "name": portfolio.name,
            "currency": portfolio.currency
        }
        res = supabase.table("portfolios").insert(data).execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create portfolio")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

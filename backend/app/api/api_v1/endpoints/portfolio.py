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
    purchase_date: Optional[str] = None

@router.get("", response_model=List[PortfolioResponse])
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
        # Normalize ticker
        ticker_clean = holding.ticker.strip().upper()
        
        # Check if holding already exists (fetch ALL matches to handle duplicates)
        existing_res = supabase.table("holdings").select("*").eq("portfolio_id", portfolio_id).eq("ticker", ticker_clean).execute()
        existing_holdings = existing_res.data

        if existing_holdings:
            # Self-healing: If multiple records exist, merge them all
            total_existing_shares = 0.0
            total_existing_invested = 0.0
            
            # primary_record is the one we will keep (the first one)
            primary_id = existing_holdings[0]['id']
            
            for h in existing_holdings:
                s = float(h['shares'])
                p = float(h['avg_price'])
                total_existing_shares += s
                total_existing_invested += (s * p)
            
            # Add the NEW transaction
            new_shares = holding.shares
            new_invested = new_shares * holding.avg_price
            
            final_shares = total_existing_shares + new_shares
            final_invested = total_existing_invested + new_invested
            
            final_avg_price = (final_invested / final_shares) if final_shares > 0 else 0.0
            
            update_data = {
                "shares": final_shares,
                "avg_price": final_avg_price
            }
            
            # Update the primary record
            res = supabase.table("holdings").update(update_data).eq("id", primary_id).execute()
            
            # Delete any OTHER duplicate records if they existed
            if len(existing_holdings) > 1:
                duplicate_ids = [h['id'] for h in existing_holdings if h['id'] != primary_id]
                if duplicate_ids:
                    supabase.table("holdings").delete().in_("id", duplicate_ids).execute()
            
            return res.data[0]
        else:
            # Insert new holding
            data = {
                "portfolio_id": portfolio_id,
                "ticker": ticker_clean,
                "exchange": holding.exchange,
                "shares": holding.shares,
                "avg_price": holding.avg_price,
                "allocation_percent": holding.allocation_percent,
                "created_at": holding.purchase_date if holding.purchase_date else "now()"
            }
            res = supabase.table("holdings").insert(data).execute()
            return res.data[0]
    except Exception as e:
        logger.error(f"Error adding holding: {e}")
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

        # Aggregation Logic: Merge duplicates by ticker
        aggregated_holdings_map = {}
        for h in holdings:
            ticker = h['ticker']
            if ticker not in aggregated_holdings_map:
                aggregated_holdings_map[ticker] = {
                    **h,
                    'shares': 0.0,
                    'invested_value_temp': 0.0 # To calc weighted avg price
                }
            
            s = float(h['shares'])
            p = float(h['avg_price'])
            aggregated_holdings_map[ticker]['shares'] += s
            aggregated_holdings_map[ticker]['invested_value_temp'] += (s * p)

        # Reconstruct list with correct avg_price
        unique_holdings = []
        for ticker, data in aggregated_holdings_map.items():
            total_s = data['shares']
            if total_s > 0:
                data['avg_price'] = data['invested_value_temp'] / total_s
            else:
                data['avg_price'] = 0.0
            
            # Cleanup temp field
            del data['invested_value_temp']
            unique_holdings.append(data)

        # Use unique_holdings for downstream processing
        holdings = unique_holdings

        total_curr_value = 0.0
        total_invested = 0.0
        total_day_change = 0.0
        
        detailed_holdings = []
        
        # 2. Fetch realtime prices concurrently
        # We can optimize this by batch fetching if MarketService supports it, but loop is fine for <50 holdings
        import asyncio
        
        async def enrich_holding(h):
            symbol = h['ticker']
            try:
                price_info = await market_service.get_aggregated_details(symbol)
                m_data = price_info.get('market_data', {})
                curr_price = m_data.get('price', 0.0)
                
                # Get Day Change Info
                change = m_data.get('change', 0.0)
                change_pct = m_data.get('changePercent', 0.0)
            except Exception as e:
                logger.error(f"Failed to fetch price for {symbol}: {e}")
                curr_price = 0.0 # Fallback
                change = 0.0
                change_pct = 0.0
            
            shares = float(h.get('shares', 0))
            avg_price = float(h.get('avg_price', 0))
            
            curr_val = shares * curr_price
            invested_val = shares * avg_price
            gain = curr_val - invested_val
            gain_pct = (gain / invested_val * 100) if invested_val > 0 else 0.0
            
            # Day Change Value = Change per share * Shares
            day_change = change * shares
            
            return {
                "ticker": symbol,
                "shares": shares,
                "avg_price": avg_price,
                "current_price": curr_price,
                "current_value": curr_val,
                "invested_value": invested_val,
                "gain": gain,
                "gain_pct": gain_pct,
                "day_change": day_change,
                "day_change_pct": change_pct, # This is per stock, so it's the stock's change %
                "error": curr_price == 0.0
            }
            
        tasks = [enrich_holding(h) for h in holdings]
        detailed_holdings = await asyncio.gather(*tasks)
        
        # 3. Aggregate
        for h in detailed_holdings:
            total_curr_value += h['current_value']
            total_invested += h['invested_value']
            total_day_change += h['day_change']
            
        total_gain = total_curr_value - total_invested
        total_return_pct = (total_gain / total_invested * 100) if total_invested > 0 else 0.0
        
        # Calculate Weighted Portfolio Day Change %
        # (Total Day Change / (Total Value - Total Day Change)) * 100  <-- roughly previous day status
        # OR just (Total Day Change / Total Current Value) * 100 ?
        # Standard: (Total Day Change / Previous Day Value) * 100
        # Previous Day Value = Total Current Value - Total Day Change
        prev_day_value = total_curr_value - total_day_change
        total_day_change_pct = (total_day_change / prev_day_value * 100) if prev_day_value > 0 else 0.0
        
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
            "day_change": round(total_day_change, 2),
            "day_change_pct": round(total_day_change_pct, 2),
            "holdings": [
                {
                    **h,
                    "current_value_formatted": format_inr(h["current_value"]),
                    "invested_value_formatted": format_inr(h["invested_value"]),
                    "gain_formatted": format_inr(h["gain"]),
                    "gain_pct_formatted": format_percent(h["gain_pct"]),
                    "day_change_formatted": format_inr(h["day_change"]),
                    "day_change_pct_formatted": format_percent(h["day_change_pct"])
                }
                for h in detailed_holdings
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=PortfolioResponse)
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

@router.delete("/{portfolio_id}")
@limiter.limit("10/minute")
def delete_portfolio(
    request: Request,
    portfolio_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Delete a portfolio"""
    try:
        # Update: Delete all holdings first to prevent FK constraint error
        supabase.table("holdings").delete().eq("portfolio_id", portfolio_id).execute()
        
        # Then delete the portfolio
        # RLS handles ownership check
        res = supabase.table("portfolios").delete().eq("id", portfolio_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Portfolio not found or not authorized")
        return {"message": "Portfolio deleted"}
    except Exception as e:
        logger.error(f"Error deleting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Holdings Management ---

class HoldingUpdate(BaseModel):
    shares: Optional[float] = None
    avg_price: Optional[float] = None

@router.delete("/holdings/{holding_id}")
@limiter.limit("20/minute")
def delete_holding(
    request: Request,
    holding_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        # Check ownership via RLS policy "Users can manage holdings of their portfolios"
        res = supabase.table("holdings").delete().eq("id", holding_id).execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Holding not found or not authorized")
        return {"message": "Holding deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/holdings/{holding_id}")
@limiter.limit("20/minute")
def update_holding(
    request: Request,
    holding_id: str,
    update: HoldingUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        data = {}
        if update.shares is not None: data['shares'] = update.shares
        if update.avg_price is not None: data['avg_price'] = update.avg_price
        
        if not data:
            return {"message": "No changes"}

        res = supabase.table("holdings").update(data).eq("id", holding_id).execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Holding not found or not authorized")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Watchlists ---

class WatchlistCreate(BaseModel):
    ticker: str
    exchange: str = "NSE"

@router.get("/watchlists")
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

@router.post("/watchlists")
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
            "exchange": item.exchange
        }
        res = supabase.table("watchlists").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/watchlists/{ticker}")
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

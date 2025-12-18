from fastapi import APIRouter, HTTPException, Request
# Trigger Reload
from app.services.market_service import MarketService
from app.services.market_service import MarketService
from typing import List, Any, Optional
from app.core.rate_limit import limiter
import logging

logger = logging.getLogger(__name__)

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

# --- Backtest ---
from pydantic import BaseModel

class BacktestRequest(BaseModel):
    ticker: str
    date: str # YYYY-MM-DD
    sell_date: Optional[str] = None  # Optional sell date
    shares: Optional[float] = None
    investment_amount: Optional[float] = None

@router.post("/backtest")
async def backtest_stock(
    item: BacktestRequest,
    # service: MarketService = Depends(get_market_service) # We use global market_service in this file instead of Depends
):
    """
    Calculate simple backtest return.
    """
    try:
        # Validate inputs
        if item.shares is None and item.investment_amount is None:
            raise HTTPException(status_code=400, detail="Either shares or investment_amount must be provided")

        # 1. Get Historical Price (Buy Date)
        initial_price = await market_service.get_price_at_date(item.ticker, item.date)
        
        if initial_price == 0 or initial_price is None:
            raise HTTPException(status_code=404, detail="No price data found for buy date. Market might be closed or date too old.")

        # 2. Get Sell Price (either sell_date or current)
        if item.sell_date:
            # Use sell date price
            current_price = await market_service.get_price_at_date(item.ticker, item.sell_date)
            if current_price == 0 or current_price is None:
                raise HTTPException(status_code=404, detail="No price data found for sell date.")
        else:
            # Use current market price
            current_data = await market_service.get_aggregated_details(item.ticker)
            current_price = current_data.get("market_data", {}).get("price", 0.0)
            if current_price == 0:
                raise HTTPException(status_code=404, detail="Current price not available.")

        # 3. Calculate Logic
        shares = 0.0
        invested_value = 0.0

        if item.investment_amount is not None:
             invested_value = item.investment_amount
             shares = invested_value / initial_price
        elif item.shares is not None:
             shares = item.shares
             invested_value = shares * initial_price
        
        # Ensure shares is float
        shares = float(shares)

        current_value = current_price * shares
        pnl = current_value - invested_value
        pnl_percent = (pnl / invested_value) * 100 if invested_value > 0 else 0

        # 4. Fetch History for Graph with adaptive interval
        import yfinance as yf
        from datetime import datetime, timedelta
        
        ticker_obj = yf.Ticker(item.ticker if item.ticker.endswith(".NS") else f"{item.ticker}.NS")
        
        # Calculate date range to determine appropriate interval
        start_date = datetime.strptime(item.date, "%Y-%m-%d")
        end_date = datetime.strptime(item.sell_date, "%Y-%m-%d") if item.sell_date else datetime.now()
        days_diff = (end_date - start_date).days
        
        # Adaptive interval selection
        if days_diff <= 7:
            interval = "1d"
            history_df = ticker_obj.history(start=item.date, end=item.sell_date if item.sell_date else None, interval=interval)
        elif days_diff <= 90:
            interval = "1d"
            history_df = ticker_obj.history(start=item.date, end=item.sell_date if item.sell_date else None, interval=interval)
        elif days_diff <= 365:
            interval = "1wk"
            history_df = ticker_obj.history(start=item.date, end=item.sell_date if item.sell_date else None, interval=interval)
        else:
            interval = "1mo"
            history_df = ticker_obj.history(start=item.date, end=item.sell_date if item.sell_date else None, interval=interval)
        
        graph_data = []
        if not history_df.empty:
            for index, row in history_df.iterrows():
                # Format date based on interval
                if interval == "1d":
                    d_str = index.strftime("%d %b")  # "10 Dec"
                elif interval == "1wk":
                    d_str = index.strftime("%d %b")  # "10 Dec"
                else:
                    d_str = index.strftime("%b %Y")  # "Dec 2024"
                
                close_p = row['Close']
                val = close_p * shares
                graph_data.append({"date": d_str, "value": round(val, 2)})

        return {
            "ticker": item.ticker,
            "initial_date": item.date,
            "initial_price": initial_price,
            "current_price": current_price,
            "shares": round(shares, 4),
            "invested_value": round(invested_value, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
            "history": graph_data
        }
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/listing-date/{ticker}")
async def get_listing_date(ticker: str):
    """Get stock listing date."""
    try:
        date = await market_service.get_listing_date(ticker)
        return {"listing_date": date}
    except Exception as e:
        logger.error(f"Error getting listing date: {e}")
        return {"listing_date": ""}

@router.get("/price/{ticker}/{date}")
async def get_price(ticker: str, date: str):
    """Get stock price at specific date."""
    try:
        price = await market_service.get_price_at_date(ticker, date)
        return {"price": price}
    except Exception as e:
        logger.error(f"Error getting price: {e}")
        return {"price": 0.0}

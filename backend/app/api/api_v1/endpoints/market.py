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

@router.get("/analysis/{symbol}")
@limiter.limit("30/minute")
async def get_technical_analysis(request: Request, symbol: str):
    """
    Get technical analysis (RSI, MA, etc.) for a stock.
    Public endpoint.
    """
    try:
        return await market_service.get_technical_summary(symbol)
    except Exception as e:
        # Return empty dict on error to not break frontend
        logger.error(f"Technical analysis failed for {symbol}: {e}")
        return {}

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
        from app.core.calculations import calculate_pnl, get_backtest_graph_data

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

        # 3. Calculate PnL (Using core calculations)
        pnl_data = calculate_pnl(
            initial_price=initial_price,
            current_price=current_price,
            investment_amount=item.investment_amount,
            shares=item.shares
        )
        
        # 4. Fetch History for Graph (Using core calculations)
        # Note: This executes synchronous yfinance call. In high load, should be run_in_executor.
        # For now, we perform it directly as refactoring step.
        graph_data = get_backtest_graph_data(
            ticker=item.ticker,
            start_date=item.date,
            end_date=item.sell_date,
            shares=pnl_data['shares']
        )

        return {
            "ticker": item.ticker,
            "initial_date": item.date,
            "initial_price": initial_price,
            "current_price": current_price,
            "shares": round(pnl_data['shares'], 4),
            "invested_value": round(pnl_data['invested_value'], 2),
            "current_value": round(pnl_data['current_value'], 2),
            "pnl": round(pnl_data['pnl'], 2),
            "pnl_percent": round(pnl_data['pnl_percent'], 2),
            "history": graph_data
        }
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class CompareRequest(BaseModel):
    symbols: List[str]

@router.post("/compare")
async def compare_stocks(item: CompareRequest):
    """
    Compare multiple stocks side-by-side using ComparisonEngine.
    
    Args:
        symbols: List of 2-5 stock symbols to compare
        
    Returns:
        {
            "comparison": {symbol: {...metrics...}},
            "winners": {category: symbol},
            "summary": "text summary"
        }
    """
    try:
        if len(item.symbols) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 stocks to compare")
        if len(item.symbols) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 stocks allowed")
        
        from app.services.recommendation.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        result = await engine.compare_stocks(item.symbols)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

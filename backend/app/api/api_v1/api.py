from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, stock, portfolio, market, ai, history

api_router = APIRouter()

# Auth Router
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(stock.router, prefix="/stocks", tags=["Stocks"])
api_router.include_router(portfolio.router, prefix="/portfolios", tags=["Portfolios"])
api_router.include_router(market.router, prefix="/market", tags=["Market"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
from app.api.api_v1.endpoints import watchlist
api_router.include_router(watchlist.router, prefix="/watchlists", tags=["Watchlist"])

# Force Reload Trigger (History Route Fix)

from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, stock, portfolio, market, ai, history, recommendations, alerts

api_router = APIRouter()

# Auth Router
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(stock.router, prefix="/stocks", tags=["Stocks"])
api_router.include_router(portfolio.router, prefix="/portfolios", tags=["Portfolios"])
api_router.include_router(market.router, prefix="/market", tags=["Market"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
from app.api.api_v1.endpoints import watchlist, mutual_funds
api_router.include_router(watchlist.router, prefix="/watchlists", tags=["Watchlist"])

# Mutual Funds Router
api_router.include_router(mutual_funds.router, prefix="/mutual-funds", tags=["Mutual Funds"])

# Force Reload Trigger (History Route Fix)

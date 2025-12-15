from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, stock, portfolio

api_router = APIRouter()

# Auth Router
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(stock.router, prefix="/stock", tags=["Stock"])
api_router.include_router(portfolio.router, prefix="/portfolios", tags=["Portfolio"])

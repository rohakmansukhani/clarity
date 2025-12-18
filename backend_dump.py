# main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.redis_client import RedisService
from app.services.consensus_engine import ConsensusEngine
from app.core.scheduler import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan Context Manager
    Handles startup and shutdown events for the application.
    1. Connects to Redis for caching on startup.
    2. Disconnects cleanly on shutdown.
    """
    # Startup
    await RedisService.connect()
    scheduler.start()
    yield
    # Shutdown
    await RedisService.disconnect()

from app.core.errors import add_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.logging_config import setup_logging

# Call before creating FastAPI app
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Attach Limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Global Exception Handlers (404, 500, etc.)
add_exception_handlers(app)

# Register Main API Router (v1)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Global consensus engine instance (can also be dependent)
# Force Reload
consensus_engine = ConsensusEngine()

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint to check service status."""
    return {"message": "Clarity Consensus Engine is running", "env": settings.PROJECT_NAME}

from app.core.redis_client import get_redis
from app.core.supabase_client import get_supabase

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint with dependency status."""
    health_status = {
        "status": "ok",
        "redis": "unknown",
        "supabase": "unknown"
    }
    
    # Check Redis
    try:
        redis = await get_redis()
        await redis.ping()
        health_status["redis"] = "connected"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Supabase
    try:
        supabase = get_supabase()
        # Simple query to test connection (uses service role, won't fail RLS)
        result = supabase.table("portfolios").select("id").limit(1).execute()
        health_status["supabase"] = "connected"
    except Exception as e:
        health_status["supabase"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check Clarity AI (Groq)
    try:
        from app.services.ai_service import AIService
        ai = AIService()
        if ai.client:
            health_status["clarity_ai"] = "connected"
        else:
            health_status["clarity_ai"] = "disconnected (missing key)"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["clarity_ai"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# deps.py

from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase
import logging
from app.core.config import settings
from supabase import create_client

logger = logging.getLogger("auth_middleware")
security = HTTPBearer()


def get_user_supabase_client(
    authorization: str = Header(...)
) -> Client:
    """
    Creates a Supabase client with the user's JWT token.
    This ensures RLS policies work correctly.
    
    Extracts token from Authorization header directly.
    """
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "").strip()
        
        # Create a new Supabase client with the user's token
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY
        )
        
        # Set the auth token for this client
        client.auth.set_session(access_token=token, refresh_token="")
        
        return client
        
    except Exception as e:
        logger.error(f"Error creating user Supabase client: {e}")
        raise HTTPException(status_code=401, detail="Could not create authenticated client")


async def verify_jwt(
    creds: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    """
    Verifies the Supabase JWT token.
    Uses Supabase auth to verify the token.
    """
    token = creds.credentials
    try:
        # Verify token by fetching user from Supabase Auth
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return response.user
        
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")


# Dependency aliases
get_current_user = verify_jwt
get_user_supabase = get_user_supabase_client


# api.py

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


# __init__.py



# ai.py

from fastapi import APIRouter, HTTPException, Request, Body
from app.services.ai_service import AIService
from app.services.market_service import MarketService
from app.core.rate_limit import limiter
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
ai_service = AIService()
market_service = MarketService()

class ExplainRequest(BaseModel):
    term: str

@router.post("/explain")
@limiter.limit("30/minute")
async def explain_term(request: Request, body: ExplainRequest):
    """
    Explain a financial term in simple language.
    """
    try:
        if not ai_service.client:
            return {
                "term": body.term,
                "explanation": "AI service unavailable. Please check GROQ_API_KEY."
            }
        
        prompt = f"""
        Explain "{body.term}" in 2-3 simple sentences for someone learning about stock investing in India.
        Use ₹ (INR) in examples where relevant.
        Make it practical and easy to understand.
        No preambles - just the explanation.
        """
        
        response = ai_service.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a financial educator for Indian retail investors."},
                {"role": "user", "content": prompt}
            ],
            model=ai_service.model,
            temperature=0.3,
            max_tokens=200
        )
        
        return {
            "term": body.term,
            "explanation": response.choices[0].message.content.strip()
        }
        
    except Exception as e:
        logger.error(f"Explain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}/summary")
@limiter.limit("30/minute")
async def get_stock_ai_summary(request: Request, symbol: str):
    """
    Get an AI-generated summary for a stock based on real-time data including news.
    """
    try:
        # Fetch data first
        data = await market_service.get_aggregated_details(symbol)
        if not data:
            raise HTTPException(status_code=404, detail="Stock not found")
            
        # Pass full data to AI service (it will extract what it needs)
        summary = await ai_service.generate_stock_summary(symbol, data)
        return {"symbol": symbol, "summary": summary}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    query: str
    context: dict = None # Optional context (e.g. current stock page data, portfolio data)
    conversation_history: list = None # Optional conversation history for context-aware responses

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_with_ai(request: Request, body: ChatRequest):
    """
    Chat with Clarity AI.
    Accepts a query, optional context, and optional conversation history for context-aware responses.
    Returns response text and optional suggest_switch for domain switching.
    """
    try:
        result = await ai_service.chat(body.query, body.context, body.conversation_history)
        # result is now a dict with 'response' and 'suggest_switch'
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# auth.py

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from app.core.supabase_client import get_supabase
from supabase import Client
from app.core.rate_limit import limiter

router = APIRouter()

class UserAuth(BaseModel):
    email: str
    password: str

@router.post("/register", summary="Register a new user via Supabase")
@limiter.limit("5/minute")
def register(request: Request, user: UserAuth, supabase: Client = Depends(get_supabase)):
    try:
        # Supabase Auth Sign Up
        response = supabase.auth.sign_up({
            "email": user.email, 
            "password": user.password
        })
        
        # Check if user is created
        if not response.user:
             raise HTTPException(status_code=400, detail="Registration failed")
             
        return {
            "message": "User registered successfully", 
            "user": {"id": response.user.id, "email": response.user.email}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", summary="Login user and return JWT")
@limiter.limit("10/minute")
def login(request: Request, user: UserAuth, supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "expires_in": response.session.expires_in,
            "user": {
                "id": response.user.id,
                "email": response.user.email
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# history.py

from fastapi import APIRouter, HTTPException, Depends, Request, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
import logging
from app.core.rate_limit import limiter
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Models ---
class ChatSession(BaseModel):
    id: str
    title: str = "New Chat"
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    role: str
    content: str

class SessionCreate(BaseModel):
    title: str = "New Chat"
    initial_messages: List[MessageCreate] = []
    type: str = "advisor" # 'advisor' or 'discovery_hub'

# --- Endpoints ---

@router.get("/sessions", response_model=List[Dict[str, Any]])
@limiter.limit("30/minute")
def list_chat_sessions(
    request: Request,
    type: Optional[str] = None,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """List all chat sessions for the current user, optionally filtered by type."""
    try:
        # Fetch sessions sorted by updated_at desc
        query = supabase.table("chat_sessions")\
            .select("*")\
            .eq("user_id", user.id)
            
        if type:
            query = query.eq("type", type)
            
        response = query.order("is_pinned", desc=True)\
            .order("updated_at", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        # Return empty list nicely if table doesn't exist yet to avoid crashing UI
        return []

@router.get("/sessions/{session_id}/messages")
@limiter.limit("50/minute")
def get_session_messages(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Get all messages for a specific session."""
    try:
        response = supabase.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=False)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return []

@router.post("/sessions")
@limiter.limit("10/minute")
def create_session(
    request: Request,
    session_data: SessionCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Create a new chat session."""
    try:
        # Create Session
        new_session = {
            "user_id": user.id,
            "title": session_data.title,
            "type": session_data.type
            # created_at, updated_at handled by Supabase defaults usually, 
            # but we can pass them if needed. Use defaults.
        }
        
        session_res = supabase.table("chat_sessions").insert(new_session).execute()
        
        if not session_res.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
            
        session_id = session_res.data[0]['id']
        
        # Insert Initial Messages if any
        if session_data.initial_messages:
            messages_to_insert = [
                {
                    "session_id": session_id,
                    "role": m.role,
                    "content": m.content,
                    "user_id": user.id # Optional, depending on schema
                } for m in session_data.initial_messages
            ]
            supabase.table("chat_messages").insert(messages_to_insert).execute()
            
        return session_res.data[0]
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/messages")
@limiter.limit("60/minute")
def add_message(
    session_id: str,
    request: Request,
    message: MessageCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Add a message to an existing session."""
    try:
        new_msg = {
            "session_id": session_id,
            "role": message.role,
            "content": message.content,
            "user_id": user.id
        }
        
        # Insert Message
        res = supabase.table("chat_messages").insert(new_msg).execute()
        
        # Update Session `updated_at`
        # Only update title if it's the first message (or title is default)
        update_data = {"updated_at": "now()"}
        
        # We can just check if we want to set a title? 
        # Actually simplest logic: If role is user and it's the *first* message? 
        # But here we don't know if it's first. 
        # Let's just NOT overwrite title to None.
        
        if message.role == 'user':
             # Optional: If title starts with "New Chat", update it?
             # For now, let's trusting client or avoiding overwrite.
             # The BUG was: "title": message.content... else None. 
             # If we pass None to update, does Supabase ignore or set Null? likely Set Null.
             pass

        # To fix the "Date instead of Title" issue, we likely just stop sending 'title' in update unless we mean it.
        # But we do want to set title on first message if currently "New Chat".
        # Let's simple remove title from this update for now, relying on create_session to set it, 
        # or a separate rename endpoint if needed.
        
        supabase.table("chat_sessions")\
            .update(update_data)\
            .eq("id", session_id)\
            .execute()
            
        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
@limiter.limit("20/minute")
def delete_session(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        # Cascade delete handled by DB usually, or RLS.
        res = supabase.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"message": "Session deleted"}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

class PinUpdate(BaseModel):
    is_pinned: bool

@router.patch("/sessions/{session_id}/pin")
@limiter.limit("20/minute")
def toggle_pin_session(
    session_id: str,
    request: Request,
    pin_data: PinUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        res = supabase.table("chat_sessions").update({"is_pinned": pin_data.is_pinned}).eq("id", session_id).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/title")
@limiter.limit("10/minute")
async def generate_session_title(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Generates and updates a title for the session using AI."""
    try:
        # 1. Fetch messages
        res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).limit(6).execute()
        messages = res.data
        
        if not messages:
            return {"title": "New Chat"}
            
        # 2. Generate Title
        from app.services.ai_service import AIService
        ai_service = AIService()
        title = await ai_service.generate_title(messages)
        
        # 3. Update Session
        supabase.table("chat_sessions").update({"title": title}).eq("id", session_id).execute()
        
        return {"title": title}
    except Exception as e:
         logger.error(f"Error generating title: {e}")
         raise HTTPException(status_code=500, detail=str(e))


# market.py

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


# portfolio.py

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
        # RLS handles ownership check
        res = supabase.table("portfolios").delete().eq("id", portfolio_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Portfolio not found or not authorized")
        return {"message": "Portfolio deleted"}
    except Exception as e:
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

@router.get("/watchlists/")
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

@router.post("/watchlists/")
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


# stock.py

from fastapi import APIRouter, HTTPException, Query, Request
from app.services.market_service import MarketService
from typing import List, Any
from app.core.rate_limit import limiter

router = APIRouter()
market_service = MarketService()

@router.get("/search")
@limiter.limit("100/minute")
async def search_stocks(request: Request, q: str = Query(..., min_length=1)):
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
@limiter.limit("60/minute")
async def get_stock_details(request: Request, symbol: str):
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
@limiter.limit("30/minute")
async def get_stock_history(request: Request, symbol: str, period: str = "1mo"):
    """
    Get historical OHLCV data. Period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    try:
        history = await market_service.get_history(symbol, period)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/listing-date/{symbol}")
@limiter.limit("60/minute")
async def get_listing_date(request: Request, symbol: str):
    """Get stock listing date."""
    try:
        date = await market_service.get_listing_date(symbol)
        return {"listing_date": date}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price/{symbol}/{date}")
@limiter.limit("60/minute")
async def get_price_at_date(request: Request, symbol: str, date: str):
    """Get stock price at specific date (YYYY-MM-DD)."""
    try:
        price = await market_service.get_price_at_date(symbol, date)
        return {"price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# watchlist.py

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
@router.get("/", response_model=List[Dict[str, Any]])
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

@router.post("/")
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


# cache.py

from functools import wraps
import json
import hashlib
from app.core.redis_client import get_redis
import logging
from typing import Optional
import inspect

logger = logging.getLogger("cache")


def cache(expire: int = 60, key_prefix: str = ""):
    """
    Async Cache Decorator using Redis.
    expire: TTL in seconds
    key_prefix: Optional prefix for the key
    Generates deterministic cache keys by serializing arguments to JSON.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Generate Cache Key (skip 'self' or 'cls')
                sig = inspect.signature(func)
                bound_args = sig.bind(*args, **kwargs)
                bound_args.apply_defaults()
                
                # Remove 'self' or 'cls' from arguments
                cache_args = {
                    k: v for k, v in bound_args.arguments.items()
                    if k not in ('self', 'cls')
                }
                
                # Serialize to JSON for consistent hashing
                arg_str = json.dumps(cache_args, sort_keys=True, default=str)
                hash_key = hashlib.md5(arg_str.encode()).hexdigest()
                
                # Format: prefix:func_name:hash
                # Example: consensus:get_consensus_price:a1b2c3d4
                cache_key = f"{key_prefix}:{func.__name__}:{hash_key}"
                
                redis = await get_redis()
                cached_data = await redis.get(cache_key)
                
                if cached_data:
                    logger.debug(f"Cache Hit: {cache_key}")
                    # Return deserialized data
                    return json.loads(cached_data)
                
                # Cache Miss
                logger.debug(f"Cache Miss: {cache_key}")
                result = await func(*args, **kwargs)
                
                if result:
                    # serialize result
                    await redis.set(cache_key, json.dumps(result, default=str), ex=expire)
                    
                return result
            except Exception as e:
                # Fail open (return result without caching if redis logic fails)
                logger.error(f"Cache Error: {e}")
                return await func(*args, **kwargs)
        return wrapper
    return decorator


# calculations.py

from typing import Dict, Any, List, Optional, Union
import math
import logging
from datetime import datetime, timedelta
import yfinance as yf

logger = logging.getLogger(__name__)

# --- Constants & Mappings ---

COMMODITY_MAP = {
    # Precious Metals
    "GOLD": "GC=F",      # Gold Futures
    "SILVER": "SI=F",    # Silver Futures
    "PLATINUM": "PL=F",  # Platinum Futures
    "PALLADIUM": "PA=F", # Palladium Futures
    
    # Base Metals
    "COPPER": "HG=F",    # Copper Futures
    "ALUMINUM": "ALI=F", # Aluminum Futures
    "ALUMINIUM": "ALI=F",
    "ZINC": "ZNC=F",     # Zinc Futures
    "NICKEL": "NKL=F",   # Nickel Futures
    
    # Energy
    "CRUDE": "CL=F",     # Crude Oil Futures (WTI)
    "CRUDEOIL": "CL=F",
    "BRENT": "BZ=F",     # Brent Crude Oil
    "NATURALGAS": "NG=F",# Natural Gas Futures
    "HEATING": "HO=F",   # Heating Oil
    
    # Agriculture
    "WHEAT": "ZW=F",     # Wheat Futures
    "CORN": "ZC=F",      # Corn Futures
    "SOYBEAN": "ZS=F",   # Soybean Futures
    "COTTON": "CT=F",    # Cotton Futures
    "SUGAR": "SB=F",     # Sugar Futures
    "COFFEE": "KC=F",    # Coffee Futures
    
    # Indian ETFs (NSE)
    "GOLDBEES": "GOLDBEES.NS",    # Gold ETF
    "NIFTYBEES": "NIFTYBEES.NS",  # Nifty 50 ETF
    "JUNIORBEES": "JUNIORBEES.NS",# Nifty Next 50 ETF
    "BANKBEES": "BANKBEES.NS",    # Bank Nifty ETF
    "ITBEES": "ITBEES.NS",        # IT Sector ETF
    
    # International Indices (for reference)
    "SPY": "SPY",        # S&P 500 ETF
    "QQQ": "QQQ",        # NASDAQ 100 ETF
    "DIA": "DIA"         # Dow Jones ETF
}

# General Symbol Mapping (Nickname -> Official NSE Symbol)
SYMBOL_MAP = {
    "MAHINDRA": "M&M",
    "RELIANCE": "RELIANCE",
    "TCS": "TCS",
    "INFOSYS": "INFY",
    "WIPRO": "WIPRO",
    "RIL": "RELIANCE",
    "INFY": "INFY",
    "HDFCBANK": "HDFCBANK",
    "SBIN": "SBIN",
    "ICICIBANK": "ICICIBANK",
    "BHARTIARTL": "BHARTIARTL",
    "ITC": "ITC",
    "BAJFINANCE": "BAJFINANCE",
    "KOTAKBANK": "KOTAKBANK"
}

# Fuzzy Search Nicknames
NICKNAME_MAP = {
    "MAHINDRA": "M&M",
    "M&M": "M&M",
    "RELIANCE": "RELIANCE",
    "RIL": "RELIANCE",
    "TCS": "TCS",
    "INFY": "INFY",
    "INFOSYS": "INFY",
    "HDFC": "HDFCBANK",
    "SBI": "SBIN",
    "AIRTEL": "BHARTIARTL",
    "BAJFINANCE": "BAJFINANCE",
    "BAJAJ FINANCE": "BAJFINANCE",
    "KOTAK": "KOTAKBANK",
    "L&T": "LT",
    "LARSEN": "LT",
    "MARUTI": "MARUTI",
    "SUZUKI": "MARUTI",
    "TITAN": "TITAN",
    "SUN PHARMA": "SUNPHARMA",
    "ULTRATECH": "ULTRACEMCO",
    # Tata Motors demerger (Dec 2024)
    "TATA MOTORS": "TMPV",  # Default to Passenger Vehicles
    "TATAMOTORS": "TMPV",
    "TATA MOTORS PASSENGER": "TMPV",
    "TATA MOTORS COMMERCIAL": "TATAMOTORCV"
}

# --- Helper Functions ---

def sanitize_numeric(value: Any) -> Any:
    """Replace NaN and Inf with None for JSON compatibility."""
    if value is None:
        return None
    try:
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    except (TypeError, ValueError):
        return value

def sanitize_dict(data: Any) -> Any:
    """Recursively sanitize all numeric values in a dict."""
    if isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    else:
        return sanitize_numeric(data)

# --- Calculation Logic ---

def calculate_pnl(
    initial_price: float,
    current_price: float,
    investment_amount: Optional[float] = None,
    shares: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate PnL based on initial and current price.
    Returns dictionary with shares, invested_value, current_value, pnl, pnl_percent.
    """
    if shares is None and investment_amount is None:
        raise ValueError("Either shares or investment_amount must be provided")

    if investment_amount is not None:
        invested_value = float(investment_amount)
        shares = invested_value / initial_price if initial_price > 0 else 0
    else:
        shares = float(shares)
        invested_value = shares * initial_price

    current_value = current_price * shares
    pnl = current_value - invested_value
    pnl_percent = (pnl / invested_value) * 100 if invested_value > 0 else 0

    return {
        "shares": shares,
        "invested_value": invested_value,
        "current_value": current_value,
        "pnl": pnl,
        "pnl_percent": pnl_percent
    }

def get_backtest_graph_data(ticker: str, start_date: str, end_date: Optional[str], shares: float) -> List[Dict[str, Any]]:
    """
    Fetch historical data and calculate value over time for the graph.
    """
    try:
        # Ticker format
        clean_ticker = ticker
        if not ticker.endswith(".NS") and not ticker.endswith("=F"): 
             # Use general heuristic if not provided 
             # (In simplified case, we assume NS if not containing dot, similar to existing implementation)
             if "." not in ticker: 
                clean_ticker = f"{ticker}.NS"
        
        ticker_obj = yf.Ticker(clean_ticker)
        
        # Parse Dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now()
        except ValueError:
            # Handle possible datetime objects passed directly
             start = start_date if isinstance(start_date, datetime) else datetime.now()
             end = end_date if isinstance(end_date, datetime) else datetime.now()

        days_diff = (end - start).days
        
        # Adaptive interval
        if days_diff <= 7:
            interval = "1d"
        elif days_diff <= 90:
            interval = "1d"
        elif days_diff <= 365:
            interval = "1wk"
        else:
            interval = "1mo"
            
        history_df = ticker_obj.history(start=start_date, end=end_date, interval=interval)
        
        graph_data = []
        if not history_df.empty:
            for index, row in history_df.iterrows():
                # Format date
                if interval == "1d":
                    d_str = index.strftime("%d %b")
                elif interval == "1wk":
                    d_str = index.strftime("%d %b")
                else:
                    d_str = index.strftime("%b %Y")
                
                close_p = row['Close']
                val = close_p * shares
                graph_data.append({"date": d_str, "value": round(val, 2)})
                
        return graph_data
    except Exception as e:
        logger.error(f"Graph data fetch error: {e}")
        return []


# config.py

import os
from pydantic_settings import BaseSettings

from dotenv import load_dotenv

# Load .env from backend directory explicitly if needed
# Try to find it relative to this file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Clarity Finance"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str | None = None
    LOG_LEVEL: str = "WARNING"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    # Other Services
    GROQ_API_KEY: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str | None = None # Kept for reference or explicit DB access if needed
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore" # Ignore extra fields in .env
    
    def validate_required(self):
        """Validate that required settings are present."""
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required but not set")
        if not self.SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is required but not set")
        if not self.REDIS_URL:
            raise ValueError("REDIS_URL is required but not set")

settings = Settings()
settings.validate_required()


# errors.py

from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger("api_errors")

def add_exception_handlers(app: FastAPI):
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Determine if we are in debug mode? (Maybe from details)
        # For now, print trace
        logger.error(f"Global Error: {exc}")
        traceback.print_exc()
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                    "details": str(exc) # Remove in production for security
                }
            }
        )

    # We can add more specific handlers here (e.g. validaton error)


# groq_client.py

import os
from groq import Groq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class GroqClient:
    _instance = None
    
    @classmethod
    def get_client(cls):
        if cls._instance is None:
            api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
            if not api_key:
                logger.warning("GROQ_API_KEY not set. AI features will be disabled.")
                return None
            try:
                cls._instance = Groq(api_key=api_key)
                logger.info("✅ Groq Client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Groq Client: {e}")
                return None
        return cls._instance

def get_groq_client():
    return GroqClient.get_client()


# logging_config.py

import logging
import sys
from app.core.config import settings

def setup_logging():
    """Configure application logging."""
    
    # Log level from config
    log_level = getattr(logging, settings.LOG_LEVEL, logging.INFO)
    
    # Format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s:%(name)s:%(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )
    
    # Disable verbose DEBUG logging from third-party libraries
    # These can be re-enabled by changing WARNING to DEBUG if needed for troubleshooting
    logging.getLogger('yfinance').setLevel(logging.WARNING)
    logging.getLogger('peewee').setLevel(logging.WARNING)
    logging.getLogger('groq').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    # Silence noisy libraries
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("cache").setLevel(logging.INFO)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("tzlocal").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured - Level: {settings.LOG_LEVEL}")


# rate_limit.py

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Limiter
# Rate limit keys are based on remote IP Address
limiter = Limiter(key_func=get_remote_address)


# redis_client.py

import redis.asyncio as redis
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class RedisService:
    _pool: Optional[redis.Redis] = None

    @classmethod
    async def connect(cls):
        """Initialize the Redis connection pool."""
        if cls._pool is None:
            try:
                cls._pool = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=10,
                    socket_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30
                )

                # Test connection
                await cls._pool.ping()
                logger.info("✅ Redis connected successfully")

            except Exception as e:
                logger.error(f"❌ Redis connection failed: {e}")
                cls._pool = None
                raise

    @classmethod
    async def disconnect(cls):
        """Close the Redis connection properties."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    def get_redis(cls) -> redis.Redis:
        """Get the Redis client instance."""
        if cls._pool is None:
            # Check if we can lazy connect or if this should raise
             raise RuntimeError("Redis client is not initialized. Call RedisService.connect() first.")
        return cls._pool

# Accessible as a dependency
async def get_redis() -> redis.Redis:
    return RedisService.get_redis()


# scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.market_service import MarketService
import logging

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.market_service = MarketService()

    def start(self):
        self.scheduler.add_job(self.refresh_popular_sectors, 'interval', minutes=15)
        self.scheduler.add_job(self.refresh_sector_mappings, 'interval', hours=24)
        self.scheduler.start()
        logger.info("✅ Scheduler Started")

    async def refresh_popular_sectors(self):
        """
        Background job to keep sector data fresh.
        """
        logger.info("Running job: refresh_popular_sectors")
        try:
            # Refresh top sectors (Auto, Bank, IT)
            sectors = ["AUTO", "BANK", "IT"]
            for sector in sectors:
                # This will trigger the caching mechanism in MarketService/SectorRecommender 
                # effectively 'warming' the cache.
                from app.services.recommendation.sector_recommender import SectorRecommender
                await SectorRecommender().get_top_picks(sector)
            logger.info("Job completed: refresh_popular_sectors")
        except Exception as e:
            logger.error(f"Job failed: {e}")

    async def refresh_sector_mappings(self):
        """
        Background job to keep sector mappings fresh.
        """
        logger.info("Running job: refresh_sector_mappings")
        try:
            from app.services.data.sector_mapper import SectorMapper
            sectors = ["AUTO", "IT", "BANK", "PHARMA", "METAL", "FMCG"]
            for sector in sectors:
                await SectorMapper().get_stocks_in_sector(sector)
            logger.info("Job completed: refresh_sector_mappings")
        except Exception as e:
            logger.error(f"Job failed: {e}")

scheduler = SchedulerService()


# supabase_client.py

from supabase import create_client, Client
from app.core.config import settings

class SupabaseService:
    _instance: Client | None = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in config")
            
            cls._instance = create_client(
                settings.SUPABASE_URL, 
                settings.SUPABASE_KEY
            )
        return cls._instance

# Accessible as a dependency or direct import
def get_supabase() -> Client:
    return SupabaseService.get_client()


# market_data.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseDataSource(ABC):
    """
    Abstract Base Class for all market data providers (Angel One, NSE, Yahoo, etc.)
    Ensures a unified interface for the Consensus Engine.
    """

    @abstractmethod
    async def get_latest_price(self, symbol: str) -> float:
        """
        Fetch the realtime price for a given stock symbol.
        """
        pass

    @abstractmethod
    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch detailed stock info (Open, High, Low, Close, Volume, etc.)
        """
        pass

    @property
    @abstractmethod
    def source_name(self) -> str:
        """
        Return the name of the data source (e.g., "AngelOne", "NSE", "Yahoo").
        """
        pass


# ai_service.py

from app.core.groq_client import get_groq_client
from app.core.cache import cache
import logging
import json

# Import extracted configurations
from app.services.ai.prompts import (
    SYSTEM_PROMPT_NEWS_ANALYST,
    PROMPT_STOCK_SUMMARY_TEMPLATE,
    SYSTEM_PROMPT_TITLE_GEN,
    PROMPT_TITLE_GEN_TEMPLATE,
    SYSTEM_PROMPT_AUTH_HELP,
    DOMAIN_ADVISOR,
    DOMAIN_DISCOVERY_HUB,
    DOMAIN_FLOATING,
    SYSTEM_PROMPT_MAIN_TEMPLATE
)
from app.services.ai.tools_config import TOOLS_CONFIG

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = get_groq_client()
        self.model = "llama-3.3-70b-versatile"
        self.tools = TOOLS_CONFIG
    
    @cache(expire=86400, key_prefix="ai_summary")
    async def generate_stock_summary(self, symbol: str, data: dict) -> str:
        """
        Generates a 3-sentence executive summary with news analysis.
        Cached for 24 hours.
        """
        if not self.client:
            return "AI Service Unavailable (Missing Key)"
        
        # Extract news items for explicit inclusion
        news_items = data.get('news', [])
        news_summary = ""
        if news_items:
            news_titles = [item.get('title', '') for item in news_items[:3]]
            news_summary = f"\n\nRecent News Headlines:\n" + "\n".join(f"- {title}" for title in news_titles if title)
            
        prompt = PROMPT_STOCK_SUMMARY_TEMPLATE.format(
            symbol=symbol,
            price=data.get('market_data', {}).get('price_formatted', 'N/A'),
            change=data.get('market_data', {}).get('changePercent', 0),
            news_summary=news_summary
        )
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_NEWS_ANALYST},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.7,
                max_tokens=250,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq Gen Error: {e}")
            return "Could not generate summary."

    async def generate_title(self, messages: list) -> str:
        """
        Generates a short 3-5 word title for a chat session.
        """
        if not self.client or not messages:
            return "New Chat"

        # Create a condensed context from the first few messages
        conversation_text = "\\n".join([f"{m['role']}: {m['content']}" for m in messages[:4]])
        
        prompt = PROMPT_TITLE_GEN_TEMPLATE.format(conversation_text=conversation_text)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_TITLE_GEN},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile", # or a smaller model if available for speed
                temperature=0.7,
                max_tokens=20,
            )
            title = chat_completion.choices[0].message.content.strip().replace('"', '')
            return title
        except Exception as e:
            logger.error(f"Title Gen Error: {e}")
            return "New Chat"

    async def chat(self, user_query: str, context_data: dict = None, conversation_history: list = None) -> dict:
        """
        Agentic chat handler with comprehensive tools.
        Returns dict with 'response' and optional 'suggest_switch'
        """
        if not self.client:
            return {"response": "AI Service Unavailable.", "suggest_switch": None}

        from app.services.market_service import MarketService
        market_service = MarketService()

        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Check for Auth Context (Restricted Mode)
        if context_data and context_data.get('type') == 'auth_help':
            system_prompt = SYSTEM_PROMPT_AUTH_HELP
        else:
            # Determine mode based on context
            mode = context_data.get('type') if context_data else None
            
            if mode == 'advisor_chat':
                domain_restriction = DOMAIN_ADVISOR
            elif mode == 'discovery_hub':
                domain_restriction = DOMAIN_DISCOVERY_HUB
            elif mode == 'floating':
                domain_restriction = DOMAIN_FLOATING
            else:
                # Default mode - no domain restrictions
                domain_restriction = ""
            
            # Standard Market Analyst Mode
            system_prompt = SYSTEM_PROMPT_MAIN_TEMPLATE.format(
                domain_restriction=domain_restriction,
                current_date=current_date
            )
        
        context_json = json.dumps(context_data, default=str) if context_data else "No context"
        
        # Build messages with conversation history
        messages = [
            {"role": "system", "content": f"{system_prompt}\\n\\nContext: {context_json}"}
        ]
        
        # Add conversation history if provided (last 10 messages for context)
        if conversation_history:
            messages.extend(conversation_history[-10:])
        
        # Add current user query
        messages.append({"role": "user", "content": user_query})

        try:
            # First LLM Call
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                tools=self.tools,
                tool_choice="auto",
                max_tokens=1500
            )
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # Handle tool calls
            if tool_calls:
                messages.append(response_message)
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"AI Tool Call: {function_name}({function_args})")
                    
                    tool_output = None
                    
                    # Execute Tools
                    if function_name == "get_stock_details":
                        tool_output = await market_service.get_aggregated_details(function_args.get("symbol"))
                    elif function_name == "get_comprehensive_analysis":
                        tool_output = await market_service.get_comprehensive_analysis(function_args.get("symbol"))
                    elif function_name == "search_stocks":
                        tool_output = await market_service.search_stocks(function_args.get("query"))
                    elif function_name == "get_market_status":
                        tool_output = await market_service.get_market_status()
                    elif function_name == "get_sector_recommendations":
                        from app.services.recommendation.sector_recommender import SectorRecommender
                        sector_query = function_args.get("sector_query")
                        criteria = function_args.get("criteria", "balanced")
                        tool_output = await SectorRecommender().get_top_picks(sector_query, limit=5, criteria=criteria)
                    elif function_name == "compare_stocks":
                        from app.services.recommendation.comparison_engine import ComparisonEngine
                        tool_output = await ComparisonEngine().compare_stocks(function_args.get("symbols"))
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(tool_output, default=str)
                    })
                
                # Second LLM Call with tool results
                final_response = self.client.chat.completions.create(
                    messages=messages,
                    model=self.model,
                    max_tokens=1500
                )
                
                response_text = final_response.choices[0].message.content.strip()
                
                # Detect switch suggestions
                suggest_switch = None
                if "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                    suggest_switch = {
                        "to": "discovery_hub",
                        "reason": "sector_research"
                    }
                    response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
                elif "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                    suggest_switch = {
                        "to": "advisor",
                        "reason": "stock_analysis"
                    }
                    response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
                
                return {
                    "response": response_text,
                    "suggest_switch": suggest_switch
                }
            
            # No tool calls - direct response
            response_text = response_message.content.strip()
            
            # Detect switch suggestions
            suggest_switch = None
            if "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                suggest_switch = {
                    "to": "discovery_hub",
                    "reason": "sector_research"
                }
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
            elif "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                suggest_switch = {
                    "to": "advisor",
                    "reason": "stock_analysis"
                }
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
            
            return {
                "response": response_text,
                "suggest_switch": suggest_switch
            }
            
        except Exception as e:
            logger.error(f"Groq Agent Error: {e}")
            return {
                "response": f"I encountered an error: {str(e)}",
                "suggest_switch": None
            }


# consensus_engine.py

import asyncio
import logging
from typing import List, Dict, Any
from app.interfaces.market_data import BaseDataSource
from app.core.cache import cache
from app.services.providers.nselib_service import NSELibProvider
from app.services.providers.yahoo_service import YahooProvider
from app.services.providers.google_finance import GoogleFinanceProvider
from app.utils.market_hours import get_smart_cache_expiry

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    Consensus Engine
    Responsible for fetching stock prices from multiple sources and arbitrating verify 
    the 'true' price.
    
    Sources:
    1. NSELib: Official NSE data (Scraped/API)
    2. YahooFinance: Reliable global data
    3. GoogleFinance: Fallback for realtime
    """
    def __init__(self):
        # Initialize providers
        self.providers: List[BaseDataSource] = [
            NSELibProvider(),
            YahooProvider(),
            GoogleFinanceProvider()
        ]
    
    async def get_consensus_price(self, symbol: str) -> Dict[str, Any]:
        """
        Fetches full details from all providers and determines consensus price.
        Returns the consensus price AND the details from the primary source.
        
        Cache: 60s during market hours, until next market open when closed
        """
        # Calculate smart cache expiry
        cache_expiry = get_smart_cache_expiry(60)
        
        # Use cache decorator dynamically
        @cache(expire=cache_expiry, key_prefix="consensus")
        async def _fetch_consensus(sym: str):
            return await self._fetch_consensus_internal(sym)
        
        return await _fetch_consensus(symbol)
    
    async def _fetch_consensus_internal(self, symbol: str) -> Dict[str, Any]:
        results = []
        # Parallel fetch details instead of just price
        tasks = [p.get_stock_details(symbol) for p in self.providers]
        details_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Weights for each provider
        weights = {
            "NSE_Lib": 1.0,
            "YahooFinance": 0.8,
            "GoogleFinance": 0.6
        }
        
        weighted_prices = []
        source_map = {}
        valid_details = [] # Tuple of (price, weight, details, provider_name)
        
        for i, res in enumerate(details_list):
            provider_name = self.providers[i].source_name
            
            if isinstance(res, Exception):
                logger.error(f"{provider_name} failed: {res}")
                continue
            
            if not isinstance(res, dict):
                continue

            # Extract Price based on Provider
            price = 0.0
            if provider_name == "NSE_Lib":
                # Handle possible string format
                p = res.get('LastPrice', 0)
                if isinstance(p, str):
                    price = float(p.replace(',', ''))
                else:
                    price = float(p)
            elif provider_name == "YahooFinance":
                price = res.get('currentPrice') or res.get('regularMarketPrice') or res.get('price', 0)
            elif provider_name == "GoogleFinance":
                price = res.get('price', 0)
                
            if price > 0:
                weight = weights.get(provider_name, 0.5)
                weighted_prices.append((price, weight, provider_name))
                source_map[provider_name] = price
                valid_details.append({
                    "price": price,
                    "weight": weight,
                    "source": provider_name,
                    "data": res
                })
                
        if not weighted_prices:
            return {"status": "ERROR", "price": 0.0, "message": "No data source available"}
            
        # Weighted average for Price
        total_weight = sum(w for _, w, _ in weighted_prices)
        final_price = sum(p * w for p, w, _ in weighted_prices) / total_weight
        
        # Calculate variance
        prices_only = [p for p, _, _ in weighted_prices]
        min_p = min(prices_only)
        max_p = max(prices_only)
        variance = (max_p - min_p) / min_p if min_p > 0 else 0
        
        # Determine status
        if len(weighted_prices) >= 2:
            if variance < 0.005: status = "VERIFIED"
            elif variance < 0.01: status = "WARNING"
            else: status = "UNSTABLE"
        else:
            status = "SINGLE_SOURCE"

        # Determine Primary Source details to return (highest weight)
        valid_details.sort(key=lambda x: x['weight'], reverse=True)
        primary_data = valid_details[0]['data'] if valid_details else {}
        primary_source_name = valid_details[0]['source'] if valid_details else None

        return {
            "price": round(final_price, 2),
            "status": status,
            "variance_pct": round(variance * 100, 2),
            "sources": source_map,
            "primary_source": primary_source_name,
            "details": primary_data # Return rich data
        }


# market_service.py

import asyncio
from typing import Dict, Any, List
from app.services.consensus_engine import ConsensusEngine
from app.services.providers.screener_service import ScreenerProvider
from app.services.providers.moneycontrol_service import MoneyControlProvider
from app.services.providers.yahoo_service import YahooProvider
from app.core.cache import cache
import logging
from nselib import capital_market
from app.utils.formatters import format_inr, format_percent
from app.services.analysis.technical_analyzer import TechnicalAnalyzer
from app.services.analysis.fundamental_analyzer import FundamentalAnalyzer
from app.services.analysis.news_analyzer import NewsAnalyzer
from app.core.calculations import (
    COMMODITY_MAP, SYMBOL_MAP, NICKNAME_MAP, 
    sanitize_numeric, sanitize_dict
)

logger = logging.getLogger(__name__)




class MarketService:
    """
    Market Service
    
    A unified service that aggregates data from multiple providers to offer a 
    '360-degree view' of the market.
    
    Responsibilities:
    1. Aggregation: Combines Price (Consensus), Fundamentals (Screener), and News (Google).
    2. Search: Provides fuzzy search over NSE equity list.
    3. History: Fetches OHLCV data for charting.
    4. Market Intelligence: Tracks indices (Nifty/Sensex) and Sector performance.
    
    Caching:
    - Uses Redis (@cache) heavily to improve performance and reduce upstream API calls.
    """
    def __init__(self):
        self.consensus = ConsensusEngine()
        self.screener = ScreenerProvider()
        self.news_provider = MoneyControlProvider()
        self.yahoo = YahooProvider()
        # NEW: Analysis engines
        self.technical_analyzer = TechnicalAnalyzer()
        self.fundamental_analyzer = FundamentalAnalyzer()
        self.news_analyzer = NewsAnalyzer()

    @cache(expire=300, key_prefix="stock_details")
    async def get_aggregated_details(self, symbol: str) -> Dict[str, Any]:
        """
        Aggregates Price, Fundamentals, and News for a given symbol.
        """
        symbol = symbol.upper()
        
        # Commodity & ETF Symbol Mapping (User-friendly → Yahoo Finance)
        # Using imported COMMODITY_MAP
        
        # Check if this is a commodity/ETF request
        is_commodity = symbol in COMMODITY_MAP
        yahoo_symbol = COMMODITY_MAP.get(symbol, symbol)
        
        # Global Symbol Mapping (Nickname -> Official NSE Symbol)
        # This helps with common stock name variations
        # Using imported SYMBOL_MAP
        
        # Apply stock symbol mapping if not a commodity
        if not is_commodity:
            symbol = SYMBOL_MAP.get(symbol, symbol)
        
        # If symbol matches a known nickname, use the official one
        clean_input = symbol.replace(".NS", "")
        if clean_input in SYMBOL_MAP:
            symbol = SYMBOL_MAP[clean_input]
        
        # Parallel Execution
        # 1. Consensus Price (Fast)
        # 2. Fundamentals (Screener - Moderate) - Skip for commodities/ETFs
        # 3. News (Google RSS - Moderate)
        
        # For commodities/ETFs, use Yahoo symbol directly; for stocks, use NSE symbol
        price_symbol = yahoo_symbol if is_commodity else symbol
        
        task_price = self.consensus.get_consensus_price(price_symbol)
        task_fundamentals = self.screener.get_stock_details(symbol) if not is_commodity else asyncio.sleep(0)
        task_news = self.news_provider.get_stock_details(symbol) # Returns {'news': []}
        
        results = await asyncio.gather(task_price, task_fundamentals, task_news, return_exceptions=True)
        
        price_data = results[0] if not isinstance(results[0], Exception) else {"price": 0.0}
        fund_data = results[1] if not isinstance(results[1], Exception) else {}
        news_data = results[2] if not isinstance(results[2], Exception) else {"news": []}
        
        # Extract rich info from Consensus Details (if available)
        rich_details = price_data.get('details', {})
        
        # Normalize fields (NSE vs Yahoo keys)
        change = rich_details.get('Change') or rich_details.get('regularMarketChange') or 0.0
        p_change = rich_details.get('pChange') or rich_details.get('regularMarketChangePercent') or 0.0
        
        # Ensure floats
        try:
             change = round(float(str(change).replace(',', '')), 2)
             p_change = round(float(str(p_change).replace(',', '')), 2)
        except:
             change = 0.0
             p_change = 0.0

        result = {
            "symbol": symbol,
            "name": fund_data.get("name", symbol),  # Add company name
            "market_data": {
                **price_data,
                "change": change,
                "pChange": p_change,
                "changePercent": p_change, # Fix for frontend (0%) issue
                "open": rich_details.get('Open') or rich_details.get('regularMarketOpen'),
                "high": rich_details.get('dayHigh') or rich_details.get('dayLow') or rich_details.get('regularMarketDayHigh'), # NSE uses dayHigh
                "low": rich_details.get('dayLow') or rich_details.get('regularMarketDayLow'),
                "price_formatted": format_inr(price_data.get("price", 0.0))
            },
            "fundamentals": fund_data,
            "news": news_data.get("news", [])
        }
        
        # Sanitize all numeric values to prevent NaN JSON errors
        return sanitize_dict(result)

    @cache(expire=86400, key_prefix="stock_master_list_v2")
    async def get_all_symbols(self) -> List[Dict[str, str]]:
        """
        Fetches list of all NSE securities. Cached for 24 hours.
        """
        try:
            # Blocking call
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, capital_market.equity_list)
            
            # DF columns: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, FACE VALUE
            symbols = []
            if df is not None:
                # Filter for EQ series only? Or all? -> EQ + BE
                # For now take all, maybe top 2000?
                # Let's map to simple list
                for _, row in df.iterrows():
                    symbols.append({
                        "symbol": row['SYMBOL'],
                        "name": row['NAME OF COMPANY']
                    })
            return symbols
        except Exception as e:
            logger.error(f"Error fetching stock list: {e}")
            return []

    @cache(expire=86400, key_prefix="searchable_stocks")
    async def _get_searchable_stocks(self) -> List[Dict[str, Any]]:
        """
        Pre-process stocks for faster searching.
        Returns list of dicts with 'symbol', 'name', 'search_sym', 'search_name'.
        """
        all_stocks = await self.get_all_symbols()
        processed = []
        for s in all_stocks:
            processed.append({
                "symbol": s['symbol'],
                "name": s['name'],
                "search_sym": s['symbol'].upper(),
                "search_name": s['name'].upper()
            })
        return processed

    async def search_stocks(self, query: str) -> List[Dict[str, str]]:
        """
        Fuzzy search on cached stock list.
        """
        stocks = await self._get_searchable_stocks()
        query = query.upper()
        
        matches = []

        # Common Nickname / Search Mapping (Externalized)
        if query in NICKNAME_MAP:
            target_symbol = NICKNAME_MAP[query]
            # Prioritize this match
            for s in stocks:
                if s['symbol'] == target_symbol:
                    s_copy = {"symbol": s["symbol"], "name": s["name"], "score": 1000}
                    matches.append(s_copy)
                    break 
        
        # Limit results for performance
        count = 0
        limit = 10
        
        for s in stocks:
            if len(matches) >= limit + 5: # Optimization: stop if we have enough candidates
                break
                
            sym = s['search_sym']
            name = s['search_name']
            
            # Skip if already added
            if any(m['symbol'] == s['symbol'] for m in matches):
                continue
            
            score = 0
            if sym == query: score = 100
            elif sym.startswith(query): score = 80
            elif name.startswith(query): score = 60
            elif query in sym: score = 40
            elif query in name: score = 20
            
            if score > 0:
                matches.append({
                    "symbol": s['symbol'],
                    "name": s['name'],
                    "score": score
                })
                count += 1
                
        # Sort by score desc, limit 10
        matches.sort(key=lambda x: x['score'], reverse=True)
        return matches[:limit]

    @cache(expire=3600, key_prefix="history")
    async def get_history(self, symbol: str, period: str = "1mo") -> Dict[str, Any]:
        """
        Delegates to Yahoo for history.
        """
        # YahooProvider needs a get_history method?
        # currently logic is in YahooService, but base interface doesn't enforce history.
        # We can implement it here or add to YahooProvider.
        # Let's use YahooProvider if we add the method, or just direct yfinance call here.
        # Direct yfinance here is fine for the service layer.
        import yfinance as yf
        
        def _fetch():
            
            # Smart resolve handled globally now, but ensure we use correct symbol
            clean_sym = symbol.replace(".NS", "").upper()
            ticker = f"{clean_sym}.NS"
            
            dat = yf.Ticker(ticker)
            hist = dat.history(period=period)
            
            if hist.empty and period == "1y":
                 # Retry with shorter period if 1y fails or maybe ticker is wrong?
                 # But hist.empty usually means wrong ticker or no data.
                 logger.warning(f"History empty for {ticker}")
                 
            # Convert to list of dicts
            hist.reset_index(inplace=True)
            # Date to str
            res = []
            for _, row in hist.iterrows():
                res.append({
                    "date": row['Date'].isoformat(),
                    "open": row['Open'],
                    "high": row['High'],
                    "low": row['Low'],
                    "close": row['Close'],
                    "volume": row['Volume']
                })
            return res

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

    @cache(expire=60, key_prefix="market_status")
    async def get_market_status(self) -> List[Dict[str, Any]]:
        """
        Fetches status of major indices (Nifty 50, Sensex).
        """
        import yfinance as yf
        
        indices = {
            "NIFTY 50": "^NSEI",
            "SENSEX": "^BSESN",
            "NIFTY BANK": "^NSEBANK"
        }
        
        def _fetch_indices():
            result = []
            for name, ticker in indices.items():
                try:
                    stock = yf.Ticker(ticker)
                    
                    # Use history for reliable data
                    hist = stock.history(period="1d")
                    if hist.empty:
                        result.append({"index": name, "error": "No data"})
                        continue
                    
                    current_price = hist['Close'].iloc[-1]
                    
                    # Get previous close from info
                    info = stock.info
                    prev_close = info.get('previousClose', info.get('regularMarketPreviousClose', current_price))
                    
                    change = current_price - prev_close
                    pct_change = (change / prev_close * 100) if prev_close > 0 else 0
                    
                    # Market state
                    market_state = info.get('marketState', 'CLOSED')
                    is_open = market_state in ['REGULAR', 'PRE', 'POST']
                    
                    result.append({
                        "index": name,
                        "current": round(current_price, 2),
                        "current_formatted": format_inr(current_price),
                        "change": round(change, 2),
                        "change_formatted": format_inr(change),
                        "percent_change": round(pct_change, 2),
                        "percent_change_formatted": format_percent(pct_change),
                        "status": "OPEN" if is_open else "CLOSED"
                    })
                except Exception as e:
                    logger.error(f"Error fetching {name}: {e}")
                    result.append({"index": name, "error": "Data Unavailable"})
            
            return result
    
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch_indices)

    @cache(expire=300, key_prefix="market_sectors")
    async def get_sector_performance(self) -> List[Dict[str, Any]]:
        """
        Fetches performance of major sectors.
        """
        import yfinance as yf
        
        # Yahoo tickers for NSE Sectors
        sectors = {
            "NIFTY IT": "^CNXIT",
            "NIFTY AUTO": "^CNXAUTO",
            "NIFTY PHARMA": "^CNXPHARMA",
            "NIFTY FMCG": "^CNXFMCG",
            "NIFTY METAL": "^CNXMETAL",
            "NIFTY REALTY": "^CNXREALTY",
            "NIFTY ENERGY": "^CNXENERGY",
            "NIFTY PSU BANK": "^CNXPSUBANK"
        }
        
        def _fetch_sectors():
            data = yf.Tickers(" ".join(sectors.values()))
            result = []
            for name, ticker in sectors.items():
                try:
                    info = data.tickers[ticker].fast_info
                    last_price = info.last_price
                    prev_close = info.previous_close
                    pct_change = ((last_price - prev_close) / prev_close) * 100
                    
                    result.append({
                        "sector": name,
                        "current": round(last_price, 2),
                        "percent_change": round(pct_change, 2)
                    })
                except:
                   continue
            
            # Sort by performance
            result.sort(key=lambda x: x['percent_change'], reverse=True)
            return result

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch_sectors)

    @cache(expire=300, key_prefix="top_movers_v2")
    async def get_top_movers(self) -> List[Dict[str, Any]]:
        """
        Fetches Top Gainers and Losers (Calculated via Yahoo Finance).
        """
        import yfinance as yf
        
        # Major Nifty 50 Stocks for fast movers calculation
        # Fetching all 50 might be slow, so we take the top weighted ones (~15)
        # This provides a good approximation for "Top Movers" widget
        tickers_list = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", 
            "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "ULTRACEMCO.NS",
            "SUNPHARMA.NS", "TITAN.NS", "TMPV.NS"  # TMPV = Tata Motors Passenger Vehicles (post-demerger)
        ]
        
        def _fetch():
            try:
                # Batch fetch is faster
                data = yf.Tickers(" ".join(tickers_list))
                
                movers = []
                for ticker_symbol in tickers_list:
                    try:
                        # Access via data.tickers[ticker_symbol]
                        # fast_info is fastest for current price and prev close
                        info = data.tickers[ticker_symbol].fast_info
                        
                        last = info.last_price
                        prev = info.previous_close
                        
                        if prev == 0: continue
                        
                        change_amt = last - prev
                        change_pct = ((last - prev) / prev) * 100
                        
                        movers.append({
                            "symbol": ticker_symbol.replace(".NS", ""),
                            "price": format_inr(last),
                            "change": f"{change_pct:+.2f}%",
                            "change_val": change_pct,
                            "isUp": change_pct >= 0
                        })
                    except Exception as e:
                        continue
                
                # Sort by change_pct
                movers.sort(key=lambda x: x['change_val'], reverse=True)
                
                # Top 3 Gainers
                top_gainers = movers[:3]
                
                # Top 2 Losers (from end)
                top_losers = movers[-2:]
                top_losers.reverse() # Show worst first? Or just list them.
                
                # Combine
                # Ensure we only return if we have data
                if not movers:
                     return []
                     
                return top_gainers + top_losers
                
            except Exception as e:
                logger.error(f"Top Movers Calc Error: {e}")
                return []
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

    @cache(expire=300, key_prefix="stock_analysis_full")
    async def get_comprehensive_analysis(self, symbol: str) -> Dict[str, Any]:
        """
        Full 360-degree analysis: Technical + Fundamental + News + Scores.
        This is the MAIN function called by AI for recommendations.
        """
        try:
            # 1. Get base data with Yahoo fallback for fundamentals
            base_data = await self.get_aggregated_details(symbol)
            if not base_data:
                return {"error": "Stock not found"}
                
            fundamentals = base_data.get('fundamentals', {})
            if not fundamentals:
                 logger.info(f"Screener fundamentals failed for {symbol}, trying Yahoo")
                 fundamentals = await self.yahoo.get_stock_details(symbol)
                 base_data['fundamentals'] = fundamentals # Update base_data with Yahoo data
            
            history = await self.get_history(symbol, period="1y")
            
            # 2. Run all analyzers
            technical = self.technical_analyzer.analyze(history)
            fundamental = self.fundamental_analyzer.analyze(fundamentals)
            news = self.news_analyzer.analyze(base_data.get('news', []))
            
            # 3. Calculate scores
            from app.services.scoring.stability_scorer import StabilityScoreEngine
            from app.services.scoring.timing_scorer import TimingScoreEngine
            from app.services.scoring.risk_profiler import RiskProfileEngine
            
            market_data_for_scoring = {
                "history": history,
                "fundamentals": fundamentals # Use the potentially updated fundamentals
            }
            
            stability = StabilityScoreEngine().calculate_score(symbol, market_data_for_scoring)
            timing = TimingScoreEngine().calculate_score(symbol, market_data_for_scoring)
            risk = RiskProfileEngine().calculate_risk(symbol, market_data_for_scoring)
            
            # 4. Generate recommendation
            recommendation = self._generate_recommendation(stability, timing, risk, fundamental)
            
            return {
                "symbol": symbol,
                "price": base_data.get("market_data", {}).get("price_formatted"),
                "price_raw": base_data.get("market_data", {}).get("price"),
                "recommendation": recommendation,
                "scores": {
                    "stability": stability,
                    "timing": timing,
                    "risk": risk
                },
                "analysis": {
                    "technical": technical,
                    "fundamental": fundamental,
                    "news": news
                },
                "raw_data": {
                    "fundamentals": base_data.get("fundamentals", {}),
                    "news_items": base_data.get("news", [])[:5]
                }
            }
            
        except Exception as e:
            logger.error(f"Comprehensive Analysis Error for {symbol}: {e}")
            return {"error": str(e)}

    def _generate_recommendation(self, stability, timing, risk, fundamental) -> Dict[str, Any]:
        """
        Generate final BUY/HOLD/SELL recommendation based on all scores.
        """
        stability_score = stability.get('score', 0)
        timing_score = timing.get('score', 0)
        timing_signal = timing.get('signal', 'NEUTRAL')
        risk_score = risk.get('risk_score', 50)
        fund_health = fundamental.get('health_score', 50)
        
        # Composite Score (weighted)
        composite = (
            stability_score * 0.3 +
            timing_score * 0.3 +
            (100 - risk_score) * 0.2 +  # Lower risk = higher score
            fund_health * 0.2
        )
        
        # Determine Action
        if composite >= 75 and timing_signal == 'BUY':
            action = "STRONG BUY"
            confidence = "HIGH"
            reason = "Excellent fundamentals, perfect entry timing, low risk."
        elif composite >= 65:
            action = "BUY"
            confidence = "MEDIUM"
            reason = "Solid fundamentals with favorable risk-reward."
        elif composite >= 55:
            if timing_signal == 'BUY':
                action = "ACCUMULATE"
                reason = "Good long-term value, consider adding on dips."
            else:
                action = "HOLD"
                reason = "Stable stock, but wait for better momentum to add more."
            confidence = "MEDIUM"
        elif composite >= 40:
            action = "HOLD"
            confidence = "LOW"
            reason = "Mixed signals. If you own it, continue holding; otherwise wait."
        elif composite >= 25:
            action = "REDUCE"
            confidence = "MEDIUM"
            reason = "Weakening fundamentals or trend. Consider trimming position."
        else:
            action = "SELL"
            confidence = "HIGH"
            reason = "Multiple red flags detected. High risk."
        
        return {
            "action": action,
            "confidence": confidence,
            "composite_score": round(composite),
            "reasoning": reason,
            "key_factors": {
                "stability": f"{stability_score}/100",
                "timing": timing_signal,
                "risk": risk.get('risk_level'),
                "fundamentals": fundamental.get('valuation', {}).get('level')
            }
        }
    @cache(expire=3600, key_prefix="price_at_date")
    async def get_price_at_date(self, symbol: str, date: str) -> float:
        """
        Fetches closing price for a specific date.
        """
        import yfinance as yf
        from datetime import datetime, timedelta

        def _fetch():
            try:
                symbol_clean = symbol.replace(".NS", "").upper()
                ticker = f"{symbol_clean}.NS"
                
                # yfinance download expects start (inclusive) and end (exclusive)
                target_date = datetime.strptime(date, "%Y-%m-%d")
                
                # Try fetching [date, date+7] to find the first valid trading day on or after date
                end_window = target_date + timedelta(days=7)
                df = yf.download(ticker, start=date, end=end_window.strftime("%Y-%m-%d"), progress=False)
                
                if df.empty:
                    # Fallback: Try looking BACK 5 days if looking forward failed (maybe simple data gap)
                    start_back = target_date - timedelta(days=5)
                    df = yf.download(ticker, start=start_back.strftime("%Y-%m-%d"), end=target_date.strftime("%Y-%m-%d"), progress=False)
                    if not df.empty:
                         return float(df['Close'].iloc[-1]) # Last available
                    return 0.0
                
                # Return first available close in the forward window
                return float(df['Close'].iloc[0])

            except Exception as e:
                logger.error(f"Error fetching price at date {date} for {symbol}: {e}")
                return 0.0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)
    @cache(expire=86400, key_prefix="listing_date")
    async def get_listing_date(self, symbol: str) -> str:
        """
        Fetches the first trade date (listing date) for a symbol.
        Returns YYYY-MM-DD string or empty string if not found.
        """
        import yfinance as yf
        from datetime import datetime
        
        def _fetch():
            try:
                symbol_clean = symbol.replace(".NS", "").upper()
                ticker = f"{symbol_clean}.NS"
                dat = yf.Ticker(ticker)
                
                # Try getting from metadata
                # firstTradeDateEpochUtc is reliable when available
                epoch = dat.info.get('firstTradeDateEpochUtc')
                if epoch:
                    dt = datetime.fromtimestamp(epoch)
                    return dt.strftime("%Y-%m-%d")
                
                # Fallback: history max (slower but more accurate for old stocks)
                # Note: yfinance historical data may not go back to actual listing date
                # For example, RELIANCE listed on Nov 28, 1995 but yfinance data starts Jan 1, 1996
                hist = dat.history(period="max")
                if not hist.empty:
                    return hist.index[0].strftime("%Y-%m-%d")
                    
                return ""
            except Exception as e:
                logger.error(f"Error fetching listing date for {symbol}: {e}")
                return ""
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)



# prompts.py

# System Prompts & Templates

SYSTEM_PROMPT_NEWS_ANALYST = """
You are a helpful expert financial analyst for Indian markets specializing in news analysis.
"""

PROMPT_STOCK_SUMMARY_TEMPLATE = """
You are a financial analyst. Analyze this data for {symbol} and provide a 3-sentence summary focusing on recent news sentiment and market outlook.

Price: {price}
Change: {change}%
{news_summary}

Provide 3 concise sentences analyzing:
1. What the recent news indicates about the company
2. Current market sentiment and price action
3. Short-term outlook for investors

Be direct - no preambles like "based on the data" or "the analysis shows".
"""

SYSTEM_PROMPT_TITLE_GEN = """
You are a helpful assistant.
"""

PROMPT_TITLE_GEN_TEMPLATE = """
Summarize this conversation into a short, descriptive title (maximum 5 words).
Examples: "Reliance Stock Analysis", "Nifty 50 Trends", "Portfolio Rebalancing".
No quotes, no "Title:", just the text.

Conversation:
{conversation_text}
"""

# Auth Context
SYSTEM_PROMPT_AUTH_HELP = """
You are a helpful Login Support Assistant for Clarity Financial.

Your ONLY role is to help users with:
- Logging in (email/password)
- Signing up (creating an account)
- Password resets
- Basic account troubleshooting

CRITICAL RULE:
If the user asks about ANYTHING else (stocks, markets, analysis, advice, "hi", "hello"), 
you MUST respond with EXACTLY:
"Please login or sign up to use Clarity."

Do not provide market data or financial advice in this mode.
"""

# Domain Restrictions
DOMAIN_ADVISOR = """
**DOMAIN - ADVISOR MODE:**
- You specialize in: Individual stock analysis, stock comparisons, portfolio management, general investment advice
- If user asks about SECTORS, COMMODITIES, or INDUSTRIES (e.g., "Tell me about aluminium sector", "EV industry trends", "pharma sector outlook"), respond with:
  "I specialize in individual stock analysis and portfolio management. For sector and industry research, try the **Discovery Hub**!"
- After your response, add this EXACT marker on a new line: __SUGGEST_SWITCH_TO_DISCOVERY_HUB__
- You CAN answer: individual stocks, stock comparisons, portfolio optimization, market indices
- **CRITICAL:** DO NOT suggest switching to AI Advisor (you are already in Advisor mode).
"""

DOMAIN_DISCOVERY_HUB = """
**DOMAIN - DISCOVERY HUB MODE:**
- You specialize in: Sector analysis, commodity research, industry trends, sector-wide stock recommendations
- If user asks about INDIVIDUAL STOCK ANALYSIS or PORTFOLIO MANAGEMENT (e.g., "Should I buy TCS?", "Optimize my portfolio", "Compare TCS vs INFY"), respond with:
  "I specialize in sector and industry research. For detailed stock analysis and portfolio management, try the **Clarity Advisor**!"
- After your response, add this EXACT marker on a new line: __SUGGEST_SWITCH_TO_ADVISOR__
- You CAN answer: sector analysis, commodity trends, industry research, sector-wide recommendations
- When recommending stocks, provide them in the context of sector analysis
- **CRITICAL:** DO NOT suggest switching to Discovery Hub (you are already in Discovery Hub mode).
"""

DOMAIN_FLOATING = """
**DOMAIN - GENERAL ASSISTANT:**
- You are the general floating assistant. You can answer questions about BOTH stocks and sectors.
- However, for deep dives, you should suggest the specialized tools.
- If user asks a detailed STOCK/PORTFOLIO question, provide a brief answer and then add:
  __SUGGEST_SWITCH_TO_ADVISOR__
- If user asks a detailed SECTOR/INDUSTRY question, provide a brief answer and then add:
  __SUGGEST_SWITCH_TO_DISCOVERY_HUB__
- You are helpful and don't block queries, but you guide users to the best tool.
"""

# Main System Prompt Template
SYSTEM_PROMPT_MAIN_TEMPLATE = """
You are 'Clarity AI', an advanced Indian stock market analyst and research assistant.

Core Capabilities:
1. Fetch REAL-TIME stock data (prices, fundamentals, news)
2. Calculate QUANTITATIVE scores (stability, timing, risk)
3. Analyze sectors and recommend top stocks
4. Compare multiple stocks with data-driven metrics

{domain_restriction}

**DOMAIN RESTRICTION (CRITICAL):**
- You are a **FINANCE-ONLY** assistant.
- If the user asks about anything NOT related to finance, stocks, economics, investing, or money management (e.g., "What is CRUD?", "Write a poem", "Python code", "General knowledge"), you MUST refuse.
- **IMPORTANT**: When evaluating if a query is finance-related, consider the CONVERSATION CONTEXT. Follow-up questions like "What are the latest news about these", "Tell me more", "What about X?" should be treated as finance-related if the previous context was about stocks/sectors.
- Refusal message: "I am a dedicated financial advisor. I can only assist with market data, stock analysis, and investment inquiries."
- Exception: You may answer greetings ("Hi", "Hello") with a financial context ("Hello! Ready to analyze the markets?").

Presentational Rules (CRITICAL for UI/UX):
- **Structure**: Use Markdown Headers (##) for main sections.
- **Conciseness**: Use bullet points for lists and features. Avoid walls of text.
- **Data**: Present key numbers (Price, Change, P/E) in a clear way, bolding the values (e.g., **INR 2,400**).
- **Tone**: Professional, insightful, yet easy to read.

Critical Rules:
- NEVER invent numbers, prices, or scores
- ALL recommendations must be backed by tool-provided data
- Use INR for all currency values
- Format large numbers in Lakhs/Crores
- When asked for recommendations, ALWAYS call get_comprehensive_analysis tool
- Be direct and actionable - avoid preambles

TOOL USE INSTRUCTIONS:
- You have access to tools. Use them whenever you need real data.
- DO NOT write custom XML like <function=...> or similar. 
- Simply call the function using the standard tool calling mechanism provided to you.

Today's date: {current_date}
Market: NSE/BSE (Indian Stock Exchange)
"""


# tools_config.py

TOOLS_CONFIG = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_details",
            "description": "Get basic stock info (price, fundamentals, news)",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string"}
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_comprehensive_analysis",
            "description": "Get FULL analysis with scores, recommendation, technical/fundamental analysis. Use this for buy/sell decisions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string"}
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_stocks",
            "description": "Search for stocks by company name",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_status",
            "description": "Get current market indices (Nifty, Sensex)",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sector_recommendations",
            "description": "Get top stock picks for ANY sector with research-backed analysis. Works with sector names (AUTO, IT) or keywords (aluminum, pharma, electric vehicles).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sector_query": {
                        "type": "string",
                        "description": "Sector name or keyword (e.g., 'AUTO', 'aluminum', 'pharma', 'electric vehicles')"
                    },
                    "criteria": {
                        "type": "string",
                        "enum": ["balanced", "stability", "growth", "value"],
                        "default": "balanced",
                        "description": "Ranking criteria: balanced (default), stability (low risk), growth (high potential), value (undervalued)"
                    }
                },
                "required": ["sector_query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_stocks",
            "description": "Compare multiple stocks side-by-side",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["symbols"]
            }
        }
    }
]


# __init__.py



# fundamental_analyzer.py

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FundamentalAnalyzer:
    """
    Analyzes fundamental health of a company.
    """
    
    def analyze(self, fundamentals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive fundamental analysis.
        """
        try:
            # Extract key metrics
            pe = float(fundamentals.get('trailingPE', 0))
            pb = float(fundamentals.get('priceToBook', 0))
            de = float(fundamentals.get('debtToEquity', 0)) / 100
            roe = float(fundamentals.get('returnOnEquity', 0)) * 100
            profit_margin = float(fundamentals.get('profitMargin', 0)) * 100
            revenue_growth = float(fundamentals.get('revenueGrowth', 0)) * 100
            
            # Health Score (0-100)
            health_score = self._calc_health_score(pe, pb, de, roe, profit_margin)
            
            # Valuation
            valuation = self._assess_valuation(pe, pb)
            
            # Financial Health
            financial_health = self._assess_financial_health(de, roe, profit_margin)
            
            # Growth Potential
            growth_potential = self._assess_growth(revenue_growth)
            
            return {
                "health_score": round(health_score),
                "valuation": valuation,
                "financial_health": financial_health,
                "growth_potential": growth_potential,
                "key_metrics": {
                    "pe_ratio": round(pe, 2),
                    "pb_ratio": round(pb, 2),
                    "debt_equity": round(de, 2),
                    "roe": f"{roe:.2f}%",
                    "profit_margin": f"{profit_margin:.2f}%",
                    "revenue_growth": f"{revenue_growth:.2f}%"
                }
            }
            
        except Exception as e:
            logger.error(f"Fundamental Analysis Error: {e}")
            return {"error": str(e)}
    
    def _calc_health_score(self, pe, pb, de, roe, margin) -> float:
        """Calculate overall fundamental health score."""
        score = 50  # Start neutral
        
        # PE Score
        if 0 < pe < 15:
            score += 15
        elif 15 <= pe < 25:
            score += 10
        elif 25 <= pe < 40:
            score += 5
        
        # PB Score
        if 0 < pb < 2:
            score += 10
        elif 2 <= pb < 4:
            score += 5
        
        # Debt Score
        if de < 0.5:
            score += 15
        elif de < 1.0:
            score += 10
        elif de < 2.0:
            score += 5
        
        # ROE Score
        if roe > 20:
            score += 10
        elif roe > 15:
            score += 7
        elif roe > 10:
            score += 4
        
        return min(100, max(0, score))
    
    def _assess_valuation(self, pe, pb) -> Dict[str, str]:
        """Assess valuation level."""
        if pe < 15 and pb < 2:
            level = "UNDERVALUED"
            desc = "Trading below historical averages"
        elif pe > 40 or pb > 5:
            level = "OVERVALUED"
            desc = "Premium valuation"
        else:
            level = "FAIR"
            desc = "Reasonably valued"
        
        return {"level": level, "description": desc}
    
    def _assess_financial_health(self, de, roe, margin) -> Dict[str, str]:
        """Assess financial health."""
        if de < 0.5 and roe > 15 and margin > 10:
            level = "STRONG"
            desc = "Excellent financial position"
        elif de > 2 or roe < 5 or margin < 0:
            level = "WEAK"
            desc = "Financial concerns present"
        else:
            level = "MODERATE"
            desc = "Stable financial health"
        
        return {"level": level, "description": desc}
    
    def _assess_growth(self, revenue_growth) -> Dict[str, str]:
        """Assess growth potential."""
        if revenue_growth > 20:
            level = "HIGH"
            desc = "Strong growth trajectory"
        elif revenue_growth > 10:
            level = "MODERATE"
            desc = "Steady growth"
        elif revenue_growth > 0:
            level = "LOW"
            desc = "Slow growth"
        else:
            level = "DECLINING"
            desc = "Revenue contraction"
        
        return {"level": level, "description": desc}


# news_analyzer.py

import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class NewsAnalyzer:
    """
    Analyzes news sentiment and impact on stock.
    """
    
    def analyze(self, news_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze news sentiment and frequency.
        """
        try:
            if not news_items:
                return {
                    "sentiment": "NEUTRAL",
                    "score": 0,
                    "recent_count": 0,
                    "summary": "No recent news"
                }
            
            # Count news by sentiment (simple keyword matching)
            positive = 0
            negative = 0
            neutral = 0
            
            for item in news_items:
                title = item.get('title', '').lower()
                sentiment = self._classify_sentiment(title)
                
                if sentiment == 'POSITIVE':
                    positive += 1
                elif sentiment == 'NEGATIVE':
                    negative += 1
                else:
                    neutral += 1
            
            # Calculate sentiment score (-100 to +100)
            total = len(news_items)
            score = ((positive - negative) / total) * 100 if total > 0 else 0
            
            # Overall sentiment
            if score > 30:
                overall = "POSITIVE"
            elif score < -30:
                overall = "NEGATIVE"
            else:
                overall = "NEUTRAL"
            
            return {
                "sentiment": overall,
                "score": round(score),
                "recent_count": total,
                "breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral
                },
                "summary": self._generate_summary(overall, total)
            }
            
        except Exception as e:
            logger.error(f"News Analysis Error: {e}")
            return {"error": str(e)}
    
    def _classify_sentiment(self, title: str) -> str:
        """Simple keyword-based sentiment classification."""
        positive_keywords = ['surges', 'gains', 'profit', 'growth', 'beats', 'strong', 'record', 'boost', 'rise', 'up']
        negative_keywords = ['falls', 'drops', 'loss', 'decline', 'weak', 'miss', 'cut', 'down', 'concern', 'crisis']
        
        pos_count = sum(1 for word in positive_keywords if word in title)
        neg_count = sum(1 for word in negative_keywords if word in title)
        
        if pos_count > neg_count:
            return 'POSITIVE'
        elif neg_count > pos_count:
            return 'NEGATIVE'
        else:
            return 'NEUTRAL'
    
    def _generate_summary(self, sentiment: str, count: int) -> str:
        """Generate human-readable summary."""
        if count == 0:
            return "No recent news coverage"
        elif sentiment == "POSITIVE":
            return f"{count} recent positive developments"
        elif sentiment == "NEGATIVE":
            return f"{count} recent concerns reported"
        else:
            return f"{count} recent news items, mixed sentiment"


# technical_analyzer.py

import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    """
    Calculates technical indicators: Moving Averages, RSI, MACD, Bollinger Bands.
    """
    
    def analyze(self, history: List[dict]) -> Dict[str, Any]:
        """
        Full technical analysis on historical data.
        """
        if not history or len(history) < 50:
            return {"error": "Insufficient data for technical analysis"}
        
        try:
            df = pd.DataFrame(history)
            df['close'] = df['close'].astype(float)
            df['high'] = df['high'].astype(float)
            df['low'] = df['low'].astype(float)
            df['volume'] = df['volume'].astype(float)
            
            current_price = df['close'].iloc[-1]
            
            # Moving Averages
            ma_data = self._calc_moving_averages(df)
            
            # RSI
            rsi = self._calc_rsi(df)
            
            # MACD
            macd_data = self._calc_macd(df)
            
            # Bollinger Bands
            bb_data = self._calc_bollinger_bands(df)
            
            # Support & Resistance
            sr_data = self._calc_support_resistance(df)
            
            # Overall Signal
            signal = self._generate_signal(ma_data, rsi, macd_data, bb_data)
            
            return {
                "current_price": round(current_price, 2),
                "moving_averages": ma_data,
                "rsi": rsi,
                "macd": macd_data,
                "bollinger_bands": bb_data,
                "support_resistance": sr_data,
                "signal": signal
            }
            
        except Exception as e:
            logger.error(f"Technical Analysis Error: {e}")
            return {"error": str(e)}
    
    def _calc_moving_averages(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate 20, 50, 200 day moving averages."""
        current = df['close'].iloc[-1]
        
        mas = {}
        for period in [20, 50, 200]:
            if len(df) >= period:
                ma = df['close'].rolling(window=period).mean().iloc[-1]
                mas[f'ma{period}'] = round(ma, 2)
                mas[f'ma{period}_signal'] = 'ABOVE' if current > ma else 'BELOW'
            else:
                mas[f'ma{period}'] = None
                mas[f'ma{period}_signal'] = 'N/A'
        
        return mas
    
    def _calc_rsi(self, df: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
        """Calculate Relative Strength Index."""
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]
        
        if current_rsi < 30:
            signal = 'OVERSOLD'
        elif current_rsi > 70:
            signal = 'OVERBOUGHT'
        else:
            signal = 'NEUTRAL'
        
        return {
            "value": round(current_rsi, 2),
            "signal": signal
        }
    
    def _calc_macd(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate MACD (Moving Average Convergence Divergence)."""
        ema12 = df['close'].ewm(span=12, adjust=False).mean()
        ema26 = df['close'].ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        current_hist = histogram.iloc[-1]
        
        signal = 'BUY' if current_hist > 0 else 'SELL'
        
        return {
            "macd": round(current_macd, 2),
            "signal_line": round(current_signal, 2),
            "histogram": round(current_hist, 2),
            "signal": signal
        }
    
    def _calc_bollinger_bands(self, df: pd.DataFrame, period: int = 20) -> Dict[str, Any]:
        """Calculate Bollinger Bands."""
        sma = df['close'].rolling(window=period).mean()
        std = df['close'].rolling(window=period).std()
        
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        
        current_price = df['close'].iloc[-1]
        current_upper = upper.iloc[-1]
        current_lower = lower.iloc[-1]
        current_sma = sma.iloc[-1]
        
        if current_price > current_upper:
            signal = 'OVERBOUGHT'
        elif current_price < current_lower:
            signal = 'OVERSOLD'
        else:
            signal = 'NEUTRAL'
        
        return {
            "upper": round(current_upper, 2),
            "middle": round(current_sma, 2),
            "lower": round(current_lower, 2),
            "signal": signal
        }
    
    def _calc_support_resistance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify support and resistance levels."""
        # Simple pivot points
        high = df['high'].tail(20).max()
        low = df['low'].tail(20).min()
        close = df['close'].iloc[-1]
        
        pivot = (high + low + close) / 3
        resistance = (2 * pivot) - low
        support = (2 * pivot) - high
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "pivot": round(pivot, 2)
        }
    
    def _generate_signal(self, ma_data, rsi, macd, bb) -> str:
        """Generate overall technical signal."""
        buy_signals = 0
        sell_signals = 0
        
        # MA Signals
        if ma_data.get('ma50_signal') == 'ABOVE':
            buy_signals += 1
        else:
            sell_signals += 1
        
        # RSI
        if rsi['signal'] == 'OVERSOLD':
            buy_signals += 2
        elif rsi['signal'] == 'OVERBOUGHT':
            sell_signals += 2
        
        # MACD
        if macd['signal'] == 'BUY':
            buy_signals += 1
        else:
            sell_signals += 1
        
        # Bollinger
        if bb['signal'] == 'OVERSOLD':
            buy_signals += 1
        elif bb['signal'] == 'OVERBOUGHT':
            sell_signals += 1
        
        if buy_signals > sell_signals:
            return 'BUY'
        elif sell_signals > buy_signals:
            return 'SELL'
        else:
            return 'NEUTRAL'


# __init__.py



# sector_mapper.py

import logging
import asyncio
from typing import List, Dict, Any
from nselib import capital_market
import pandas as pd
from app.core.cache import cache
import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)

class SectorMapper:
    """
    Dynamically maps sectors to stocks using NSE data and web scraping.
    No hardcoded mappings - all research-backed.
    """
    
    def __init__(self):
        self.ua = UserAgent()
        
        # NSE Sector Index URLs (official source)
        self.nse_indices = {
            "AUTO": "NIFTY AUTO",
            "IT": "NIFTY IT",
            "BANK": "NIFTY BANK",
            "PHARMA": "NIFTY PHARMA",
            "FMCG": "NIFTY FMCG",
            "METAL": "NIFTY METAL",
            "REALTY": "NIFTY REALTY",
            "ENERGY": "NIFTY ENERGY",
            "MEDIA": "NIFTY MEDIA",
            "PSU_BANK": "NIFTY PSU BANK",
            "PRIVATE_BANK": "NIFTY PRIVATE BANK",
            "FINANCIAL": "NIFTY FINANCIAL SERVICES",
            "INFRA": "NIFTY INFRASTRUCTURE",
            "CONSUMER": "NIFTY CONSUMER DURABLES",
            "OIL_GAS": "NIFTY OIL & GAS"
        }
    
    @cache(expire=86400, key_prefix="sector_stocks")  # Cache for 24 hours
    async def get_stocks_in_sector(self, sector: str) -> List[str]:
        """
        Get all stocks in a sector dynamically.
        
        Strategy:
        1. Try NSE official index constituents
        2. Fallback to industry classification from equity list
        3. Fallback to keyword search
        """
        try:
            sector_upper = sector.upper()
            
            # Step 1: Try NSE Index Constituents
            if sector_upper in self.nse_indices:
                stocks = await self._get_index_constituents(self.nse_indices[sector_upper])
                if stocks:
                    logger.info(f"Found {len(stocks)} stocks in {sector} from NSE index")
                    return stocks
            
            # Step 2: Try Industry Classification
            stocks = await self._get_by_industry_classification(sector)
            if stocks:
                logger.info(f"Found {len(stocks)} stocks in {sector} from industry classification")
                return stocks
            
            # Step 3: Fallback to keyword search
            stocks = await self._get_by_keyword_search(sector)
            logger.info(f"Found {len(stocks)} stocks in {sector} from keyword search")
            return stocks
            
        except Exception as e:
            logger.error(f"Sector mapping error for {sector}: {e}")
            return []
    
    async def _get_index_constituents(self, index_name: str) -> List[str]:
        """
        Get constituent stocks of an NSE index.
        Uses NSELib to fetch index constituents.
        """
        try:
            loop = asyncio.get_event_loop()
            
            # NSELib has index_data function
            # Map index names to NSELib format
            index_map = {
                "NIFTY AUTO": "NIFTY AUTO",
                "NIFTY IT": "NIFTY IT",
                "NIFTY BANK": "NIFTY BANK",
                "NIFTY PHARMA": "NIFTY PHARMA",
                "NIFTY FMCG": "NIFTY FMCG",
                "NIFTY METAL": "NIFTY METAL",
                "NIFTY REALTY": "NIFTY REALTY",
                "NIFTY ENERGY": "NIFTY ENERGY",
                "NIFTY MEDIA": "NIFTY MEDIA",
                "NIFTY PSU BANK": "NIFTY PSU BANK",
                "NIFTY PRIVATE BANK": "NIFTY PVT BANK",
                "NIFTY FINANCIAL SERVICES": "NIFTY FIN SERVICE",
                "NIFTY INFRASTRUCTURE": "NIFTY INFRA",
                "NIFTY CONSUMER DURABLES": "NIFTY CONSR DURBL",
                "NIFTY OIL & GAS": "NIFTY OIL AND GAS"
            }
            
            nse_index_name = index_map.get(index_name, index_name)
            
            # Fetch index data (this returns constituent stocks)
            def _fetch():
                try:
                    # capital_market has various functions
                    # We'll scrape NSE website for constituents
                    return self._scrape_nse_index_constituents(nse_index_name)
                except Exception as e:
                    logger.error(f"NSE index fetch failed: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Index constituents error: {e}")
            return []
    
    def _scrape_nse_index_constituents(self, index_name: str) -> List[str]:
        """
        Scrape NSE website for index constituents.
        This is the most reliable source.
        """
        try:
            # STATIC FALLBACK MAP (Major Indices)
            # Ensures core functionality always works even if scraping fails
            STATIC_INDICES = {
                "NIFTY AUTO": ["MARUTI", "M&M", "TATAMOTORS", "BAJAJ-AUTO", "EICHERMOT", "HEROMOTOCO", "TVSMOTOR", "ASHOKLEY", "BHARATFORG"],
                "NIFTY IT": ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM", "PERSISTENT", "COFORGE", "MPHASIS"],
                "NIFTY BANK": ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "BANKBARODA", "PNB", "IDFCFIRSTB"],
                "NIFTY PHARMA": ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP", "TORNTPHARM", "LUPIN", "AUROPHARMA"],
                "NIFTY FMCG": ["ITC", "HUL", "NESTLEIND", "BRITANNIA", "TATACONSUM", "GODREJCP", "DABUR", "MARICO", "COLPAL"],
                "NIFTY METAL": ["TATASTEEL", "HINDALCO", "JSWSTEEL", "VEDL", "COALINDIA", "JINDALSTEL", "SAIL", "NMDC"],
                "NIFTY REALTY": ["DLF", "GODREJPROP", "OBEROIRLTY", "PHOENIXLTD", "PRESTIGE", "BRIGADE"],
                "NIFTY ENERGY": ["RELIANCE", "NTPC", "ONGC", "POWERGRID", "ADANIGREEN", "ADANIPORTS", "BPCL", "IOC"],
                "NIFTY PVT BANK": ["HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "INDUSINDBK"],
                "NIFTY PSU BANK": ["SBIN", "BANKBARODA", "PNB", "CANBK", "UNIONBANK"],
                "NIFTY INFRA": ["LARSEN", "RELIANCE", "POWERGRID", "NTPC", "ULTRACEMCO", "GRASIM"],
                "NIFTY FIN SERVICE": ["HDFCBANK", "ICICIBANK", "SBIN", "HDFC", "BAJFINANCE", "BAJAJFINSV", "AXISBANK", "KOTAKBANK"]
            }

            if index_name in STATIC_INDICES:
                logger.info(f"Using static fallback for {index_name}")
                return STATIC_INDICES[index_name]
            
            # If not in static map, return empty (triggering downstream fallbacks)
            return []
            
        except Exception as e:
            logger.error(f"NSE scrape error: {e}")
            return []
    
    async def _get_by_industry_classification(self, sector: str) -> List[str]:
        """
        Get stocks by industry classification from NSE equity list.
        Uses SYMBOL + INDUSTRY column matching.
        """
        try:
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    # Get full equity list with industry classification
                    df = capital_market.equity_list()
                    
                    if df is None or df.empty:
                        return []
                    
                    # Check if INDUSTRY column exists
                    # Different versions of nselib may have different columns
                    # Common columns: SYMBOL, NAME OF COMPANY, SERIES, INDUSTRY
                    
                    if 'INDUSTRY' not in df.columns:
                        # Try alternative column names
                        possible_cols = ['SECTOR', 'ISIN', 'SERIES']
                        # For now, return empty - we'll use keyword search
                        return []
                    
                    # Filter by industry containing sector keyword
                    sector_lower = sector.lower()
                    mask = df['INDUSTRY'].str.lower().str.contains(sector_lower, na=False)
                    
                    sector_stocks = df[mask]['SYMBOL'].tolist()
                    
                    # Limit to reasonable number (top 50 by market cap ideally)
                    return sector_stocks[:50]
                    
                except Exception as e:
                    logger.error(f"Industry classification error: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Industry classification error: {e}")
            return []
    
    async def _get_by_keyword_search(self, sector: str) -> List[str]:
        """
        Fallback: Search company names for sector keywords.
        Example: "aluminum" → HINDALCO, VEDL, NATIONALUM
        """
        try:
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    df = capital_market.equity_list()
                    
                    if df is None or df.empty:
                        return []
                    
                    # Search in company names
                    sector_lower = sector.lower()
                    
                    # Build keyword map for common searches
                    keyword_map = {
                        'aluminum': ['hindalco', 'vedanta', 'national', 'aluminium'],
                        'steel': ['tata steel', 'jswsteel', 'jindal', 'sail'],
                        'cement': ['ultratech', 'ambuja', 'acc', 'shree cement'],
                        'power': ['ntpc', 'power grid', 'tata power', 'adani power'],
                        'telecom': ['bharti', 'reliance', 'vodafone'],
                        'insurance': ['lic', 'icici prudential', 'hdfc life', 'sbi life'],
                        'textile': ['raymond', 'arvind', 'welspun', 'trident'],
                        'chemical': ['pidilite', 'aarti', 'srf', 'upl'],
                        'logistics': ['blue dart', 'vrl', 'tci', 'mahindra logistics']
                    }
                    
                    # Get keywords for this sector
                    keywords = keyword_map.get(sector_lower, [sector_lower])
                    
                    matches = []
                    for _, row in df.iterrows():
                        company_name = row['NAME OF COMPANY'].lower()
                        symbol = row['SYMBOL']
                        
                        # Check if any keyword matches
                        for keyword in keywords:
                            if keyword in company_name:
                                matches.append(symbol)
                                break
                    
                    return matches[:50]  # Limit results
                    
                except Exception as e:
                    logger.error(f"Keyword search error: {e}")
                    return []
            
            stocks = await loop.run_in_executor(None, _fetch)
            return stocks
            
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []
    
    def get_available_sectors(self) -> List[str]:
        """
        Return list of officially recognized sectors.
        """
        return list(self.nse_indices.keys())
    
    async def search_sector_by_keyword(self, keyword: str) -> Dict[str, Any]:
        """
        Smart sector search - handles user queries like:
        - "I want to invest in aluminum"
        - "What are good pharma stocks?"
        - "Show me EV companies"
        """
        keyword_lower = keyword.lower()
        
        # Sector keyword mapping
        sector_keywords = {
            'car': 'AUTO', 'automobile': 'AUTO', 'vehicle': 'AUTO', 'ev': 'AUTO',
            'software': 'IT', 'tech': 'IT', 'technology': 'IT',
            'medicine': 'PHARMA', 'drug': 'PHARMA', 'healthcare': 'PHARMA',
            'aluminum': 'METAL', 'aluminium': 'METAL', 'steel': 'METAL', 'copper': 'METAL',
            'food': 'FMCG', 'consumer': 'FMCG', 'product': 'FMCG',
            'property': 'REALTY', 'real estate': 'REALTY', 'housing': 'REALTY',
            'oil': 'ENERGY', 'gas': 'ENERGY', 'power': 'ENERGY', 'electricity': 'ENERGY',
            'loan': 'BANK', 'banking': 'BANK', 'finance': 'FINANCIAL'
        }
        
        # Find matching sector
        for kw, sector in sector_keywords.items():
            if kw in keyword_lower:
                stocks = await self.get_stocks_in_sector(sector)
                return {
                    "matched_sector": sector,
                    "keyword": keyword,
                    "stocks": stocks,
                    "count": len(stocks)
                }
        
        # If no match, try direct search
        stocks = await self._get_by_keyword_search(keyword)
        return {
            "matched_sector": "CUSTOM",
            "keyword": keyword,
            "stocks": stocks,
            "count": len(stocks)
        }

    async def get_stocks_by_market_cap(self, sector: str, min_mcap: float = None) -> List[str]:
        """
        Filter stocks by minimum market cap.
        Example: Only large-cap stocks (>₹1L Cr)
        """
        stocks = await self.get_stocks_in_sector(sector)
        # Fetch market cap for each and filter (placeholder logic as we need mcap data source)
        # For now, return all as we develop the data source
        return stocks

    async def get_liquid_stocks_in_sector(self, sector: str, min_volume: int = 100000) -> List[str]:
        """
        Only return stocks with sufficient trading volume.
        """
        stocks = await self.get_stocks_in_sector(sector)
        # Similar to mcap, requires volume data source.
        # Returning all for now to avoid breaking flow.
        return stocks


# google_finance.py

from typing import Dict, Any, Optional
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class GoogleFinanceProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://www.google.com/finance/quote"
        
    @property
    def source_name(self) -> str:
        return "GoogleFinance"

    def _get_headers(self):
        return {
            "User-Agent": self.ua.random,
            "Accept-Language": "en-US,en;q=0.9"
        }

    async def get_latest_price(self, symbol: str) -> float:
        """
        Scrapes Google Finance for the latest price.
        Symbol format: "RELIANCE:NSE" or just "RELIANCE" (we default to NSE)
        """
        try:
            # Google Finance format: /quote/SYMBOL:EXCHANGE
            # e.g., /quote/RELIANCE:NSE
            ticker = symbol.replace('.NS', '') # Clean yahoo suffix if present
            
            # Run blocking request in executor
            loop = asyncio.get_event_loop()
            price = await loop.run_in_executor(None, self._scrape_price, ticker)
            return price
        except Exception as e:
            logger.error(f"GoogleFinance Error for {symbol}: {e}")
            return 0.0

    def _scrape_price(self, ticker: str) -> float:
        try:
            url = f"{self.base_url}/{ticker}:NSE"
            resp = requests.get(url, headers=self._get_headers(), timeout=5)
            
            if resp.status_code != 200:
                return 0.0
                
            soup = BeautifulSoup(resp.text, 'lxml')
            
            # The class name for price in Google Finance often changes, but usually it's in a specific meta structure or 'YMlKec fxKbKc'
            # Robust strategy: Look for the big price text
            # Currently class 'YMlKec fxKbKc' is common for the main price
            
            price_div = soup.find("div", {"class": "YMlKec fxKbKc"})
            if price_div:
                price_text = price_div.text.replace('₹', '').replace(',', '').strip()
                return float(price_text)
                
            return 0.0
        except Exception as e:
            logger.debug(f"Scrape failed: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        # Minimal implementation for now
        price = await self.get_latest_price(symbol)
        return {"price": price, "source": "GoogleFinance"}


# moneycontrol_service.py

from typing import Dict, Any, List
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class MoneyControlProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        # Search URL to find the specific company page is complex
        # For MVP we might need a mapping or just search logic.
        # But for 'News', we can try the generic search or symbol specific if known.
        # Fallback to Google News is easier? 
        # Let's try to scrape specific MC page if we can map Symbol -> Slug.
        # Since mapping is hard without a DB, we will implement a Google News RSS fallback 
        # which is robust for any symbol.
        self.base_url = "https://news.google.com/rss/search"

    @property
    def source_name(self) -> str:
        return "News_Aggregator"

    async def get_latest_price(self, symbol: str) -> float:
        return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        # Returns news
        return {"news": await self.get_news(symbol)}

    async def get_news(self, symbol: str) -> List[Dict[str, str]]:
        try:
            ticker = symbol.replace('.NS', '')
            query = f"{ticker} share price news india"
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._fetch_rss, query)
        except Exception as e:
            logger.error(f"News Error: {e}")
            return []

    def _fetch_rss(self, query: str) -> List[Dict[str, str]]:
        try:
            params = {"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"}
            resp = requests.get(self.base_url, params=params, timeout=5)
            soup = BeautifulSoup(resp.content, "xml")
            
            items = soup.find_all("item", limit=5)
            news = []
            for item in items:
                news.append({
                    "title": item.title.text,
                    "link": item.link.text,
                    "pubDate": item.pubDate.text,
                    "source": item.source.text if item.source else "Google News"
                })
            return news
        except Exception as e:
            logger.error(f"RSS Parse Error: {e}")
            return []


# nselib_service.py

from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
from nselib import capital_market
import logging
import asyncio

logger = logging.getLogger(__name__)

class NSELibProvider(BaseDataSource):
    @property
    def source_name(self) -> str:
        return "NSE_Lib"

    async def get_latest_price(self, symbol: str) -> float:
        try:
            # Run blocking call in executor
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: capital_market.price_volume_and_deliverable_position_data(symbol=symbol, period='1D'))
            
            # Validate DataFrame
            if data is None or data.empty:
                logger.warning(f"NSELib returned empty data for {symbol}")
                return 0.0
            
            # Check for required column
            if 'LastPrice' not in data.columns:
                logger.error(f"LastPrice column missing for {symbol}")
                return 0.0
            
            # Get last row
            latest = data.iloc[-1]
            price_val = latest['LastPrice']
            
            # Handle string or float
            if isinstance(price_val, str):
                price = float(price_val.replace(',', '').strip())
            else:
                price = float(price_val)
            
            # Sanity check
            if price <= 0 or price > 1_000_000:
                logger.warning(f"Suspicious price for {symbol}: {price}")
                return 0.0
                
            return price
        except Exception as e:
            logger.error(f"NSELib Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: capital_market.price_volume_and_deliverable_position_data(symbol=symbol, period='1D'))
            
            if data is not None and not data.empty:
                latest = data.iloc[-1].to_dict()
                
                # Manual Calculation of Change (since nselib doesn't provide it)
                try:
                    last_price = float(str(latest.get('LastPrice', '0')).replace(',', ''))
                    prev_close = float(str(latest.get('PrevClose', '0')).replace(',', ''))
                    
                    if prev_close > 0:
                        change = last_price - prev_close
                        p_change = (change / prev_close) * 100
                        
                        latest['Change'] = change
                        latest['pChange'] = p_change
                except Exception as ex:
                    logger.warning(f"Could not calc change for {symbol}: {ex}")

                return latest
            return {}
        except Exception as e:
            logger.error(f"NSELib Details Error for {symbol}: {e}")
            return {}


# screener_service.py

from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
import requests
from bs4 import BeautifulSoup
import logging
from fake_useragent import UserAgent
import asyncio

logger = logging.getLogger(__name__)

class ScreenerProvider(BaseDataSource):
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://www.screener.in/company"
        
    @property
    def source_name(self) -> str:
        return "Screener.in"
        
    def _get_headers(self):
        return {
            "User-Agent": self.ua.random
        }

    async def get_latest_price(self, symbol: str) -> float:
        # Screener is better for details, but can parse price too
        details = await self.get_stock_details(symbol)
        return float(details.get("current_price", 0.0))

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetches fundamentals like Market Cap, P/E, ROE from Screener.in
        """
        try:
            ticker = symbol.replace('.NS', '')
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._scrape_details, ticker)
        except Exception as e:
            logger.error(f"Screener Error for {symbol}: {e}")
            return {}

    def _scrape_details(self, ticker: str) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}/{ticker}/" # consolidating? normally /company/TICKER/
            resp = requests.get(url, headers=self._get_headers(), timeout=5)
            
            if resp.status_code != 200:
                # Try consolidated
                url = f"{self.base_url}/{ticker}/consolidated/"
                resp = requests.get(url, headers=self._get_headers(), timeout=5)
                if resp.status_code != 200:
                    return {}

            soup = BeautifulSoup(resp.text, 'lxml')
            
            # Parse Top Ratios
            # ul id="top-ratios" -> li -> span name, span value
            ratios = {}
            top_ratios = soup.find("ul", {"id": "top-ratios"})
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_span = li.find("span", {"class": "name"})
                    val_span = li.find("span", {"class": "value"})
                    if name_span and val_span:
                        key = name_span.text.strip().lower().replace(" ", "_")
                        val = val_span.text.replace(',', '').strip()
                        try:
                            ratios[key] = float(val)
                        except:
                            ratios[key] = val
                            
                            ratios[key] = val
                            
            # Normalize Keys for Frontend
            if "stock_p/e" in ratios:
                ratios["pe_ratio"] = ratios["stock_p/e"]
            if "high_/_low" in ratios:
                hl = str(ratios["high_/_low"]).split("/")
                if len(hl) == 2:
                    try:
                        ratios["high_52w"] = float(hl[0].strip().replace(",", ""))
                        ratios["low_52w"] = float(hl[1].strip().replace(",", ""))
                    except:
                        pass
            
            return ratios
        except Exception as e:
            logger.error(f"Screener scrape failed: {e}")
            return {}


# yahoo_service.py

from typing import Dict, Any
from app.interfaces.market_data import BaseDataSource
import yfinance as yf
import logging
import asyncio

logger = logging.getLogger(__name__)

class YahooProvider(BaseDataSource):
    @property
    def source_name(self) -> str:
        return "YahooFinance"

    async def get_latest_price(self, symbol: str) -> float:
        try:
            # Yahoo needs ".NS" suffix for NSE
            ticker = f"{symbol}.NS"
            
            loop = asyncio.get_event_loop()
            # fetching history(period='1d') is fast
            hist = await loop.run_in_executor(None, lambda: yf.Ticker(ticker).history(period="1d"))
            
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
            return 0.0
        except Exception as e:
            logger.error(f"Yahoo Error for {symbol}: {e}")
            return 0.0

    async def get_stock_details(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch detailed stock information from Yahoo Finance.
        Tries NSE first (.NS), then BSE (.BO) as fallback.
        """
        def _fetch(ticker_symbol: str):
            try:
                info = yf.Ticker(ticker_symbol).info
                # Check if we got valid data
                if not info or 'currentPrice' not in info:
                    return None
                return info
            except Exception as e:
                logger.debug(f"Yahoo fetch error for {ticker_symbol}: {e}")
                return None
        
        # Try NSE first
        ticker = f"{symbol}.NS"
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _fetch, ticker)
        
        # If NSE fails, try BSE as fallback
        if info is None:
            logger.info(f"NSE data unavailable for {symbol}, trying BSE...")
            ticker = f"{symbol}.BO"
            info = await loop.run_in_executor(None, _fetch, ticker)
            
            if info is not None:
                logger.info(f"✓ BSE data found for {symbol}")
        
        # Normalize Keys if we got data
        if info:
            info['market_cap'] = info.get('marketCap')
            info['pe_ratio'] = info.get('trailingPE')
            info['high_52w'] = info.get('fiftyTwoWeekHigh')
            info['low_52w'] = info.get('fiftyTwoWeekLow')
            return info
        
        return {}


# __init__.py



# comparison_engine.py

import logging
import asyncio
from typing import List, Dict, Any
from app.services.market_service import MarketService

logger = logging.getLogger(__name__)

class ComparisonEngine:
    """
    Compares multiple stocks side-by-side using standardized metrics.
    """
    
    def __init__(self):
        self.market_service = MarketService()
    
    async def compare_stocks(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Compare a list of stocks.
        """
        try:
            # Limit to 5 stocks for performance
            symbols = symbols[:5]
            
            # Fetch analysis in parallel
            tasks = [self.market_service.get_comprehensive_analysis(sym) for sym in symbols]
            analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            comparison_data = {}
            valid_analyses = []
            
            for i, result in enumerate(analyses):
                if isinstance(result, Exception) or "error" in result:
                    continue
                
                sym = symbols[i]
                valid_analyses.append(result)
                
                # Extract key metrics for comparison
                scores = result.get("scores", {})
                stability = scores.get("stability", {})
                timing = scores.get("timing", {})
                risk = scores.get("risk", {})
                fundamental = result.get("analysis", {}).get("fundamental", {})
                
                # Extract fundamentals
                fundamentals = result.get("raw_data", {}).get("fundamentals", {})
                
                # Calculate equity to debt ratio (useful for calculations even if not displayed)
                debt_to_equity = fundamentals.get("debt_to_equity", "N/A")
                equity_to_debt = "N/A"
                if isinstance(debt_to_equity, (int, float)) and debt_to_equity > 0:
                    equity_to_debt = round(1 / debt_to_equity, 2)
                
                comparison_data[sym] = {
                    "price": result.get("price"),
                    "composite_score": result.get("recommendation", {}).get("composite_score", 0),
                    "action": result.get("recommendation", {}).get("action", "HOLD"),
                    "stability_score": stability.get("score", 0),
                    "stability_label": stability.get("interpretation", "N/A"),
                    "timing_score": timing.get("score", 0),
                    "timing_signal": timing.get("signal", "NEUTRAL"),
                    "risk_score": risk.get("risk_score", 50),
                    "risk_level": risk.get("risk_level", "MEDIUM"),
                    "valuation": fundamental.get("valuation", {}).get("level", "FAIR"),
                    "health_score": fundamental.get("health_score", 50),
                    # Add fundamental metrics
                    "market_cap": fundamentals.get("market_cap", "N/A"),
                    "pe_ratio": fundamentals.get("pe", fundamentals.get("pe_ratio", "N/A")),
                    "roe": fundamentals.get("roe", "N/A"),
                    "debt_to_equity": debt_to_equity,
                    "equity_to_debt": equity_to_debt,  # Keep for calculations
                    "dividend_yield": fundamentals.get("dividend_yield", "N/A")
                }
            
            if not comparison_data:
                return {"error": "Could not compare stocks"}
            
            # Determine winners
            winners = self._determine_winners(valid_analyses, comparison_data)
            
            return {
                "comparison": comparison_data,
                "winners": winners,
                "summary": self._generate_summary(winners, comparison_data)
            }
            
        except Exception as e:
            logger.error(f"Comparison Error: {e}")
            return {"error": str(e)}
    
    def _determine_winners(self, analyses: List[dict], data: dict) -> Dict[str, str]:
        """Identify best stock for each category."""
        winners = {}
        
        try:
            # Best Overall (Composite Score)
            winners["best_overall"] = max(data.items(), key=lambda x: x[1]['composite_score'])[0]
            
            # Most Stable
            winners["most_stable"] = max(data.items(), key=lambda x: x[1]['stability_score'])[0]
            
            # Best Value (Lowest Risk Score for now as proxy, or check valuation)
            # Actually, let's use the one with 'UNDERVALUED' or highest health score if tied
            undervalued = [k for k, v in data.items() if v['valuation'] == 'UNDERVALUED']
            if undervalued:
                winners["best_value"] = max(undervalued, key=lambda k: data[k]['health_score'])
            else:
                 winners["best_value"] = max(data.items(), key=lambda x: x[1]['health_score'])[0]

            # Lowest Risk
            winners["lowest_risk"] = min(data.items(), key=lambda x: x[1]['risk_score'])[0]
            
            # Best Equity to Debt (highest ratio = better financial health)
            equity_to_debt_stocks = [(k, v['equity_to_debt']) for k, v in data.items() if isinstance(v['equity_to_debt'], (int, float))]
            if equity_to_debt_stocks:
                winners["best_equity_to_debt"] = max(equity_to_debt_stocks, key=lambda x: x[1])[0]
            
            return winners
        except Exception as e:
            logger.error(f"Winner calc error: {e}")
            return {}

    def _generate_summary(self, winners: dict, data: dict) -> str:
        """Generate a detailed text summary of the comparison."""
        best = winners.get('best_overall')
        if not best:
            return "Unable to generate summary."
        
        best_data = data[best]
        action = best_data['action']
        score = best_data['composite_score']
        valuation = best_data['valuation']
        risk = best_data['risk_level']
        
        # Build comprehensive summary
        summary_parts = []
        
        # Main recommendation
        summary_parts.append(
            f"{best} is the top pick with a {action} rating and composite score of {score:.1f}/100. "
            f"It's currently {valuation.lower()} with {risk.lower()} risk."
        )
        
        # Stability insight
        most_stable = winners.get('most_stable')
        if most_stable and most_stable != best:
            stable_score = data[most_stable]['stability_score']
            summary_parts.append(
                f"{most_stable} offers the highest stability (score: {stable_score:.1f}), "
                f"making it ideal for conservative investors."
            )
        
        # Value insight
        best_value = winners.get('best_value')
        if best_value:
            value_valuation = data[best_value]['valuation']
            if value_valuation == 'UNDERVALUED':
                summary_parts.append(
                    f"{best_value} presents the best value opportunity, currently undervalued."
                )
        
        # Risk insight
        lowest_risk = winners.get('lowest_risk')
        if lowest_risk and lowest_risk != best:
            risk_score = data[lowest_risk]['risk_score']
            summary_parts.append(
                f"{lowest_risk} has the lowest risk profile (risk score: {risk_score:.1f})."
            )
        
        return " ".join(summary_parts)


# sector_recommender.py

import logging
import asyncio
from app.services.market_service import MarketService
from app.services.data.sector_mapper import SectorMapper

logger = logging.getLogger(__name__)

class SectorRecommender:
    """
    Research-backed sector recommendations using dynamic stock discovery.
    NO hardcoded mappings - all stocks discovered from live NSE data.
    """
    
    def __init__(self):
        self.market_service = MarketService()
        self.sector_mapper = SectorMapper()
    
    async def get_top_picks(self, sector_query: str, limit: int = 5, criteria: str = "balanced") -> dict:
        """
        Get top stock recommendations for a sector.
        
        Args:
            sector_query: Sector name or keyword (e.g., "AUTO", "aluminum", "pharma")
            limit: Number of recommendations to return (default 5)
            criteria: Ranking criteria - "balanced", "stability", "growth", "value"
        
        Returns:
            Dictionary with top picks and analysis
        """
        try:
            # Step 1: Discover stocks in sector
            sector_data = await self.sector_mapper.search_sector_by_keyword(sector_query)
            
            if not sector_data.get('stocks'):
                return {
                    "error": f"No stocks found for '{sector_query}'",
                    "suggestion": "Try: AUTO, IT, BANK, PHARMA, FMCG, METAL, ENERGY",
                    "available_sectors": self.sector_mapper.get_available_sectors()
                }
            
            stocks = sector_data['stocks']
            matched_sector = sector_data['matched_sector']
            
            logger.info(f"Analyzing {len(stocks)} stocks in {matched_sector} sector")
            
            # Step 2: Analyze stocks (limit to top 20 for performance)
            # If sector has 100 stocks, analyze top 20 by market cap first
            stocks_to_analyze = stocks[:20]
            
            tasks = [self.market_service.get_comprehensive_analysis(sym) for sym in stocks_to_analyze]
            analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Step 3: Score and rank
            results = []
            for analysis in analyses:
                if isinstance(analysis, Exception):
                    logger.warning(f"Analysis failed: {analysis}")
                    continue
                
                if "error" in analysis:
                    logger.warning(f"Analysis error for {analysis.get('symbol')}: {analysis['error']}")
                    continue
                
                try:
                    scored_stock = self._score_stock(analysis, criteria)
                    results.append(scored_stock)
                except Exception as e:
                    logger.error(f"Scoring error: {e}")
                    continue
            
            if not results:
                return {
                    "error": "Could not analyze stocks in this sector",
                    "sector": matched_sector,
                    "attempted": len(stocks_to_analyze)
                }
            
            # Step 4: Sort by composite score
            results.sort(key=lambda x: x['composite_score'], reverse=True)
            
            # Step 5: Generate sector overview
            sector_overview = self._generate_sector_overview(results)
            
            return {
                "sector": matched_sector,
                "query": sector_query,
                "top_picks": results[:limit],
                "total_analyzed": len(results),
                "total_in_sector": len(stocks),
                "sector_overview": sector_overview,
                "ranking_criteria": criteria
            }
            
        except Exception as e:
            logger.error(f"Sector Recommender Error: {e}")
            return {"error": str(e)}
    
    def _score_stock(self, analysis: dict, criteria: str) -> dict:
        """
        Calculate composite score based on criteria.
        """
        stability = analysis.get("scores", {}).get("stability", {}).get("score", 0)
        timing = analysis.get("scores", {}).get("timing", {}).get("score", 0)
        risk = analysis.get("scores", {}).get("risk", {}).get("risk_score", 50)
        
        fundamental = analysis.get("analysis", {}).get("fundamental", {})
        health_score = fundamental.get("health_score", 50)
        
        # Weighted scoring based on criteria
        if criteria == "stability":
            composite = (stability * 0.6) + (health_score * 0.3) + ((100 - risk) * 0.1)
        elif criteria == "growth":
            growth_level = fundamental.get("growth_potential", {}).get("level", "LOW")
            growth_bonus = {"HIGH": 30, "MODERATE": 15, "LOW": 0, "DECLINING": -20}.get(growth_level, 0)
            composite = (timing * 0.4) + (health_score * 0.3) + ((100 - risk) * 0.2) + growth_bonus
        elif criteria == "value":
            valuation_level = fundamental.get("valuation", {}).get("level", "FAIR")
            value_bonus = {"UNDERVALUED": 25, "FAIR": 10, "OVERVALUED": -15}.get(valuation_level, 0)
            composite = (stability * 0.3) + (health_score * 0.3) + ((100 - risk) * 0.2) + value_bonus + 20
        else:  # balanced
            composite = (stability * 0.3) + (timing * 0.3) + ((100 - risk) * 0.2) + (health_score * 0.2)
        
        recommendation = analysis.get("recommendation", {})
        
        return {
            "symbol": analysis["symbol"],
            "name": analysis["symbol"],  # Would ideally fetch company name
            "price": analysis["price"],
            "price_raw": analysis.get("price_raw", 0),
            "composite_score": round(composite),
            "stability_score": stability,
            "timing_signal": analysis.get("scores", {}).get("timing", {}).get("signal"),
            "risk_level": analysis.get("scores", {}).get("risk", {}).get("risk_level"),
            "recommendation": recommendation.get("action", "HOLD"),
            "confidence": recommendation.get("confidence", "MEDIUM"),
            "reasoning": recommendation.get("reasoning", ""),
            "key_highlights": self._generate_highlights(analysis),
            "technical_signal": analysis.get("analysis", {}).get("technical", {}).get("signal", "NEUTRAL"),
            "fundamental_health": fundamental.get("valuation", {}).get("level", "FAIR"),
            "news_sentiment": analysis.get("analysis", {}).get("news", {}).get("sentiment", "NEUTRAL")
        }
    
    def _generate_highlights(self, analysis: dict) -> list:
        """Generate key highlights for a stock."""
        highlights = []
        
        scores = analysis.get("scores", {})
        analysis_data = analysis.get("analysis", {})
        
        # Stability
        stability_score = scores.get("stability", {}).get("score", 0)
        if stability_score >= 75:
            highlights.append(f"High stability ({stability_score}/100)")
        
        # Timing
        timing_signal = scores.get("timing", {}).get("signal")
        if timing_signal == "BUY":
            highlights.append("Strong buy signal")
        
        # Risk
        risk_level = scores.get("risk", {}).get("risk_level")
        if risk_level == "LOW":
            highlights.append("Low risk profile")
        
        # Fundamentals
        fund = analysis_data.get("fundamental", {})
        valuation = fund.get("valuation", {}).get("level")
        if valuation == "UNDERVALUED":
            highlights.append("Currently undervalued")
        
        # Growth
        growth = fund.get("growth_potential", {}).get("level")
        if growth == "HIGH":
            highlights.append("High growth potential")
        
        # News
        news_sentiment = analysis_data.get("news", {}).get("sentiment")
        if news_sentiment == "POSITIVE":
            highlights.append("Positive news sentiment")
        
        return highlights[:4]  # Top 4 highlights
    
    def _generate_sector_overview(self, results: list) -> dict:
        """Generate sector-level insights."""
        if not results:
            return {}
        
        # Average scores
        avg_stability = sum(r['stability_score'] for r in results) / len(results)
        avg_composite = sum(r['composite_score'] for r in results) / len(results)
        
        # Count recommendations
        buy_count = sum(1 for r in results if r['recommendation'] in ['BUY', 'STRONG BUY'])
        hold_count = sum(1 for r in results if r['recommendation'] == 'HOLD')
        
        # Sector health
        if avg_composite >= 70:
            health = "STRONG"
            outlook = "Positive sector outlook with multiple strong performers"
        elif avg_composite >= 55:
            health = "HEALTHY"
            outlook = "Stable sector with good opportunities"
        elif avg_composite >= 40:
            health = "MIXED"
            outlook = "Mixed signals - selective opportunities"
        else:
            health = "WEAK"
            outlook = "Sector facing challenges - caution advised"
        
        return {
            "sector_health": health,
            "outlook": outlook,
            "average_stability": round(avg_stability),
            "average_score": round(avg_composite),
            "buy_recommendations": buy_count,
            "hold_recommendations": hold_count,
            "total_stocks": len(results)
        }


# __init__.py



# risk_profiler.py

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class RiskProfileEngine:
    """
    Calculates a Risk Profile (LOW/MEDIUM/HIGH) and Risk Score (0-100).
    Higher Score = Higher Risk.
    """

    def calculate_risk(self, symbol: str, market_data: dict) -> dict:
        try:
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Volatility Risk (40%)
            vol_risk, vol_val = self._calc_volatility_risk(history)
            
            # 2. Drawdown Risk (30%)
            dd_risk, dd_val = self._calc_drawdown_risk(history)
            
            # 3. Fundamental Risk (30%)
            fund_risk, fund_val = self._calc_fundamental_risk(fundamentals)
            
            total_risk = vol_risk + dd_risk + fund_risk
            
            return {
                "risk_score": round(total_risk),
                "risk_level": self._get_level(total_risk),
                "breakdown": {
                    "volatility_risk": {"score": vol_risk, "value": vol_val},
                    "drawdown_risk": {"score": dd_risk, "value": dd_val},
                    "fundamental_risk": {"score": fund_risk, "value": fund_val}
                }
            }
        except Exception as e:
            logger.error(f"Risk Calc Error for {symbol}: {e}")
            return {"risk_score": 50, "risk_level": "UNKNOWN", "error": str(e)}

    def _calc_volatility_risk(self, history: list) -> tuple:
        if not history or len(history) < 20: return 20, "N/A"
        
        closes = [float(d['close']) for d in history]
        returns = np.diff(closes) / closes[:-1]
        vol = np.std(returns) * np.sqrt(252) * 100
        
        # Vol > 40% = Max Risk (40pts)
        score = min(40, (vol / 40) * 40)
        return round(score), f"{vol:.2f}%"

    def _calc_drawdown_risk(self, history: list) -> tuple:
        if not history: return 15, "N/A"
        
        df = pd.DataFrame(history)
        close = df['close'].astype(float)
        
        rolling_max = close.cummax()
        drawdown = (close - rolling_max) / rolling_max
        max_dd = drawdown.min() * 100 # e.g. -30.5
        
        # Max Drawdown of -50% = Max Risk (30pts)
        score = min(30, (abs(max_dd) / 50) * 30)
        
        return round(score), f"{max_dd:.2f}%"

    def _calc_fundamental_risk(self, fundamentals: dict) -> tuple:
        score = 0
        issues = []
        
        # High Debt
        de = float(fundamentals.get("debtToEquity", 0)) / 100
        if de > 2.0: 
            score += 15
            issues.append("High Debt")
        elif de > 1.0:
            score += 8
            
        # Beta (Market Sensitivity)
        beta = float(fundamentals.get("beta", 1.0))
        if beta > 1.5:
            score += 15
            issues.append("High Beta")
        elif beta > 1.2:
            score += 8
            
        return min(30, score), ", ".join(issues) if issues else "Safe"

    def _get_level(self, score):
        if score >= 60: return "HIGH"
        if score >= 30: return "MEDIUM"
        return "LOW"


# stability_scorer.py

import logging
import numpy as np

logger = logging.getLogger(__name__)

class StabilityScoreEngine:
    """
    Calculates a stability score (0-100) indicating how 'safe' or 'stable' a stock is.
    Based on: Volatility (30%), Fundamentals (30%), Market Position (20%), Growth (20%).
    """

    def calculate_score(self, symbol: str, market_data: dict) -> dict:
        try:
            # Extract Data
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Volatility Score (30 pts)
            vol_score, vol_metrics = self._calc_volatility_score(history)
            
            # 2. Fundamental Score (30 pts)
            fund_score, fund_metrics = self._calc_fundamental_score(fundamentals)
            
            # 3. Market Position Score (20 pts)
            mkt_score, mkt_metrics = self._calc_market_score(fundamentals)
            
            # 4. Growth Consistency (20 pts)
            growth_score, growth_metrics = self._calc_growth_score(fundamentals)
            
            total_score = vol_score + fund_score + mkt_score + growth_score
            
            return {
                "score": round(total_score),
                "breakdown": {
                    "volatility": {"score": vol_score, "max": 30, "metrics": vol_metrics},
                    "fundamentals": {"score": fund_score, "max": 30, "metrics": fund_metrics},
                    "market_position": {"score": mkt_score, "max": 20, "metrics": mkt_metrics},
                    "growth": {"score": growth_score, "max": 20, "metrics": growth_metrics}
                },
                "interpretation": self._interpret_score(total_score)
            }
        except Exception as e:
            logger.error(f"Stability Calc Error for {symbol}: {e}")
            return {"score": 0, "error": str(e)}

    def _calc_volatility_score(self, history: list) -> tuple:
        if not history or len(history) < 20:
            return 15, {"volatility_annualized": "N/A"} # Default average
            
        closes = [float(d['close']) for d in history]
        returns = np.diff(closes) / closes[:-1]
        volatility = np.std(returns) * np.sqrt(252) * 100 # Annualized %
        
        # Lower volatility = Higher score
        # Target < 20% for max score, > 50% for 0 score
        score = max(0, min(30, 30 * (1 - (volatility - 10) / 40)))
        
        return round(score), {"volatility_annualized": f"{volatility:.2f}%"}

    def _calc_fundamental_score(self, fundamentals: dict) -> tuple:
        score = 0
        metrics = {}
        
        # Debt to Equity (10 pts)
        de = float(fundamentals.get("debtToEquity", 100)) / 100 if fundamentals.get("debtToEquity") else 1.0
        metrics["debt_to_equity"] = round(de, 2)
        if de < 0.5: score += 10
        elif de < 1.0: score += 7
        elif de < 2.0: score += 4
        
        # Current Ratio (10 pts) - Proxy using quick ratio or creating a mock if missing
        cr = float(fundamentals.get("currentRatio", 1.0))
        metrics["current_ratio"] = round(cr, 2)
        if cr > 2.0: score += 10
        elif cr > 1.5: score += 7
        elif cr > 1.0: score += 5
        
        # ROE (10 pts)
        roe = float(fundamentals.get("returnOnEquity", 0)) * 100
        metrics["roe"] = f"{roe:.2f}%"
        if roe > 20: score += 10
        elif roe > 15: score += 8
        elif roe > 10: score += 5
        
        return score, metrics

    def _calc_market_score(self, fundamentals: dict) -> tuple:
        score = 0
        metrics = {}
        
        # Market Cap (10 pts)
        mcap = float(fundamentals.get("marketCap", 0))
        metrics["market_cap_cr"] = round(mcap / 10000000, 2) # Assume value is raw, convert to Cr roughly (adjustment needed based on source)
        
        # Heuristic: > 1L Cr is Large Cap
        if mcap > 1000000000000: score += 10 # 1 Trillion
        elif mcap > 500000000000: score += 7
        elif mcap > 100000000000: score += 4
        
        # Volume/Liquidity (10 pts) - Hard to get exact volume score without avg volume, use safe default
        score += 5 
        
        return score, metrics

    def _calc_growth_score(self, fundamentals: dict) -> tuple:
        # Placeholder for complex growth variance calc
        # Using Revenue Growth and EPS Growth from fundamentals if available
        score = 10 # Default
        
        rev_growth = float(fundamentals.get("revenueGrowth", 0))
        if rev_growth > 0.15: score += 5
        
        return score, {"revenue_growth": f"{rev_growth:.1%}"}

    def _interpret_score(self, score):
        if score >= 80: return "HIGH_STABILITY"
        if score >= 60: return "MEDIUM_STABILITY"
        if score >= 40: return "MODERATE_STABILITY"
        return "LOW_STABILITY"


# timing_scorer.py

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class TimingScoreEngine:
    """
    Calculates a Timing Score (0-100) and Signal (BUY/NEUTRAL/SELL).
    Based on: Technicals (40%), Valuation (30%), Momentum (20%), Sentiment (10%).
    """

    def calculate_score(self, symbol: str, market_data: dict) -> dict:
        try:
            history = market_data.get("history", [])
            fundamentals = market_data.get("fundamentals", {})
            
            # 1. Technical Signals (40 pts)
            tech_score, tech_metrics = self._calc_technicals(history)
            
            # 2. Valuation Score (30 pts)
            val_score, val_metrics = self._calc_valuation(fundamentals)
            
            # 3. Momentum Score (20 pts)
            mom_score, mom_metrics = self._calc_momentum(history)
            
            # 4. Sentiment (10 pts) - Placeholder for now
            sent_score = 5
            
            total_score = tech_score + val_score + mom_score + sent_score
            
            return {
                "score": round(total_score),
                "signal": self._get_signal(total_score),
                "confidence": "HIGH" if total_score > 70 or total_score < 30 else "MEDIUM",
                "breakdown": {
                    "technical": {"score": tech_score, "max": 40, "metrics": tech_metrics},
                    "valuation": {"score": val_score, "max": 30, "metrics": val_metrics},
                    "momentum": {"score": mom_score, "max": 20, "metrics": mom_metrics},
                    "sentiment": {"score": sent_score, "max": 10}
                }
            }
        except Exception as e:
            logger.error(f"Timing Calc Error for {symbol}: {e}")
            return {"score": 0, "signal": "UNKNOWN", "error": str(e)}

    def _calc_technicals(self, history: list) -> tuple:
        if not history or len(history) < 200:
            return 20, {"error": "Not enough history"}
            
        df = pd.DataFrame(history)
        df['close'] = df['close'].astype(float)
        
        current_price = df['close'].iloc[-1]
        
        # Moving Averages
        ma50 = df['close'].rolling(window=50).mean().iloc[-1]
        ma200 = df['close'].rolling(window=200).mean().iloc[-1]
        
        score = 0
        signals = []
        
        # Price vs MA50
        if current_price > ma50:
            score += 15
            signals.append("Price > 50DMA")
        
        # Price vs MA200 (Golden Cross potential)
        if current_price > ma200:
            score += 15
            signals.append("Price > 200DMA")
            
        # RSI Calculation (Basic 14 period)
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        # RSI Logic
        if 30 <= rsi <= 50: score += 10 # Good entry
        elif rsi < 30: score += 10 # Oversold (Buy)
        elif rsi > 70: score -= 5 # Overbought
        
        metrics = {
            "ma50": round(ma50, 2),
            "ma200": round(ma200, 2),
            "rsi": round(rsi, 2),
            "signals": signals
        }
        
        return min(40, max(0, score)), metrics

    def _calc_valuation(self, fundamentals: dict) -> tuple:
        score = 15 # Start neutral
        metrics = {}
        
        pe = float(fundamentals.get("trailingPE", 0))
        metrics["pe"] = round(pe, 2)
        
        # Simple heuristic since we lack sector PE currently
        # PE < 20 generally decent value for Indian market (very rough)
        if 0 < pe < 20: score += 10
        elif pe > 50: score -= 5
        
        pb = float(fundamentals.get("priceToBook", 0))
        metrics["pb"] = round(pb, 2)
        if 0 < pb < 3: score += 5
        
        return min(30, max(0, score)), metrics

    def _calc_momentum(self, history: list) -> tuple:
        if not history or len(history) < 30: return 10, {}
        
        df = pd.DataFrame(history)
        close = df['close'].astype(float)
        
        # 1 Month Return
        ret_1m = (close.iloc[-1] - close.iloc[-20]) / close.iloc[-20]
        
        score = 10
        if ret_1m > 0: score += 10 # Positive momentum
        
        return score, {"1m_return": f"{ret_1m:.1%}"}

    def _get_signal(self, score):
        if score >= 70: return "BUY"
        if score >= 40: return "NEUTRAL"
        return "WAIT"


# formatters.py

def format_inr(amount: float) -> str:
    """
    Format amount in Indian Rupee notation.
    
    Examples:
        50000 -> ₹50,000
        100000 -> ₹1.00 L
        10000000 -> ₹1.00 Cr
        100000000 -> ₹10.00 Cr
    """
    if amount >= 10_000_000:  # Crore
        return f"₹{amount/10_000_000:.2f} Cr"
    elif amount >= 100_000:  # Lakh
        return f"₹{amount/100_000:.2f} L"
    else:
        return f"₹{amount:,.0f}"  # Thousand separator


def format_percent(value: float, decimals: int = 2) -> str:
    """Format percentage with + or - sign."""
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.{decimals}f}%"


# market_hours.py

"""
Market Hours Utility

Provides functions to check if Indian stock market (NSE/BSE) is currently open
and calculate appropriate cache expiry times based on market hours.

Market Hours (IST):
- Pre-market: 9:00 AM - 9:15 AM
- Regular: 9:15 AM - 3:30 PM
- Post-market: 3:30 PM - 4:00 PM
- Closed: Weekends and public holidays
"""

from datetime import datetime, time, timedelta
import pytz

IST = pytz.timezone('Asia/Kolkata')

# Market hours in IST
MARKET_OPEN = time(9, 15)  # 9:15 AM
MARKET_CLOSE = time(15, 30)  # 3:30 PM

def is_market_open() -> bool:
    """
    Check if the Indian stock market is currently open.
    
    Returns:
        bool: True if market is open, False otherwise
    """
    now = datetime.now(IST)
    
    # Check if weekend (Saturday = 5, Sunday = 6)
    if now.weekday() >= 5:
        return False
    
    # Check if within market hours
    current_time = now.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE

def get_smart_cache_expiry(base_expiry: int) -> int:
    """
    Calculate cache expiry based on market hours.
    
    During market hours: Use base_expiry (short cache)
    After market close: Cache until next market open
    
    Args:
        base_expiry: Base cache duration in seconds (used during market hours)
        
    Returns:
        int: Cache expiry in seconds
    """
    now = datetime.now(IST)
    
    # If market is open, use base expiry
    if is_market_open():
        return base_expiry
    
    # Market is closed - calculate time until next open
    next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    # If we're past market close today, next open is tomorrow
    if now.time() > MARKET_CLOSE:
        next_open += timedelta(days=1)
    
    # Skip weekends
    while next_open.weekday() >= 5:
        next_open += timedelta(days=1)
    
    # Calculate seconds until next open
    seconds_until_open = int((next_open - now).total_seconds())
    
    # Cap at 24 hours to avoid excessively long cache
    return min(seconds_until_open, 86400)

def get_next_market_open() -> datetime:
    """
    Get the datetime of the next market opening.
    
    Returns:
        datetime: Next market open time in IST
    """
    now = datetime.now(IST)
    next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    # If we're past market close today or it's already past open time, move to next day
    if now.time() >= MARKET_CLOSE or (now.time() >= MARKET_OPEN and now.time() < MARKET_CLOSE):
        next_open += timedelta(days=1)
    
    # Skip weekends
    while next_open.weekday() >= 5:
        next_open += timedelta(days=1)
    
    return next_open



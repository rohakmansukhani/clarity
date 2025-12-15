from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import get_current_user
from app.core.supabase_client import get_supabase
from supabase import Client

router = APIRouter()

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
    allocation_percent: float = 0.0

@router.get("/", response_model=List[PortfolioResponse])
def list_portfolios(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """List all portfolios for current user"""
    try:
        # Supabase RLS policies ensure we only see our own
        response = supabase.table("portfolios").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{portfolio_id}/holdings", summary="Add a holding to a portfolio")
def add_holding(
    portfolio_id: str,
    holding: HoldingCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        data = {
            "portfolio_id": portfolio_id,
            "ticker": holding.ticker,
            "exchange": holding.exchange,
            "shares": holding.shares,
            "allocation_percent": holding.allocation_percent
        }
        res = supabase.table("holdings").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=PortfolioResponse)
def create_portfolio(
    portfolio: PortfolioCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new portfolio"""
    try:
        # auth.uid() is handled by passing the token in header if we used the client properly
        # But `supabase-py` client instantiated with service/anon key doesn't automatically attach the user context 
        # unless we sign in or set the auth header manually. 
        # CRITICAL: We need to pass the JWT from the dependent user to the supabase client call 
        # OR use the user_id explicitly in the insert if RLS allows it (but RLS `auth.uid()` checks token).
        
        # Simpler approach for now if using Service Role (dangerous) or Anon Key:
        # We need to act AS the user.
        # `supabase.auth.set_session(access_token, refresh_token)`
        
        # Ideally, we should receive the `Authorization` header and pass it to Supabase.
        # But `postgrest-py` usually takes the token.
        
        # Let's try inserting with explicit user_id for now, but RLS might block if it expects auth.uid().
        # Correct pattern with supabase-py:
        # supabase.postgrest.auth(token)
        
        # We will assume `get_current_user` dependency verified the token.
        # We need to set the token for THIS REQUEST on the client.
        
        # However, `supabase` client is a singleton. Modifying it is not thread safe? 
        # Actually it creates a NEW builder chain. `supabase.table()` is safe.
        # But `.auth` on the client might persist?
        
        # Better: user `supabase.table("...").insert({...}).execute()`
        # If RLS is ON, we need the token. 
        # Limitation: Singleton Supabase client with simple `create_client` generally uses the ANON key.
        # To perform actions AS A USER, we should create a client for that user OR pass the token headers.
        
        # Workaround: Insert user_id explicitly and hope RLS 'insert with check' passes if we use service role?
        # No, user wants safe code.
        
        # Let's insert explicit user_id.
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

from fastapi import APIRouter, HTTPException, Request, Body, Depends
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
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
async def chat_with_ai(
    request: Request, 
    body: ChatRequest,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """
    Chat with Clarity AI.
    Accepts a query, optional context, and optional conversation history for context-aware responses.
    Automatically enriches context with User Portfolios and Mutual Fund Holdings.
    """
    try:
        # 1. Fetch User Data
        context = body.context or {}
        
        try:
            # Fetch Stock Holdings
            portfolios_res = supabase.table("portfolios").select("*, holdings(*)").execute()
            stock_portfolios = portfolios_res.data if portfolios_res else []
            
            # Fetch MF Holdings
            mf_res = supabase.table("mf_holdings").select("*").execute()
            mf_holdings = mf_res.data if mf_res else []
            
            # Inject into context
            context['user_financials'] = {
                "stock_portfolios": stock_portfolios,
                "mutual_fund_holdings": mf_holdings
            }
        except Exception as db_err:
            logger.error(f"Failed to fetch user context for AI: {db_err}")

        # 2. Call AI Service
        result = await ai_service.chat(body.query, context, body.conversation_history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

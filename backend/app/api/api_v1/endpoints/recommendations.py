"""
General Recommendations Endpoint
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.services.recommendation.general_recommender import GeneralRecommender

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendationRequest(BaseModel):
    budget: float
    risk_profile: str  # Conservative, Moderate, Aggressive
    horizon: str  # Short-term, Medium-term, Long-term
    limit: Optional[int] = 15  # Increased from 5 - let users choose from more options


class StockRecommendation(BaseModel):
    symbol: str
    name: str
    current_price: float
    recommendation: str  # BUY, HOLD, SELL
    reasoning: str


@router.post("/general", response_model=List[StockRecommendation])
async def get_general_recommendations(request: RecommendationRequest):
    """
    Get general stock recommendations based on user preferences
    """
    try:
        recommender = GeneralRecommender()
        result = await recommender.get_recommendations(
            budget=request.budget,
            risk_profile=request.risk_profile,
            horizon=request.horizon,
            limit=request.limit
        )
        
        # Extract recommendations list and add current_price field
        recommendations = result.get("recommendations", [])
        
        # Ensure current_price field exists for frontend compatibility
        for rec in recommendations:
            if "current_price" not in rec and "price" in rec:
                rec["current_price"] = rec["price"]
        
        return recommendations
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

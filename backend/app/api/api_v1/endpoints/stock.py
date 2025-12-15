from fastapi import APIRouter, HTTPException
from app.services.consensus_engine import ConsensusEngine

# Instantiate engine (or reuse global if needed, but new instance is cheap)
engine = ConsensusEngine()

router = APIRouter()

@router.get("/{symbol}")
async def get_stock_consensus(symbol: str):
    try:
        # We can implement Redis caching here later
        result = await engine.get_consensus_price(symbol.upper())
        if result['status'] == 'ERROR':
             raise HTTPException(status_code=404, detail=result.get('message', 'Stock not found'))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

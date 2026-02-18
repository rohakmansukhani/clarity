from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class AlertCreate(BaseModel):
    ticker: str
    target_price: Optional[float] = None
    target_percent_change: Optional[float] = None
    initial_price: Optional[float] = None
    condition: str  # 'ABOVE', 'BELOW', 'GAIN_PCT', 'LOSS_PCT'

class AlertResponse(BaseModel):
    id: str
    ticker: str
    target_price: Optional[float]
    target_percent_change: Optional[float]
    condition: str
    is_active: bool
    created_at: str

# --- Endpoints ---

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """List all active alerts for the current user."""
    user_id = current_user.get("sub")
    
    # Supabase RLS handles user_id filtering mostly, but good to be explicit or just select
    res = supabase.table("alerts").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    
    return res.data

@router.post("/", response_model=AlertResponse)
def create_alert(
    alert: AlertCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Create a new price/percentage alert."""
    user_id = current_user.get("sub")

    # Validate condition
    if alert.condition not in ['ABOVE', 'BELOW', 'GAIN_PCT', 'LOSS_PCT']:
        raise HTTPException(status_code=400, detail="Invalid alert condition")

    data = {
        "user_id": user_id,
        "ticker": alert.ticker.upper(),
        "target_price": alert.target_price,
        "target_percent_change": alert.target_percent_change,
        "initial_price": alert.initial_price,
        "condition": alert.condition,
        "is_active": True
    }

    try:
        res = supabase.table("alerts").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create alert")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{alert_id}")
def delete_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Delete (deactivate) an alert."""
    try:
        # We perform a soft delete or hard delete? Let's hard delete for simplicity/cleanliness for now, 
        # or just delete the row if user wants it gone.
        res = supabase.table("alerts").delete().eq("id", alert_id).execute()
        return {"message": "Alert deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

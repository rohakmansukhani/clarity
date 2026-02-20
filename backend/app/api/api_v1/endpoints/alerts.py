from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import get_current_user, get_user_supabase
from app.services.email_service import EmailService
from app.services.market_service import MarketService, get_market_service
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


@router.post("/check")
async def check_and_trigger_alerts(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase),
    market_service: MarketService = Depends(get_market_service)
):
    """
    Evaluate all active alerts for the current user against live prices.
    Sends an email and deactivates the alert when a condition is triggered.
    """
    user_id = current_user.id
    # Get user email from Supabase auth
    user_email = current_user.email

    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found")

    # Fetch all active alerts for this user
    res = supabase.table("alerts").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    active_alerts = res.data or []

    triggered = []

    for alert in active_alerts:
        ticker = alert["ticker"]
        condition = alert["condition"]
        target_price = alert.get("target_price")
        target_pct = alert.get("target_percent_change")
        initial_price = alert.get("initial_price")

        try:
            # Fetch current price
            details = await market_service.get_stock_details(ticker)
            current_price = details.get("market_data", {}).get("current_price") if details else None
            if current_price is None:
                continue

            fired = False
            trigger_desc = ""

            if condition == "ABOVE" and target_price and current_price >= target_price:
                fired = True
                trigger_desc = f"{ticker} has crossed ABOVE ₹{target_price:.2f} (current: ₹{current_price:.2f})"
            elif condition == "BELOW" and target_price and current_price <= target_price:
                fired = True
                trigger_desc = f"{ticker} has dropped BELOW ₹{target_price:.2f} (current: ₹{current_price:.2f})"
            elif condition == "GAIN_PCT" and target_pct and initial_price:
                pct_gain = ((current_price - initial_price) / initial_price) * 100
                if pct_gain >= target_pct:
                    fired = True
                    trigger_desc = f"{ticker} gained +{pct_gain:.1f}% (target: +{target_pct}%)"
            elif condition == "LOSS_PCT" and target_pct and initial_price:
                pct_loss = ((initial_price - current_price) / initial_price) * 100
                if pct_loss >= target_pct:
                    fired = True
                    trigger_desc = f"{ticker} dropped -{pct_loss:.1f}% (target: -{target_pct}%)"

            if fired:
                # 1. Fetch comprehensive analysis for the triggered stock
                analysis_data = await market_service.get_comprehensive_analysis(ticker)
                
                # 2. Prepare context for EmailTemplateService
                context = {
                    "ticker": ticker,
                    "trigger_title": trigger_desc,
                    "current_price": f"{current_price:,.2f}",
                    "initial_price": f"{initial_price:,.2f}" if initial_price else "N/A",
                    "percent_change": f"{((current_price - initial_price) / initial_price * 100):+.1f}" if initial_price else "0.0",
                    "technical_analysis": analysis_data.get("analysis", {}).get("technical"),
                    "fundamental_analysis": analysis_data.get("analysis", {}).get("fundamental"),
                    "tech_signal": analysis_data.get("analysis", {}).get("technical", {}).get("signal", "NEUTRAL"),
                    "expert_notes": analysis_data.get("expert_insights", {}).get("valuation_context", ""),
                    "action_url": f"https://clarity-invest.vercel.app/market/{ticker}"
                }

                # 3. Render HTML using Template Service
                from app.services.email_template_service import EmailTemplateService
                html_body = EmailTemplateService.render_alert(context)

                # Send email notification
                subject = f"🔔 Clarity Alert: {ticker} Price Movement"
                await EmailService.send_email(user_email, subject, html_body, html=True)

                # Mark alert as triggered (deactivate)
                supabase.table("alerts").update({"is_active": False, "email_sent": True}).eq("id", alert["id"]).execute()
                triggered.append({"ticker": ticker, "condition": condition, "trigger_desc": trigger_desc})

        except Exception as e:
            logger.error(f"Error checking alert for {ticker}: {e}")
            continue

    return {"checked": len(active_alerts), "triggered": len(triggered), "details": triggered}

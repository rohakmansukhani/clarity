from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
from app.services.mutual_fund.mf_service import MutualFundService
from app.services.calculators.sip_calculator import SIPCalculator

router = APIRouter()
mf_service = MutualFundService()
sip_calc = SIPCalculator()

class SIPRequest(BaseModel):
    monthly_amount: float
    return_pct: float
    tenure_years: int

class LumpsumRequest(BaseModel):
    amount: float
    return_pct: float
    tenure_years: int

class MFHoldingCreate(BaseModel):
    scheme_code: str
    scheme_name: str
    units: float
    avg_nav: float

@router.get("/search")
async def search_mutual_funds(q: str):
    """Search for mutual funds by scheme name"""
    if not q or len(q) < 3:
        return []
    return await mf_service.search_funds(q)

@router.post("/calculator/sip")
async def calculate_sip(req: SIPRequest):
    """Calculate SIP returns"""
    return sip_calc.calculate_sip(req.monthly_amount, req.return_pct, req.tenure_years)

@router.post("/calculator/lumpsum")
async def calculate_lumpsum(req: LumpsumRequest):
    """Calculate lumpsum returns"""
    return sip_calc.calculate_lumpsum(req.amount, req.return_pct, req.tenure_years)

@router.get("/holdings")
async def get_holdings(
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Get user's mutual fund holdings"""
    try:
        res = supabase.table("mf_holdings").select("*").execute() # RLS applies user filtering
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/holdings")
async def add_holding(
    request: Request,
    holding: MFHoldingCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Add a new mutual fund holding or merge with existing"""
    try:
        existing_res = supabase.table("mf_holdings").select("*").eq("scheme_code", holding.scheme_code).execute()
        existing = existing_res.data

        if existing:
            primary_id = existing[0]['id']
            old_units = float(existing[0]['units'])
            old_avg_nav = float(existing[0]['avg_nav'] or 0)
            
            new_units = old_units + holding.units
            new_invested = (old_units * old_avg_nav) + (holding.units * holding.avg_nav)
            new_avg_nav = new_invested / new_units if new_units > 0 else 0
            
            res = supabase.table("mf_holdings").update({
                "units": new_units,
                "avg_nav": new_avg_nav
            }).eq("id", primary_id).execute()
            return res.data[0]
        else:
            data = {
                "user_id": user.id,
                "scheme_code": holding.scheme_code,
                "scheme_name": holding.scheme_name,
                "units": holding.units,
                "avg_nav": holding.avg_nav,
            }
            res = supabase.table("mf_holdings").insert(data).execute()
            return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/holdings/{holding_id}")
async def delete_holding(
    request: Request,
    holding_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Delete a mutual fund holding"""
    try:
        res = supabase.table("mf_holdings").delete().eq("id", holding_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Holding not found")
        return {"message": "Holding deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{scheme_code}")
async def get_mutual_fund_details(scheme_code: str):
    """Get scheme details and NAV history"""
    details = await mf_service.get_fund_details(scheme_code)
    if not details:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return details

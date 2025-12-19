from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from app.core.supabase_client import get_supabase
from supabase import Client
from app.core.rate_limit import limiter

router = APIRouter()

class UserAuth(BaseModel):
    email: str
    password: str
    full_name: str | None = None

@router.post("/register", summary="Register a new user via Supabase")
@limiter.limit("5/minute")
def register(request: Request, user: UserAuth, supabase: Client = Depends(get_supabase)):
    try:
        # Supabase Auth Sign Up
        response = supabase.auth.sign_up({
            "email": user.email, 
            "password": user.password,
            "options": {
                "data": {
                    "full_name": user.full_name,
                    "display_name": user.full_name # Some providers look for this
                }
            }
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
                "email": response.user.email,
                "user_metadata": response.user.user_metadata
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

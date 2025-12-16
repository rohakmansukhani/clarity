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
        return {
            "message": "User registered successfully", 
            "user": {"id": response.user.id, "email": response.user.email}
        }
    except Exception as e:
        # Supabase raises exceptions for existing user etc.
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", summary="Login user and return JWT")
def login(user: UserAuth, supabase: Client = Depends(get_supabase)):
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

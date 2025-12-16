from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase
import logging
from app.core.config import settings
from supabase import create_client

logger = logging.getLogger("auth_middleware")
security = HTTPBearer()


def get_user_supabase_client(
    authorization: str = Header(...)
) -> Client:
    """
    Creates a Supabase client with the user's JWT token.
    This ensures RLS policies work correctly.
    
    Extracts token from Authorization header directly.
    """
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "").strip()
        
        # Create a new Supabase client with the user's token
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY
        )
        
        # Set the auth token for this client
        client.auth.set_session(access_token=token, refresh_token="")
        
        return client
        
    except Exception as e:
        logger.error(f"Error creating user Supabase client: {e}")
        raise HTTPException(status_code=401, detail="Could not create authenticated client")


async def verify_jwt(
    creds: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    """
    Verifies the Supabase JWT token.
    Uses Supabase auth to verify the token.
    """
    token = creds.credentials
    try:
        # Verify token by fetching user from Supabase Auth
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return response.user
        
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")


# Dependency aliases
get_current_user = verify_jwt
get_user_supabase = get_user_supabase_client

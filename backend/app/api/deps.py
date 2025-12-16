from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase
import logging

# Setup Logging
logger = logging.getLogger("auth_middleware")

security = HTTPBearer()

import jwt
from app.core.config import settings
from supabase import create_client, Client

# Setup Logging
logger = logging.getLogger("auth_middleware")

security = HTTPBearer()

def get_user_supabase_client(
    creds: HTTPAuthorizationCredentials = Depends(security)
) -> Client:
    """
    Creates a Supabase client with the user's JWT token.
    This ensures RLS policies work correctly.
    """
    token = creds.credentials
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
        options={
            "headers": {
                "Authorization": f"Bearer {token}"
            }
        }
    )

async def verify_jwt(
    creds: HTTPAuthorizationCredentials = Depends(security),
    supabase_client: Client = Depends(get_user_supabase_client)
):
    """
    Verifies the Supabase JWT token.
    Uses the user-scoped client to Verify by fetching the user.
    """
    token = creds.credentials
    try:
        # Verify token by fetching user from Supabase Auth
        # Note: If we had the JWT_SECRET locally, we could decode it using python-jose for speed
        # But this ensures the token is valid on the server (revocations etc.)
        
        # Option 2: Use Supabase client properly
        response = supabase_client.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return response.user
        
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Dependency aliases
get_current_user = verify_jwt
get_user_supabase = get_user_supabase_client

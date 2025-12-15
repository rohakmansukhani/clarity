from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase
import logging

# Setup Logging
logger = logging.getLogger("auth_middleware")

security = HTTPBearer()

async def verify_jwt(
    creds: HTTPAuthorizationCredentials = Depends(security), 
    supabase: Client = Depends(get_supabase)
):
    """
    Verifies the Supabase JWT token.
    Returns the user object if valid.
    PROD: Supabase client 'get_user()' verifies the signature with the secret.
    """
    token = creds.credentials
    try:
        # Get User returns the user object if the token is valid
        # This calls the Supabase GoTrue API to verify
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Dependency alias
get_current_user = verify_jwt

from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase
import logging
import httpx
import time
from app.core.config import settings
from supabase import create_client
from types import SimpleNamespace
from jose import jwt, JWTError

logger = logging.getLogger("auth_middleware")
security = HTTPBearer()

class JWKSProvider:
    """Provides and caches JSON Web Key Sets from Supabase for asymmetric verification."""
    _keys = None
    _last_fetched = 0
    _ttl = 3600  # 1 hour cache

    @classmethod
    async def get_keys(cls):
        if not settings.jwks_url:
            return []
            
        if cls._keys is None or (time.time() - cls._last_fetched) > cls._ttl:
            try:
                # Use a short timeout for the JWKS fetch
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(settings.jwks_url)
                    response.raise_for_status()
                    cls._keys = response.json().get("keys", [])
                    cls._last_fetched = time.time()
                    logger.info("Successfully fetched and cached JWKS from Supabase")
            except Exception as e:
                logger.error(f"Failed to fetch JWKS from {settings.jwks_url}: {e}")
                # If we have old keys, keep using them instead of failing completely
                if cls._keys is None:
                    return []
        return cls._keys

    @classmethod
    async def get_key_for_jwt(cls, token: str):
        """Extracts kid from JWT and finds matching public key in JWKS."""
        try:
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            if not kid:
                return None
            
            keys = await cls.get_keys()
            for key in keys:
                if key.get("kid") == kid:
                    return key
        except Exception as e:
            logger.debug(f"Could not extract kid or find key: {e}")
        return None


def get_user_supabase_client(
    authorization: str = Header(...)
) -> Client:
    """
    Creates a Supabase client with the user's JWT token.
    This ensures RLS policies work correctly.
    """
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "").strip()
        
        # Use PUBLISHABLE_KEY if available for user-specific clients (best practice for RLS)
        # Fallback to SUPABASE_SECRET_KEY if not provided
        base_key = settings.SUPABASE_PUBLISHABLE_KEY or settings.SUPABASE_SECRET_KEY
        
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=base_key
        )
        
        # Set the auth token for this client to enable RLS
        client.auth.set_session(access_token=token, refresh_token="")
        
        return client
        
    except Exception as e:
        logger.error(f"Error creating user Supabase client: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# Removed as it's moved to the top

async def verify_jwt(
    creds: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    """
    Verifies the Supabase JWT token.
    Supports local verification (Signing Keys) for better performance.
    """
    token = creds.credentials
    
    # 1. Try Local Asymmetric Verification (JWKS / Signing Keys)
    # This is the modern Supabase standard.
    jwk_key = await JWKSProvider.get_key_for_jwt(token)
    if jwk_key:
        try:
            # jose can decode using the JWK directly
            payload = jwt.decode(
                token, 
                jwk_key, 
                algorithms=["RS256", "ES256"], # Support both common asymmetric algos
                audience="authenticated"
            )
            return SimpleNamespace(
                id=payload.get("sub"),
                email=payload.get("email"),
                user_metadata=payload.get("user_metadata", {})
            )
        except JWTError as e:
            logger.debug(f"JWKS verification failed: {e}. Falling back to API verification.")

    # 2. Fallback: Verify token by fetching user from Supabase Auth API
    try:
        response = supabase.auth.get_user(token)
        
        if not response.user:
            logger.warning("Supabase verification returned no user for token")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
            
        return response.user
        
    except Exception as e:
        logger.error(f"Supabase Auth Error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=401, detail=f"Credential validation failed: {str(e)}")

# Already imported above


# Dependency aliases
get_current_user = verify_jwt
get_user_supabase = get_user_supabase_client

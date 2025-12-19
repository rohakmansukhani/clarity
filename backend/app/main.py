from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.redis_client import RedisService
from app.services.consensus_engine import ConsensusEngine
from app.core.scheduler import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan Context Manager
    Handles startup and shutdown events for the application.
    1. Connects to Redis for caching on startup.
    2. Disconnects cleanly on shutdown.
    """
    # Startup
    await RedisService.connect()
    scheduler.start()
    yield
    # Shutdown
    await RedisService.disconnect()

from app.core.errors import add_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.logging_config import setup_logging

# Call before creating FastAPI app
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Attach Limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app", # Auto-allow all Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Global Exception Handlers (404, 500, etc.)
add_exception_handlers(app)

# Register Main API Router (v1)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Global consensus engine instance (can also be dependent)
# Force Reload
consensus_engine = ConsensusEngine()

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint to check service status."""
    return {"message": "Clarity Consensus Engine is running", "env": settings.PROJECT_NAME}

from app.core.redis_client import get_redis
from app.core.supabase_client import get_supabase

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint with dependency status."""
    health_status = {
        "status": "ok",
        "redis": "unknown",
        "supabase": "unknown"
    }
    
    # Check Redis
    try:
        redis = await get_redis()
        await redis.ping()
        health_status["redis"] = "connected"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Supabase
    try:
        supabase = get_supabase()
        # Simple query to test connection (uses service role, won't fail RLS)
        result = supabase.table("portfolios").select("id").limit(1).execute()
        health_status["supabase"] = "connected"
    except Exception as e:
        health_status["supabase"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check Clarity AI (Groq)
    try:
        from app.services.ai_service import AIService
        ai = AIService()
        if ai.client:
            health_status["clarity_ai"] = "connected"
        else:
            health_status["clarity_ai"] = "disconnected (missing key)"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["clarity_ai"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

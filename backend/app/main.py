from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.redis_client import RedisService
from app.services.consensus_engine import ConsensusEngine

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
    yield
    # Shutdown
    await RedisService.disconnect()

from app.core.errors import add_exception_handlers

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Add Global Exception Handlers (404, 500, etc.)
add_exception_handlers(app)

# Register Main API Router (v1)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Global consensus engine instance (can also be dependent)
consensus_engine = ConsensusEngine()

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint to check service status."""
    return {"message": "Clarity Consensus Engine is running", "env": settings.PROJECT_NAME}

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers."""
    return {"status": "ok"}

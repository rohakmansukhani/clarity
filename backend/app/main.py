from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.redis_client import RedisService
from app.services.consensus_engine import ConsensusEngine

@asynccontextmanager
async def lifespan(app: FastAPI):
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

add_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Global consensus engine instance (can also be dependent)
consensus_engine = ConsensusEngine()

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Clarity Consensus Engine is running", "env": settings.PROJECT_NAME}

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

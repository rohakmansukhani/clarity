```python
import redis.asyncio as redis
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class RedisService:
    _pool: Optional[redis.Redis] = None

    @classmethod
    async def connect(cls):
        """Initialize the Redis connection pool."""
        if cls._pool is None:
            try:
                cls._pool = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )

                # Test connection
                await cls._pool.ping()
                logger.info("✅ Redis connected successfully")

            except Exception as e:
                logger.error(f"❌ Redis connection failed: {e}")
                cls._pool = None
                raise

    @classmethod
    async def disconnect(cls):
        """Close the Redis connection properties."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    def get_redis(cls) -> redis.Redis:
        """Get the Redis client instance."""
        if cls._pool is None:
            # Check if we can lazy connect or if this should raise
             raise RuntimeError("Redis client is not initialized. Call RedisService.connect() first.")
        return cls._pool

# Accessible as a dependency
async def get_redis() -> redis.Redis:
    return RedisService.get_redis()

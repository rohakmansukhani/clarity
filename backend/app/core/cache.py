from functools import wraps
import json
import hashlib
from app.core.redis_client import get_redis
import logging
from typing import Optional
import inspect

logger = logging.getLogger("cache")


def cache(expire: int = 60, key_prefix: str = ""):
    """
    Async Cache Decorator using Redis.
    expire: TTL in seconds
    key_prefix: Optional prefix for the key
    Generates deterministic cache keys by serializing arguments to JSON.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Generate Cache Key (skip 'self' or 'cls')
                sig = inspect.signature(func)
                bound_args = sig.bind(*args, **kwargs)
                bound_args.apply_defaults()
                
                # Remove 'self' or 'cls' from arguments
                cache_args = {
                    k: v for k, v in bound_args.arguments.items()
                    if k not in ('self', 'cls')
                }
                
                # Serialize to JSON for consistent hashing
                arg_str = json.dumps(cache_args, sort_keys=True, default=str)
                hash_key = hashlib.md5(arg_str.encode()).hexdigest()
                
                # Format: prefix:func_name:hash
                # Example: consensus:get_consensus_price:a1b2c3d4
                cache_key = f"{key_prefix}:{func.__name__}:{hash_key}"
                
                redis = await get_redis()
                cached_data = await redis.get(cache_key)
                
                if cached_data:
                    logger.debug(f"Cache Hit: {cache_key}")
                    # Return deserialized data
                    return json.loads(cached_data)
                
                # Cache Miss
                logger.debug(f"Cache Miss: {cache_key}")
                result = await func(*args, **kwargs)
                
                if result:
                    # serialize result
                    await redis.set(cache_key, json.dumps(result, default=str), ex=expire)
                    
                return result
            except Exception as e:
                # Fail open (return result without caching if redis logic fails)
                logger.error(f"Cache Error: {e}")
                return await func(*args, **kwargs)
        return wrapper
    return decorator

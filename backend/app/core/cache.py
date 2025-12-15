from functools import wraps
import json
import hashlib
from app.core.redis_client import get_redis
import logging
from typing import Optional

logger = logging.getLogger("cache")

def cache(expire: int = 60, key_prefix: str = ""):
    """
    Async Cache Decorator using Redis.
    expire: TTL in seconds
    key_prefix: Optional prefix for the key
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Generate Cache Key
                # Simple arg serialization
                arg_str = str(args) + str(kwargs)
                hash_key = hashlib.md5(arg_str.encode()).hexdigest()
                # If function is a method (has self), we might want to skip 'self' in hash?
                # Actually str(args) includes self which is an object instance, leading to unique hash per instance?
                # Usually we want cache per arguments.
                
                # Robust key generation:
                # Identify if args[0] is 'self' or 'cls' and ignore it? 
                # For simplicity, we just hash everything. If singleton, self is constant.
                
                cache_key = f"{key_prefix}:{func.__name__}:{hash_key}"
                
                redis = await get_redis()
                cached_data = await redis.get(cache_key)
                
                if cached_data:
                    logger.debug(f"Cache Hit: {cache_key}")
                    return json.loads(cached_data)
                
                # Cache Miss
                result = await func(*args, **kwargs)
                
                if result:
                    await redis.set(cache_key, json.dumps(result), ex=expire)
                    
                return result
            except Exception as e:
                # Fail open (return result without caching if redis fails)
                logger.error(f"Cache Error: {e}")
                return await func(*args, **kwargs)
        return wrapper
    return decorator

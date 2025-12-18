"""
Market Hours Utility

Provides functions to check if Indian stock market (NSE/BSE) is currently open
and calculate appropriate cache expiry times based on market hours.

Market Hours (IST):
- Pre-market: 9:00 AM - 9:15 AM
- Regular: 9:15 AM - 3:30 PM
- Post-market: 3:30 PM - 4:00 PM
- Closed: Weekends and public holidays
"""

from datetime import datetime, time, timedelta
import pytz

IST = pytz.timezone('Asia/Kolkata')

# Market hours in IST
MARKET_OPEN = time(9, 15)  # 9:15 AM
MARKET_CLOSE = time(15, 30)  # 3:30 PM

def is_market_open() -> bool:
    """
    Check if the Indian stock market is currently open.
    
    Returns:
        bool: True if market is open, False otherwise
    """
    now = datetime.now(IST)
    
    # Check if weekend (Saturday = 5, Sunday = 6)
    if now.weekday() >= 5:
        return False
    
    # Check if within market hours
    current_time = now.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE

def get_smart_cache_expiry(base_expiry: int) -> int:
    """
    Calculate cache expiry based on market hours.
    
    During market hours: Use base_expiry (short cache)
    After market close: Cache until next market open
    
    Args:
        base_expiry: Base cache duration in seconds (used during market hours)
        
    Returns:
        int: Cache expiry in seconds
    """
    now = datetime.now(IST)
    
    # If market is open, use base expiry
    if is_market_open():
        return base_expiry
    
    # Market is closed - calculate time until next open
    next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    # If we're past market close today, next open is tomorrow
    if now.time() > MARKET_CLOSE:
        next_open += timedelta(days=1)
    
    # Skip weekends
    while next_open.weekday() >= 5:
        next_open += timedelta(days=1)
    
    # Calculate seconds until next open
    seconds_until_open = int((next_open - now).total_seconds())
    
    # Cap at 24 hours to avoid excessively long cache
    return min(seconds_until_open, 86400)

def get_next_market_open() -> datetime:
    """
    Get the datetime of the next market opening.
    
    Returns:
        datetime: Next market open time in IST
    """
    now = datetime.now(IST)
    next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    # If we're past market close today or it's already past open time, move to next day
    if now.time() >= MARKET_CLOSE or (now.time() >= MARKET_OPEN and now.time() < MARKET_CLOSE):
        next_open += timedelta(days=1)
    
    # Skip weekends
    while next_open.weekday() >= 5:
        next_open += timedelta(days=1)
    
    return next_open

import warnings
import logging
import sys
from app.core.config import settings

# Suppress all warnings (including pandas FutureWarnings)
warnings.filterwarnings("ignore")

def setup_logging():
    """Configure application logging."""
    
    # Log level from config
    log_level = getattr(logging, settings.LOG_LEVEL, logging.WARNING)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(levelname)s:%(name)s:%(message)s',
        handlers=[
            logging.StreamHandler()
        ],
        force=True # Ensure we overwrite any existing handlers (e.g. from Uvicorn)
    )
    
    # Disable verbose DEBUG logging from third-party libraries
    # These can be re-enabled by changing WARNING to DEBUG if needed for troubleshooting
    logging.getLogger('yfinance').setLevel(logging.WARNING)
    logging.getLogger('peewee').setLevel(logging.WARNING)
    logging.getLogger('groq').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING) # Disable access logs
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    
    # Silence noisy libraries
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("cache").setLevel(logging.INFO)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("tzlocal").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured - Level: {settings.LOG_LEVEL}")

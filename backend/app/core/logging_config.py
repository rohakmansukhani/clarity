import logging
import sys
from app.core.config import settings

def setup_logging():
    """Configure application logging."""
    
    # Log level from config
    log_level = getattr(logging, settings.LOG_LEVEL, logging.INFO)
    
    # Format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    # Silence noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured - Level: {settings.LOG_LEVEL}")

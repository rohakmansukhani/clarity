import os
from groq import Groq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class GroqClient:
    _instance = None
    
    @classmethod
    def get_client(cls):
        if cls._instance is None:
            api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
            if not api_key:
                logger.warning("GROQ_API_KEY not set. AI features will be disabled.")
                return None
            try:
                cls._instance = Groq(api_key=api_key)
                logger.info("✅ Groq Client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Groq Client: {e}")
                return None
        return cls._instance

def get_groq_client():
    return GroqClient.get_client()

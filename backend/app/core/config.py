import os
from pydantic_settings import BaseSettings

from dotenv import load_dotenv

# Load .env from backend directory explicitly if needed
# Try to find it relative to this file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Clarity Finance"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    
    # Other Services
    GROQ_API_KEY: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str | None = None # Kept for reference or explicit DB access if needed
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore" # Ignore extra fields in .env

settings = Settings()

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
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str | None = None
    LOG_LEVEL: str = "WARNING"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    # Other Services
    GROQ_API_KEY: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str | None = None # Kept for reference or explicit DB access if needed
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore" # Ignore extra fields in .env
    
    def validate_required(self):
        """Validate that required settings are present."""
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required but not set")
        if not self.SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is required but not set")
        if not self.REDIS_URL:
            raise ValueError("REDIS_URL is required but not set")

settings = Settings()
settings.validate_required()

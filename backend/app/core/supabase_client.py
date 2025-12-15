from supabase import create_client, Client
from app.core.config import settings

class SupabaseService:
    _instance: Client | None = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in config")
            
            cls._instance = create_client(
                settings.SUPABASE_URL, 
                settings.SUPABASE_KEY
            )
        return cls._instance

# Accessible as a dependency or direct import
def get_supabase() -> Client:
    return SupabaseService.get_client()

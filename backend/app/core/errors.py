from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger("api_errors")

def add_exception_handlers(app: FastAPI):
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Determine if we are in debug mode? (Maybe from details)
        # For now, print trace
        logger.error(f"Global Error: {exc}")
        traceback.print_exc()
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                    "details": str(exc) # Remove in production for security
                }
            }
        )

    # We can add more specific handlers here (e.g. validaton error)

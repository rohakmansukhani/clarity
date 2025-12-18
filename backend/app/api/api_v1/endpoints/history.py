from fastapi import APIRouter, HTTPException, Depends, Request, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.api.deps import get_current_user, get_user_supabase
from supabase import Client
import logging
from app.core.rate_limit import limiter
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Models ---
class ChatSession(BaseModel):
    id: str
    title: str = "New Chat"
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    role: str
    content: str

class SessionCreate(BaseModel):
    title: str = "New Chat"
    initial_messages: List[MessageCreate] = []

# --- Endpoints ---

@router.get("/sessions", response_model=List[Dict[str, Any]])
@limiter.limit("30/minute")
def list_chat_sessions(
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """List all chat sessions for the current user."""
    try:
        # Fetch sessions sorted by updated_at desc
        response = supabase.table("chat_sessions")\
            .select("*")\
            .eq("user_id", user.id)\
            .order("is_pinned", desc=True)\
            .order("updated_at", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        # Return empty list nicely if table doesn't exist yet to avoid crashing UI
        return []

@router.get("/sessions/{session_id}/messages")
@limiter.limit("50/minute")
def get_session_messages(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Get all messages for a specific session."""
    try:
        response = supabase.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=False)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return []

@router.post("/sessions")
@limiter.limit("10/minute")
def create_session(
    request: Request,
    session_data: SessionCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Create a new chat session."""
    try:
        # Create Session
        new_session = {
            "user_id": user.id,
            "title": session_data.title,
            # created_at, updated_at handled by Supabase defaults usually, 
            # but we can pass them if needed. Use defaults.
        }
        
        session_res = supabase.table("chat_sessions").insert(new_session).execute()
        
        if not session_res.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
            
        session_id = session_res.data[0]['id']
        
        # Insert Initial Messages if any
        if session_data.initial_messages:
            messages_to_insert = [
                {
                    "session_id": session_id,
                    "role": m.role,
                    "content": m.content,
                    "user_id": user.id # Optional, depending on schema
                } for m in session_data.initial_messages
            ]
            supabase.table("chat_messages").insert(messages_to_insert).execute()
            
        return session_res.data[0]
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/messages")
@limiter.limit("60/minute")
def add_message(
    session_id: str,
    request: Request,
    message: MessageCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Add a message to an existing session."""
    try:
        new_msg = {
            "session_id": session_id,
            "role": message.role,
            "content": message.content,
            "user_id": user.id
        }
        
        # Insert Message
        res = supabase.table("chat_messages").insert(new_msg).execute()
        
        # Update Session `updated_at`
        # Only update title if it's the first message (or title is default)
        update_data = {"updated_at": "now()"}
        
        # We can just check if we want to set a title? 
        # Actually simplest logic: If role is user and it's the *first* message? 
        # But here we don't know if it's first. 
        # Let's just NOT overwrite title to None.
        
        if message.role == 'user':
             # Optional: If title starts with "New Chat", update it?
             # For now, let's trusting client or avoiding overwrite.
             # The BUG was: "title": message.content... else None. 
             # If we pass None to update, does Supabase ignore or set Null? likely Set Null.
             pass

        # To fix the "Date instead of Title" issue, we likely just stop sending 'title' in update unless we mean it.
        # But we do want to set title on first message if currently "New Chat".
        # Let's simple remove title from this update for now, relying on create_session to set it, 
        # or a separate rename endpoint if needed.
        
        supabase.table("chat_sessions")\
            .update(update_data)\
            .eq("id", session_id)\
            .execute()
            
        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
@limiter.limit("20/minute")
def delete_session(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        # Cascade delete handled by DB usually, or RLS.
        res = supabase.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"message": "Session deleted"}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

class PinUpdate(BaseModel):
    is_pinned: bool

@router.patch("/sessions/{session_id}/pin")
@limiter.limit("20/minute")
def toggle_pin_session(
    session_id: str,
    request: Request,
    pin_data: PinUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    try:
        res = supabase.table("chat_sessions").update({"is_pinned": pin_data.is_pinned}).eq("id", session_id).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/title")
@limiter.limit("10/minute")
async def generate_session_title(
    session_id: str,
    request: Request,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_user_supabase)
):
    """Generates and updates a title for the session using AI."""
    try:
        # 1. Fetch messages
        res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).limit(6).execute()
        messages = res.data
        
        if not messages:
            return {"title": "New Chat"}
            
        # 2. Generate Title
        from app.services.ai_service import AIService
        ai_service = AIService()
        title = await ai_service.generate_title(messages)
        
        # 3. Update Session
        supabase.table("chat_sessions").update({"title": title}).eq("id", session_id).execute()
        
        return {"title": title}
    except Exception as e:
         logger.error(f"Error generating title: {e}")
         raise HTTPException(status_code=500, detail=str(e))

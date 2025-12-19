from app.core.groq_client import get_groq_client
from app.core.cache import cache
import logging
import json

# Import extracted configurations
from app.services.ai.prompts import (
    SYSTEM_PROMPT_NEWS_ANALYST,
    PROMPT_STOCK_SUMMARY_TEMPLATE,
    SYSTEM_PROMPT_TITLE_GEN,
    PROMPT_TITLE_GEN_TEMPLATE,
    SYSTEM_PROMPT_AUTH_HELP,
    DOMAIN_ADVISOR,
    DOMAIN_DISCOVERY_HUB,
    DOMAIN_FLOATING,
    SYSTEM_PROMPT_MAIN_TEMPLATE
)
from app.services.ai.tools_config import TOOLS_CONFIG

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = get_groq_client()
        self.model = "llama-3.3-70b-versatile"
        self.tools = TOOLS_CONFIG
    
    @cache(expire=86400, key_prefix="ai_summary")
    async def generate_stock_summary(self, symbol: str, data: dict) -> str:
        """
        Generates a 3-sentence executive summary with news analysis.
        Cached for 24 hours.
        """
        if not self.client:
            return "AI Service Unavailable (Missing Key)"
        
        # Extract news items for explicit inclusion
        news_items = data.get('news', [])
        news_summary = ""
        if news_items:
            news_titles = [item.get('title', '') for item in news_items[:3]]
            news_summary = f"\n\nRecent News Headlines:\n" + "\n".join(f"- {title}" for title in news_titles if title)
            
        prompt = PROMPT_STOCK_SUMMARY_TEMPLATE.format(
            symbol=symbol,
            price=data.get('market_data', {}).get('price_formatted', 'N/A'),
            change=data.get('market_data', {}).get('changePercent', 0),
            news_summary=news_summary
        )
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_NEWS_ANALYST},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.7,
                max_tokens=250,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq Gen Error: {e}")
            return "Could not generate summary."

    async def generate_title(self, messages: list) -> str:
        """
        Generates a short 3-5 word title for a chat session.
        """
        if not self.client or not messages:
            return "New Chat"

        # Create a condensed context from the first few messages
        conversation_text = "\\n".join([f"{m['role']}: {m['content']}" for m in messages[:4]])
        
        prompt = PROMPT_TITLE_GEN_TEMPLATE.format(conversation_text=conversation_text)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_TITLE_GEN},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile", # or a smaller model if available for speed
                temperature=0.7,
                max_tokens=20,
            )
            title = chat_completion.choices[0].message.content.strip().replace('"', '')
            return title
        except Exception as e:
            logger.error(f"Title Gen Error: {e}")
            return "New Chat"

    async def chat(self, user_query: str, context_data: dict = None, conversation_history: list = None) -> dict:
        """
        Agentic chat handler with comprehensive tools.
        Returns dict with 'response' and optional 'suggest_switch'
        """
        if not self.client:
            return {"response": "AI Service Unavailable.", "suggest_switch": None}

        from app.services.market_service import MarketService
        market_service = MarketService()

        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Check for Auth Context (Restricted Mode)
        if context_data and context_data.get('type') == 'auth_help':
            system_prompt = SYSTEM_PROMPT_AUTH_HELP
        else:
            # Determine mode based on context
            mode = context_data.get('type') if context_data else None
            
            if mode == 'advisor_chat':
                domain_restriction = DOMAIN_ADVISOR
            elif mode == 'discovery_hub':
                domain_restriction = DOMAIN_DISCOVERY_HUB
            elif mode == 'floating':
                domain_restriction = DOMAIN_FLOATING
            else:
                # Default mode - no domain restrictions
                domain_restriction = ""
            
            # Standard Market Analyst Mode
            system_prompt = SYSTEM_PROMPT_MAIN_TEMPLATE.format(
                domain_restriction=domain_restriction,
                current_date=current_date
            )
        
        context_json = json.dumps(context_data, default=str) if context_data else "No context"
        
        # Build messages with conversation history
        messages = [
            {"role": "system", "content": f"{system_prompt}\\n\\nContext: {context_json}"}
        ]
        
        # Add conversation history if provided (last 10 messages for context)
        if conversation_history:
            messages.extend(conversation_history[-10:])
        
        # Add current user query
        messages.append({"role": "user", "content": user_query})

        try:
            # First LLM Call
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                tools=self.tools,
                tool_choice="auto",
                max_tokens=1500
            )
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # Handle tool calls
            if tool_calls:
                messages.append(response_message)
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"AI Tool Call: {function_name}({function_args})")
                    
                    tool_output = None
                    
                    # Execute Tools
                    if function_name == "get_stock_details":
                        tool_output = await market_service.get_aggregated_details(function_args.get("symbol"))
                    elif function_name == "get_comprehensive_analysis":
                        tool_output = await market_service.get_comprehensive_analysis(function_args.get("symbol"))
                    elif function_name == "search_stocks":
                        tool_output = await market_service.search_stocks(function_args.get("query"))
                    elif function_name == "get_market_status":
                        tool_output = await market_service.get_market_status()
                    elif function_name == "get_sector_recommendations":
                        from app.services.recommendation.sector_recommender import SectorRecommender
                        sector_query = function_args.get("sector_query")
                        criteria = function_args.get("criteria", "balanced")
                        tool_output = await SectorRecommender().get_top_picks(sector_query, limit=5, criteria=criteria)
                    elif function_name == "compare_stocks":
                        from app.services.recommendation.comparison_engine import ComparisonEngine
                        tool_output = await ComparisonEngine().compare_stocks(function_args.get("symbols"))
                    elif function_name == "get_top_movers":
                        tool_output = await market_service.get_top_movers()
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(tool_output, default=str)
                    })
                
                # Second LLM Call with tool results
                final_response = self.client.chat.completions.create(
                    messages=messages,
                    model=self.model,
                    max_tokens=1500
                )
                
                response_text = final_response.choices[0].message.content.strip()
                
                # Detect switch suggestions
                suggest_switch = None
                if "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                    suggest_switch = {
                        "to": "discovery_hub",
                        "reason": "sector_research"
                    }
                    response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
                elif "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                    suggest_switch = {
                        "to": "advisor",
                        "reason": "stock_analysis"
                    }
                    response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
                
                return {
                    "response": response_text,
                    "suggest_switch": suggest_switch
                }
            
            # No tool calls - direct response
            response_text = response_message.content.strip()
            
            # Detect switch suggestions
            suggest_switch = None
            if "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                suggest_switch = {
                    "to": "discovery_hub",
                    "reason": "sector_research"
                }
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
            elif "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                suggest_switch = {
                    "to": "advisor",
                    "reason": "stock_analysis"
                }
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
            
            return {
                "response": response_text,
                "suggest_switch": suggest_switch
            }
            
        except Exception as e:
            logger.error(f"Groq Agent Error: {e}")
            return {
                "response": f"I encountered an error: {str(e)}",
                "suggest_switch": None
            }
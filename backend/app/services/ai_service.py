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
            # Check for Groq Tool Use Failed Error (Hallucinated XML format)
            # Error format: 400 - {'error': {'code': 'tool_use_failed', 'failed_generation': '<function=...>'}}
            error_str = str(e)
            if "tool_use_failed" in error_str and "failed_generation" in error_str:
                logger.warning(f"Intercepted Tool Use Failure: {e}")
                
                # Attempt to extract the raw generation safely
                raw_gen = None
                
                # 1. Try accessing the structure directly (Best method)
                if hasattr(e, 'body') and isinstance(e.body, dict):
                    # structure: {'error': {'failed_generation': '...'}}
                    raw_gen = e.body.get('error', {}).get('failed_generation')
                elif hasattr(e, 'response') and hasattr(e.response, 'json'):
                    try:
                        err_json = e.response.json()
                        raw_gen = err_json.get('error', {}).get('failed_generation')
                    except:
                        pass
                
                # 2. Key-based extraction if body access failed
                if not raw_gen:
                    import re
                    # Improved regex to handle escaped quotes: 'failed_generation': '...content...'
                    # Matches content until a non-escaped quote
                    match = re.search(r"'failed_generation':\s*'((?:[^'\\]|\\.)*)'", error_str)
                    if not match:
                        match = re.search(r'"failed_generation":\s*"((?:[^"\\]|\\.)*)"', error_str)
                    
                    if match:
                        raw_gen = match.group(1)
                
                if raw_gen:
                        # Remove newlines for easier regex in the function matcher
                        # formatting cleaned_gen for processing
                        cleaned_gen = raw_gen.replace("\\n", " ").replace("\n", " ")
                        
                        # Regex to parse <function=NAME{ARGS}></function>
                        # We extract the name first, then find the JSON block {}
                        name_match = re.search(r"<function=(\w+)", cleaned_gen)
                        
                        if name_match:
                            func_name = name_match.group(1)
                            
                            # Find the JSON part: Look for the first '{' AFTER the function name
                            start_idx = cleaned_gen.find('{', name_match.end())
                            end_idx = cleaned_gen.rfind('}')
                            
                            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                                args_str = cleaned_gen[start_idx:end_idx+1]
                                
                                # Try to fix truncated JSON if necessary, though usually it's complete enough
                                try:
                                    func_args = json.loads(args_str)
                                    logger.info(f"Analyzed Hallucinated Tool Call: {func_name}({func_args})")
                                    
                                    # MANUALLY EXECUTE TOOL
                                    tool_output = None
                                    if func_name == "get_stock_details":
                                        tool_output = await market_service.get_aggregated_details(func_args.get("symbol"))
                                    elif func_name == "get_comprehensive_analysis":
                                        tool_output = await market_service.get_comprehensive_analysis(func_args.get("symbol"))
                                    elif func_name == "search_stocks":
                                        tool_output = await market_service.search_stocks(func_args.get("query"))
                                    elif func_name == "get_market_status":
                                        tool_output = await market_service.get_market_status()
                                    elif func_name == "get_sector_recommendations":
                                        from app.services.recommendation.sector_recommender import SectorRecommender
                                        sector_query = func_args.get("sector_query")
                                        criteria = func_args.get("criteria", "balanced")
                                        tool_output = await SectorRecommender().get_top_picks(sector_query, limit=5, criteria=criteria)
                                    elif func_name == "compare_stocks":
                                        from app.services.recommendation.comparison_engine import ComparisonEngine
                                        tool_output = await ComparisonEngine().compare_stocks(func_args.get("symbols"))
                                    elif func_name == "get_top_movers":
                                        tool_output = await market_service.get_top_movers()
                                    
                                    # Add the tool output to messages and get final response
                                    # We treat it as if the model had correctly called it
                                    # But since we can't "insert" a fake tool call into the history easily without ID,
                                    # we just send the output as a system context update or new user message context?
                                    # Better: just ask LLM to synthesize response from this data
                                    
                                    # Construct synthetic prompt for final answer
                                    context_prompt = f"The user asked: '{user_query}'.\nHere is the data from the tool '{func_name}':\n{json.dumps(tool_output, default=str)}\n\nProvide the final answer to the user based on this."
                                    
                                    final_completion = self.client.chat.completions.create(
                                        messages=[
                                            {"role": "system", "content": system_prompt},
                                            {"role": "user", "content": context_prompt}
                                        ],
                                        model=self.model,
                                        max_tokens=1500
                                    )
                                    
                                    response_text = final_completion.choices[0].message.content.strip()

                                    # Detect switch suggestions (COPY OF MAIN LOGIC + Phrase Detection)
                                    suggest_switch = None
                                    
                                    # 1. Discovery Hub Switch
                                    if "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                                        suggest_switch = {"to": "discovery_hub", "reason": "sector_research"}
                                        response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
                                    elif "try the **Discovery Hub**" in response_text or "try the Discovery Hub" in response_text:
                                        # Fallback phrase detection
                                        suggest_switch = {"to": "discovery_hub", "reason": "sector_research"}
                                    
                                    # 2. Advisor Switch
                                    elif "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                                        suggest_switch = {"to": "advisor", "reason": "stock_analysis"}
                                        response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
                                    elif "try the **Clarity Advisor**" in response_text or "try the Clarity Advisor" in response_text:
                                        # Fallback phrase detection
                                        suggest_switch = {"to": "advisor", "reason": "stock_analysis"}
                                    
                                    return {
                                        "response": response_text,
                                        "suggest_switch": suggest_switch
                                    }
                                    
                                except json.JSONDecodeError:
                                    logger.error(f"Failed to parse args from hallucination: {args_str}")
                            else:
                                logger.warning(f"Could not find JSON args in: {raw_gen}")


            logger.error(f"Groq Agent Error: {e}")
            return {
                "response": "I encountered a technical error connecting to the AI service. Please try again.",
                "suggest_switch": None
            }
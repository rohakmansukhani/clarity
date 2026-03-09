from app.core.groq_client import get_groq_client
from app.core.cache import cache
import logging
import json
import re

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

        from app.services.mutual_fund.mf_service import MutualFundService
        mf_service = MutualFundService()
        
        from app.services.calculators.sip_calculator import SIPCalculator
        sip_calc = SIPCalculator()

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
                        tool_output = await market_service.search_stocks(
                            function_args.get("query"),
                            function_args.get("exchange_filter")
                        )
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
                    elif function_name == "get_all_etfs":
                        etfs = await market_service.get_all_etfs()
                        # Apply filters if provided
                        if function_args.get("underlying"):
                            underlying_lower = function_args["underlying"].lower()
                            etfs = [etf for etf in etfs if underlying_lower in etf.get('underlying', '').lower()]
                        # Apply sorting if provided
                        sort_by = function_args.get("sort_by", "symbol")
                        if sort_by in ['symbol', 'nav', 'ltP', 'pChange', 'perChange30d', 'perChange365d']:
                            reverse = sort_by != 'symbol'
                            etfs.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
                        tool_output = etfs
                    elif function_name == "get_etf_details":
                        symbol = function_args.get("symbol")
                        # Get comprehensive analysis
                        analysis = await market_service.get_comprehensive_analysis(symbol)
                        # Get ETF-specific metrics
                        all_etfs = await market_service.get_all_etfs()
                        etf_data = next((e for e in all_etfs if e['symbol'].upper() == symbol.upper()), None)
                        if etf_data:
                            analysis['etf_metrics'] = etf_data
                            analysis['type'] = 'ETF'
                        tool_output = analysis
                    elif function_name == "compare_etfs":
                        symbols = function_args.get("symbols", [])
                        all_etfs = await market_service.get_all_etfs()
                        results = []
                        for sym in symbols[:5]:  # Max 5
                            etf = next((e for e in all_etfs if e['symbol'].upper() == sym.upper()), None)
                            if etf:
                                results.append(etf)
                        tool_output = results
                    elif function_name == "search_mutual_funds":
                        tool_output = await mf_service.search_funds(function_args.get("query"))
                    elif function_name == "get_mf_details":
                        tool_output = await mf_service.get_fund_details(function_args.get("scheme_code"))
                    elif function_name == "get_mf_nav_history":
                        details = await mf_service.get_fund_details(function_args.get("scheme_code"))
                        tool_output = {"history": details.get("data", [])} if details else {}
                    elif function_name == "calculate_sip_returns":
                        if function_args.get("type") == "sip":
                            tool_output = sip_calc.calculate_sip(
                                function_args.get("amount", 0),
                                function_args.get("return_pct", 0),
                                function_args.get("tenure_years", 0)
                            )
                        else:
                            tool_output = sip_calc.calculate_lumpsum(
                                function_args.get("amount", 0),
                                function_args.get("return_pct", 0),
                                function_args.get("tenure_years", 0)
                            )
                    elif function_name == "compare_mutual_funds":
                        codes = function_args.get("scheme_codes", [])
                        results = []
                        for code in codes[:5]:
                            details = await mf_service.get_fund_details(code)
                            if details:
                                results.append({
                                    "scheme_code": code, 
                                    "details": details.get("meta", {}),
                                    "latest_nav": details.get("data", [{"nav": "N/A"}])[0].get("nav")
                                })
                        tool_output = results

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
            else:
                # Direct response without tools
                response_text = response_message.content.strip() if response_message.content else ""
                
            # Parse suggest_switch if outputted by the LLM
            suggest_switch = None
            if "__SUGGEST_SWITCH_TO_ADVISOR__" in response_text:
                suggest_switch = "advisor"
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_ADVISOR__", "").strip()
            elif "__SUGGEST_SWITCH_TO_DISCOVERY_HUB__" in response_text:
                suggest_switch = "discovery_hub"
                response_text = response_text.replace("__SUGGEST_SWITCH_TO_DISCOVERY_HUB__", "").strip()
                
            return {
                "response": response_text,
                "suggest_switch": suggest_switch
            }
                                    
        except Exception as e:
            error_str = str(e)
            logger.error(f"Groq Agent Error: {error_str}")
            
            # Fallback parser for Groq's 400 'tool_use_failed' when Llama 3 hallucinates XML tags
            if "tool_use_failed" in error_str and "failed_generation" in error_str:
                import re
                try:
                    # Extract the raw string inside failed_generation (single or double quoted)
                    match = re.search(r"'failed_generation':\s*['\"](.*?)['\"]\s*\}", error_str, re.DOTALL)
                    if match:
                        # Decode escaped newlines like \n
                        failed_gen = match.group(1).encode('utf-8').decode('unicode_escape')
                        # Remove <function... tags aggressively
                        clean_text = re.sub(r'<function.*?(?:</function>|>)', '', failed_gen, flags=re.DOTALL | re.IGNORECASE).strip()
                        
                        if clean_text:
                            return {
                                "response": clean_text + "\n\n*(Note: I encountered a strict formatting issue while fetching live data. Please try your request again—I should get it right on the next try!)*",
                                "suggest_switch": None
                            }
                except Exception as parse_e:
                    logger.error(f"Failed to parse tool_use_failed fallback: {parse_e}")
                    
            return {
                "response": "I encountered a technical error connecting to the AI service. Please try again.",
                "suggest_switch": None
            }
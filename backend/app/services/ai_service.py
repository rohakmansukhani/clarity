from app.core.groq_client import get_groq_client
from app.core.cache import cache
import logging
import json

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = get_groq_client()
        self.model = "llama-3.3-70b-versatile"
    
    @cache(expire=86400, key_prefix="ai_summary")
    async def generate_stock_summary(self, symbol: str, data: dict) -> str:
        """
        Generates a 3-sentence executive summary.
        Cached for 24 hours.
        """
        if not self.client:
            return "AI Service Unavailable (Missing Key)"
            
        prompt = f"""
        You are a financial analyst. Analyze this data for {symbol} and provide 3 concise sentences.
        Focus on: price action, fundamental strength, news sentiment, and investment outlook.
        Be direct - no preambles like "based on the data" or "the analysis shows".
        
        Data: {json.dumps(data, default=str)}
        """
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful expert financial analyst for Indian markets."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.7,
                max_tokens=200,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq Gen Error: {e}")
            return "Could not generate summary."

    async def chat(self, user_query: str, context_data: dict = None) -> str:
        """
        Agentic chat handler with comprehensive tools.
        """
        if not self.client:
            return "AI Service Unavailable."

        from app.services.market_service import MarketService
        market_service = MarketService()

        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        system_prompt = f"""
        You are 'Clarity AI', an advanced Indian stock market analyst and research assistant.
        
        Core Capabilities:
        1. Fetch REAL-TIME stock data (prices, fundamentals, news)
        2. Calculate QUANTITATIVE scores (stability, timing, risk)
        3. Analyze sectors and recommend top stocks
        4. Compare multiple stocks with data-driven metrics
        
        Critical Rules:
        - NEVER invent numbers, prices, or scores
        - ALL recommendations must be backed by tool-provided data
        - Use ₹ INR for all currency values
        - Format large numbers in Lakhs/Crores
        - When asked for recommendations, ALWAYS call get_comprehensive_analysis tool
        - Present data clearly with scores, metrics, and reasoning
        - Be direct and actionable - avoid preambles
        
        Today's date: {current_date}
        Market: NSE/BSE (Indian Stock Exchange)
        """
        
        context_json = json.dumps(context_data, default=str) if context_data else "No context"
        messages = [
            {"role": "system", "content": f"{system_prompt}\n\nContext: {context_json}"},
            {"role": "user", "content": user_query}
        ]

        # Enhanced Tools
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_stock_details",
                    "description": "Get basic stock info (price, fundamentals, news)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symbol": {"type": "string"}
                        },
                        "required": ["symbol"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_comprehensive_analysis",
                    "description": "Get FULL analysis with scores, recommendation, technical/fundamental analysis. Use this for buy/sell decisions.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symbol": {"type": "string"}
                        },
                        "required": ["symbol"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_stocks",
                    "description": "Search for stock symbols by company name",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_market_status",
                    "description": "Get current market indices (Nifty, Sensex)",
                    "parameters": {"type": "object", "properties": {}}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_sector_recommendations",
                    "description": "Get top stock picks for ANY sector with research-backed analysis. Works with sector names (AUTO, IT) or keywords (aluminum, pharma, electric vehicles).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sector_query": {
                                "type": "string",
                                "description": "Sector name or keyword (e.g., 'AUTO', 'aluminum', 'pharma', 'electric vehicles')"
                            },
                            "criteria": {
                                "type": "string",
                                "enum": ["balanced", "stability", "growth", "value"],
                                "default": "balanced",
                                "description": "Ranking criteria: balanced (default), stability (low risk), growth (high potential), value (undervalued)"
                            }
                        },
                        "required": ["sector_query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "compare_stocks",
                    "description": "Compare multiple stocks side-by-side",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symbols": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["symbols"]
                    }
                }
            }
        ]

        try:
            # First LLM Call
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                tools=tools,
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
                
                return final_response.choices[0].message.content.strip()
            
            return response_message.content.strip()
            
        except Exception as e:
            logger.error(f"Groq Agent Error: {e}")
            return f"I encountered an error: {str(e)}"

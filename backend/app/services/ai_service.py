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

    async def generate_title(self, messages: list) -> str:
        """
        Generates a short 3-5 word title for a chat session.
        """
        if not self.client or not messages:
            return "New Chat"

        # Create a condensed context from the first few messages
        conversation_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages[:4]])
        
        prompt = f"""
        Summarize this conversation into a short, descriptive title (maximum 5 words).
        Examples: "Reliance Stock Analysis", "Nifty 50 Trends", "Portfolio Rebalancing".
        No quotes, no "Title:", just the text.
        
        Conversation:
        {conversation_text}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
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
        
        # Check for Auth Context (Restricted Mode)
        if context_data and context_data.get('type') == 'auth_help':
            system_prompt = """
            You are a helpful Login Support Assistant for Clarity Financial.
            
            Your ONLY role is to help users with:
            - Logging in (email/password)
            - Signing up (creating an account)
            - Password resets
            - Basic account troubleshooting
            
            CRITICAL RULE:
            If the user asks about ANYTHING else (stocks, markets, analysis, advice, "hi", "hello"), 
            you MUST respond with EXACTLY:
            "Please login or sign up to use Clarity."
            
            Do not provide market data or financial advice in this mode.
            """
        else:
            # Standard Market Analyst Mode
            system_prompt = f"""
            You are 'Clarity AI', an advanced Indian stock market analyst and research assistant.
            
            Core Capabilities:
            1. Fetch REAL-TIME stock data (prices, fundamentals, news)
            2. Calculate QUANTITATIVE scores (stability, timing, risk)
            3. Analyze sectors and recommend top stocks
            4. Compare multiple stocks with data-driven metrics
            
            **DOMAIN RESTRICTION (CRITICAL):**
            - You are a **FINANCE-ONLY** assistant.
            - If the user asks about anything NOT related to finance, stocks, economics, investing, or money management (e.g., "What is CRUD?", "Write a poem", "Python code", "General knowledge"), you MUST refuse.
            - Refusal message: "I am a dedicated financial advisor. I can only assist with market data, stock analysis, and investment inquiries."
            - exception: You may answer greetings ("Hi", "Hello") with a financial context ("Hello! Ready to analyze the markets?").

            Presentational Rules (CRITICAL for UI/UX):
            - **Structure**: Use Markdown Headers (##) for main sections.
            - **Conciseness**: Use bullet points for lists and features. Avoid walls of text.
            - **Data**: Present key numbers (Price, Change, P/E) in a clear way, bolding the values (e.g., **₹2,400**).
            - **Tone**: Professional, insightful, yet easy to read.
            
            Critical Rules:
            - NEVER invent numbers, prices, or scores
            - ALL recommendations must be backed by tool-provided data
            - Use ₹ INR for all currency values
            - Format large numbers in Lakhs/Crores
            - When asked for recommendations, ALWAYS call get_comprehensive_analysis tool
            - Be direct and actionable - avoid preambles
            
            TOOL USE INSTRUCTIONS:
            - You have access to tools. Use them whenever you need real data.
            - DO NOT write custom XML like <function=...> or similar. 
            - Simply call the function using the standard tool calling mechanism provided to you.
            
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

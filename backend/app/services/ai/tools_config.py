TOOLS_CONFIG = [
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
            "description": "Search for stocks by company name",
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

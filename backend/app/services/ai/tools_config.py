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
            "description": "Search for stocks or ETFs by company or symbol name. Optionally filter by exchange.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "exchange_filter": {
                        "type": "string",
                        "enum": ["NSE", "BSE", "ALL"],
                        "description": "Optional exchange to filter results"
                    }
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
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_movers",
            "description": "Get top gaining and losing stocks in the market (Nifty 50). Use this when user asks for 'market movers', 'top gainers', or 'top losers'.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_all_etfs",
            "description": "Get list of all ETFs available in the Indian market (NSE). Supports filtering by underlying asset and sorting by performance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "underlying": {
                        "type": "string",
                        "description": "Filter by underlying asset (e.g., 'GOLD', 'NIFTY', 'BANK')"
                    },
                    "sort_by": {
                        "type": "string",
                        "enum": ["symbol", "nav", "pChange", "perChange30d", "perChange365d"],
                        "description": "Sort by field (default: symbol)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_etf_details",
            "description": "Get detailed analysis for a specific ETF including NAV, premium/discount to NAV, performance metrics, and comprehensive analysis.",
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
            "name": "compare_etfs",
            "description": "Compare multiple ETFs side-by-side with NAV, premium/discount, and performance metrics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of ETF symbols to compare (max 5)"
                    }
                },
                "required": ["symbols"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_mutual_funds",
            "description": "Search for mutual funds by scheme name or AMC (e.g., 'HDFC', 'Parag Parikh').",
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
            "name": "get_mf_details",
            "description": "Get scheme details and the latest NAV for a mutual fund.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scheme_code": {"type": "string"}
                },
                "required": ["scheme_code"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_mf_nav_history",
            "description": "Get historical NAV data for a mutual fund to analyze performance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scheme_code": {"type": "string"}
                },
                "required": ["scheme_code"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_sip_returns",
            "description": "Calculate Wealth Gain and Maturity Value for a Systematic Investment Plan (SIP) or Lumpsum investment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["sip", "lumpsum"],
                        "description": "Type of investment"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Monthly amount for SIP, or total amount for lumpsum"
                    },
                    "return_pct": {
                        "type": "number",
                        "description": "Expected annual return percentage (e.g., 12 for 12%)"
                    },
                    "tenure_years": {
                        "type": "integer",
                        "description": "Investment period in years"
                    }
                },
                "required": ["type", "amount", "return_pct", "tenure_years"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_mutual_funds",
            "description": "Compare multiple mutual funds side-by-side using their respective scheme codes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scheme_codes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of mutual fund scheme codes to compare"
                    }
                },
                "required": ["scheme_codes"]
            }
        }
    }
]

from typing import Dict, Any, List, Optional, Union
import math
import logging
from datetime import datetime, timedelta
import yfinance as yf

logger = logging.getLogger(__name__)

# --- Constants & Mappings ---

COMMODITY_MAP = {
    # Precious Metals
    "GOLD": "GC=F",      # Gold Futures
    "SILVER": "SI=F",    # Silver Futures
    "PLATINUM": "PL=F",  # Platinum Futures
    "PALLADIUM": "PA=F", # Palladium Futures
    
    # Base Metals
    "COPPER": "HG=F",    # Copper Futures
    "ALUMINUM": "ALI=F", # Aluminum Futures
    "ALUMINIUM": "ALI=F",
    "ZINC": "ZNC=F",     # Zinc Futures
    "NICKEL": "NKL=F",   # Nickel Futures
    
    # Energy
    "CRUDE": "CL=F",     # Crude Oil Futures (WTI)
    "CRUDEOIL": "CL=F",
    "BRENT": "BZ=F",     # Brent Crude Oil
    "NATURALGAS": "NG=F",# Natural Gas Futures
    "HEATING": "HO=F",   # Heating Oil
    
    # Agriculture
    "WHEAT": "ZW=F",     # Wheat Futures
    "CORN": "ZC=F",      # Corn Futures
    "SOYBEAN": "ZS=F",   # Soybean Futures
    "COTTON": "CT=F",    # Cotton Futures
    "SUGAR": "SB=F",     # Sugar Futures
    "COFFEE": "KC=F",    # Coffee Futures
    
    # Indian ETFs (NSE)
    "GOLDBEES": "GOLDBEES.NS",    # Gold ETF
    "NIFTYBEES": "NIFTYBEES.NS",  # Nifty 50 ETF
    "JUNIORBEES": "JUNIORBEES.NS",# Nifty Next 50 ETF
    "BANKBEES": "BANKBEES.NS",    # Bank Nifty ETF
    "ITBEES": "ITBEES.NS",        # IT Sector ETF
    
    # International Indices (for reference)
    "SPY": "SPY",        # S&P 500 ETF
    "QQQ": "QQQ",        # NASDAQ 100 ETF
    "DIA": "DIA"         # Dow Jones ETF
}

# General Symbol Mapping (Nickname -> Official NSE Symbol)
SYMBOL_MAP = {
    "MAHINDRA": "M&M",
    "RELIANCE": "RELIANCE",
    "TCS": "TCS",
    "INFOSYS": "INFY",
    "WIPRO": "WIPRO",
    "RIL": "RELIANCE",
    "INFY": "INFY",
    "HDFCBANK": "HDFCBANK",
    "SBIN": "SBIN",
    "ICICIBANK": "ICICIBANK",
    "BHARTIARTL": "BHARTIARTL",
    "ITC": "ITC",
    "BAJFINANCE": "BAJFINANCE",
    "KOTAKBANK": "KOTAKBANK"
}

# Fuzzy Search Nicknames
NICKNAME_MAP = {
    "MAHINDRA": "M&M",
    "M&M": "M&M",
    "RELIANCE": "RELIANCE",
    "RIL": "RELIANCE",
    "TCS": "TCS",
    "INFY": "INFY",
    "INFOSYS": "INFY",
    "HDFC": "HDFCBANK",
    "SBI": "SBIN",
    "AIRTEL": "BHARTIARTL",
    "BAJFINANCE": "BAJFINANCE",
    "BAJAJ FINANCE": "BAJFINANCE",
    "KOTAK": "KOTAKBANK",
    "L&T": "LT",
    "LARSEN": "LT",
    "MARUTI": "MARUTI",
    "SUZUKI": "MARUTI",
    "TITAN": "TITAN",
    "SUN PHARMA": "SUNPHARMA",
    "ULTRATECH": "ULTRACEMCO",
    # Reliance variations
    "RELIANCE INDUSTRIES": "RELIANCE",
    "RELIANCE INDUSTRIES LTD": "RELIANCE",
    "RELIANCE IND": "RELIANCE",
    # Tata Motors demerger (Dec 2024)
    "TATA MOTORS": "TMPV",  # Default to Passenger Vehicles
    "TATAMOTORS": "TMPV",
    "TATA MOTORS PASSENGER": "TMPV",
    "TATA MOTORS COMMERCIAL": "TATAMOTORCV"
}

# --- Helper Functions ---

def sanitize_numeric(value: Any) -> Any:
    """Replace NaN and Inf with None for JSON compatibility."""
    if value is None:
        return None
    try:
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    except (TypeError, ValueError):
        return value

def sanitize_dict(data: Any) -> Any:
    """Recursively sanitize all numeric values in a dict."""
    if isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    else:
        return sanitize_numeric(data)

# --- Calculation Logic ---

def calculate_pnl(
    initial_price: float,
    current_price: float,
    investment_amount: Optional[float] = None,
    shares: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate PnL based on initial and current price.
    Returns dictionary with shares, invested_value, current_value, pnl, pnl_percent.
    """
    if shares is None and investment_amount is None:
        raise ValueError("Either shares or investment_amount must be provided")

    if investment_amount is not None:
        invested_value = float(investment_amount)
        shares = invested_value / initial_price if initial_price > 0 else 0
    else:
        shares = float(shares)
        invested_value = shares * initial_price

    current_value = current_price * shares
    pnl = current_value - invested_value
    pnl_percent = (pnl / invested_value) * 100 if invested_value > 0 else 0

    return {
        "shares": shares,
        "invested_value": invested_value,
        "current_value": current_value,
        "pnl": pnl,
        "pnl_percent": pnl_percent
    }

def get_backtest_graph_data(ticker: str, start_date: str, end_date: Optional[str], shares: float) -> List[Dict[str, Any]]:
    """
    Fetch historical data and calculate value over time for the graph.
    """
    try:
        # Ticker format
        clean_ticker = ticker
        if not ticker.endswith(".NS") and not ticker.endswith("=F"): 
             # Use general heuristic if not provided 
             # (In simplified case, we assume NS if not containing dot, similar to existing implementation)
             if "." not in ticker: 
                clean_ticker = f"{ticker}.NS"
        
        ticker_obj = yf.Ticker(clean_ticker)
        
        # Parse Dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now()
        except ValueError:
            # Handle possible datetime objects passed directly
             start = start_date if isinstance(start_date, datetime) else datetime.now()
             end = end_date if isinstance(end_date, datetime) else datetime.now()

        days_diff = (end - start).days
        
        # Adaptive interval
        if days_diff <= 7:
            interval = "1d"
        elif days_diff <= 90:
            interval = "1d"
        elif days_diff <= 365:
            interval = "1wk"
        else:
            interval = "1mo"
            
        history_df = ticker_obj.history(start=start_date, end=end_date, interval=interval)
        
        graph_data = []
        if not history_df.empty:
            for index, row in history_df.iterrows():
                # Format date
                if interval == "1d":
                    d_str = index.strftime("%d %b")
                elif interval == "1wk":
                    d_str = index.strftime("%d %b")
                else:
                    d_str = index.strftime("%b %Y")
                
                close_p = row['Close']
                val = close_p * shares
                graph_data.append({"date": d_str, "value": round(val, 2)})
                
        return graph_data
    except Exception as e:
        logger.error(f"Graph data fetch error: {e}")
        return []

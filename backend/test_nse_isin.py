import nselib
from nselib import capital_market
import pandas as pd
import json

try:
    print("Checking NSE ISIN methods...")
    # There could be an equity list or bhavcopy containing ISINs
    df = capital_market.equity_list()
    print("Equity list columns:", df.columns.tolist())
    if not df.empty:
        print("First row:", df.iloc[0].to_dict())
        
except Exception as e:
    print(f"Error: {e}")

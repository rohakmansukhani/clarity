from nselib import capital_market
import pandas as pd

try:
    data = capital_market.price_volume_and_deliverable_position_data(symbol='RELIANCE', period='1D')
    print("Columns:", data.columns.tolist())
    print("Last Row:", data.iloc[-1].to_dict())
except Exception as e:
    print(e)

from nselib import capital_market
import pandas as pd

try:
    print("Fetching NSELib data for SBIN...")
    data = capital_market.price_volume_and_delivery_position_data(symbol='SBIN', period='1D')
    print("Data Received:")
    print(data)
    print("\nTypes:")
    print(data.dtypes)
except Exception as e:
    print(f"Error: {e}")

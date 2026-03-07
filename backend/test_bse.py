from bse import BSE
import os
import json

os.makedirs('bse_data', exist_ok=True)
bse = BSE(download_folder='bse_data')
try:
    securities = bse.listSecurities()
    if isinstance(securities, list):
        print(f"Total securities: {len(securities)}")
        if securities:
            print("First security:", json.dumps(securities[0], indent=2))
        else:
            print("securities type:", type(securities))
except Exception as e:
    print(f"Error listing securities: {e}")

try:
    quote = bse.quote('500325') # Reliance
    print("Reliance quote keys:", quote.keys() if isinstance(quote, dict) else type(quote))
    if isinstance(quote, dict):
         print(json.dumps({k: quote[k] for k in list(quote.keys())[:5]}, indent=2))
except Exception as e:
    print(f"Error getting quote: {e}")
